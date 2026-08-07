// MatchPoint — extract-match-answers Edge Function (010-ai-freetext-sport-match)
//
// FIRST server-side compute in this repo (Constitution Principle V note in plan.md). Turns a
// user's free-text sentence into the same 8-field SportMatchAnswers shape the tap-through
// questionnaire already collects — never a replacement for the matching engine itself
// (ADR-0004, docs/matching-engine.md "Future AI layer").
//
// REQUIRED manual setup before this is useful (see quickstart.md):
//   1. OpenRouter dashboard (openrouter.ai/settings/keys) — set a hard credit limit of $5 on
//      the key used here. This is the authoritative cost backstop (FR-010), not the length cap
//      below, which is only a cheap first line of defense.
//   2. `supabase secrets set OPENROUTER_API_KEY=<key>` — never in client code, never committed.
//   3. `supabase functions deploy extract-match-answers` — anon-callable, no --no-verify-jwt
//      needed (Constitution Principle I: no login before value).

// Closes casual browser-based abuse from a third-party site embedding a fetch() to this
// endpoint (trust-safety-review, 010-ai-freetext-sport-match) — the anon key alone doesn't
// gate this, since it's necessarily public in the client bundle. NOTE: CORS is a browser-only
// mechanism; it does not stop a direct script/curl call (which never sends/enforces Origin) from
// still reaching and billing this endpoint — that's the $5 provider-side spend limit's job, by
// explicit scope decision for this bounded test (spec.md Assumptions).
const ALLOWED_ORIGINS = ["http://localhost:5173", "https://mgsalcedo.github.io"];

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

const ANSWER_KEYS = [
  "goal",
  "sport",
  "district",
  "days",
  "time",
  "level",
  "budget",
  "environment",
] as const;

// Mirrors app/src/data/organizations.ts's DISTRICTS — duplicated deliberately (research.md R4):
// this Deno function has no reliable import path into the Vite app's source tree, and the list
// is small/stable. If DISTRICTS changes, update both (flagged in quickstart.md's checklist).
const KNOWN_DISTRICTS = [
  "San Isidro",
  "Miraflores",
  "Surco",
  "La Molina",
  "San Borja",
  "San Miguel",
  "Barranco",
  "Callao",
];

const MAX_FREE_TEXT_LENGTH = 500;

// Nullable fields use anyOf: [{type, enum}, {type: "null"}] rather than the JSON-Schema-standard
// `type: ["string", "null"]` shorthand — Anthropic's structured-output validator (reached via
// OpenRouter) rejects that shorthand when combined with `enum` ("Enum value 'x' does not match
// declared type '[\"string\", \"null\"]'"), confirmed empirically against the real API. `anyOf`
// is the form it actually accepts.
function nullableEnum(values: string[]) {
  return { anyOf: [{ type: "string", enum: values }, { type: "null" }] };
}

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    goal: nullableEnum([
      "empezar",
      "preparar_carrera",
      "mejorar_rendimiento",
      "mantenerme_activo",
      "bajar_peso",
      "conocer_gente",
      "otro",
    ]),
    sport: nullableEnum(["running", "trail", "ciclismo", "natacion", "triatlon", "centro_entrenamiento"]),
    district: { anyOf: [{ type: "string" }, { type: "null" }] }, // validated against KNOWN_DISTRICTS below, not trusted as-is
    days: {
      anyOf: [
        { type: "array", items: { type: "string", enum: ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] } },
        { type: "null" },
      ],
    },
    time: nullableEnum(["manana", "tarde", "noche"]),
    level: nullableEnum(["nunca_practique", "principiante", "intermedio", "avanzado"]),
    // "no_seguro" is a real, distinct value (the user said they don't know) — separate from
    // `null` (budget wasn't mentioned at all). Collapsing these would fabricate a claim the user
    // never made (BR-016, research.md R3).
    budget: nullableEnum(["gratis", "hasta_100", "100_200", "200_300", "mas_300", "no_seguro"]),
    environment: nullableEnum([
      "competitivo",
      "social",
      "recreativo",
      "familiar",
      "alto_rendimiento",
      "inclusivo",
    ]),
  },
  required: [...ANSWER_KEYS],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Extraes datos estructurados de una frase en español sobre lo que alguien busca en una comunidad deportiva en Lima/Callao, Perú.

Reglas estrictas:
- Solo extrae lo que la persona dijo explícitamente. Si algo no se menciona, usa null — NUNCA adivines ni asumas un valor.
- Para "budget": usa "no_seguro" únicamente si la persona dice explícitamente que no sabe o no está segura de su presupuesto. Si simplemente no menciona el dinero, usa null (no es lo mismo).
- Para "district": extrae el nombre del distrito tal como lo mencionó la persona (o su mejor variante conocida), incluso si no estás segura de que sea exacto — se valida después.
- No extraigas ni menciones nada fuera de los 8 campos definidos (salud, lesiones, u otra información personal se ignoran por completo).
- Responde únicamente con el JSON del schema, nada más.`;

interface ExtractedAnswers {
  goal: string | null;
  sport: string | null;
  district: string | null;
  days: string[] | null;
  time: string | null;
  level: string | null;
  budget: string | null;
  environment: string | null;
}

function corsPreflight(origin: string | null): Response {
  return new Response(null, { headers: corsHeaders(origin) });
}

function jsonResponse(origin: string | null, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function emptyFailure() {
  return { extracted: {}, missing: [...ANSWER_KEYS], ok: false };
}

// Validates the model's raw output against the known-district whitelist and builds the final
// { extracted, missing, ok } shape. Never lets an unvalidated district value through
// (research.md R4) — a non-matching value is treated exactly like "not mentioned."
function buildResult(raw: ExtractedAnswers) {
  const extracted: Record<string, unknown> = {};
  const missing: string[] = [];

  for (const key of ANSWER_KEYS) {
    const value = raw[key];
    if (value === null || value === undefined) {
      missing.push(key);
      continue;
    }
    if (key === "district" && !KNOWN_DISTRICTS.includes(value as string)) {
      missing.push(key); // unvalidated/unknown district — never guessed or auto-corrected
      continue;
    }
    if (key === "days" && Array.isArray(value) && value.length === 0) {
      missing.push(key);
      continue;
    }
    extracted[key] = value;
  }

  return { extracted, missing, ok: true };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return corsPreflight(origin);

  let freeText: unknown;
  try {
    const body = await req.json();
    freeText = body?.freeText;
  } catch {
    return jsonResponse(origin, emptyFailure());
  }

  if (typeof freeText !== "string" || freeText.trim().length === 0 || freeText.length > MAX_FREE_TEXT_LENGTH) {
    return jsonResponse(origin, emptyFailure()); // US3: cheap first-line defense, before any paid call
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    console.error("[extract-match-answers] Missing OPENROUTER_API_KEY secret");
    return jsonResponse(origin, emptyFailure());
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: freeText },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "sport_match_answers", strict: true, schema: EXTRACTION_SCHEMA },
        },
      }),
    });

    if (!response.ok) {
      console.error("[extract-match-answers] OpenRouter call failed", response.status);
      return jsonResponse(origin, emptyFailure());
    }

    const completion = await response.json();
    const choice = completion?.choices?.[0];

    // Anything other than a clean completion is a failure, not a partial success
    // (research.md R2/plan.md's "check stop_reason before trusting content").
    if (!choice || (choice.finish_reason !== "stop" && choice.finish_reason !== "tool_calls")) {
      console.error("[extract-match-answers] Non-clean completion", choice?.finish_reason);
      return jsonResponse(origin, emptyFailure());
    }

    const raw = JSON.parse(choice.message.content) as ExtractedAnswers;
    return jsonResponse(origin, buildResult(raw));
  } catch (err) {
    console.error("[extract-match-answers] Extraction failed", err instanceof Error ? err.message : err);
    return jsonResponse(origin, emptyFailure());
  }
});
