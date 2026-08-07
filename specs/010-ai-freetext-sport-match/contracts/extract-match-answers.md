# Contract: `extract-match-answers` Edge Function

New Supabase Edge Function — the first server-side endpoint in MatchPoint. Documented here (not `docs/api-contracts.md`) per `005`'s precedent of keeping feature-specific new interfaces in the feature's own `contracts/`, folded into `docs/api-contracts.md` only if/when this graduates beyond a bounded test.

## Client-facing interface

`app/src/lib/data/matchExtraction.ts` exposes:

```ts
extractMatchAnswers(freeText: string): Promise<ExtractionResult>

interface ExtractionResult {
  extracted: Partial<SportMatchAnswers>;
  missing: (keyof SportMatchAnswers)[];
  ok: boolean; // false on any failure — client must fall back to the tap-through questionnaire
}
```

Never throws — mirrors the fire-and-forget-safe contract style of `analytics-event.md`'s `track()`, except this one has a result the caller acts on. Any Edge Function error, timeout, or invalid response resolves to `{ extracted: {}, missing: [...all 8 keys], ok: false }` rather than rejecting, so the caller always has a single, simple branch: `ok` → merge and continue; not `ok` → tap-through from the top.

## Edge Function request/response

**Request** (`POST` via `supabase.functions.invoke`):

```json
{ "freeText": "Trabajo hasta las 7, vivo en Magdalena, quiero preparar mi primera media maratón" }
```

**Response** (200, always — errors are represented in-body per the `ok` contract above, not via HTTP status, so the client doesn't need special-case error branching):

```json
{
  "extracted": {
    "goal": "preparar_carrera",
    "sport": "running",
    "district": "Magdalena del Mar",
    "time": "noche"
  },
  "missing": ["days", "level", "budget", "environment"],
  "ok": true
}
```

## Server-side steps (inside the Edge Function)

1. Read `freeText` from the request body; reject (return `ok: false`) if empty or over a generous length cap (e.g. 500 chars — prevents abuse via huge payloads inflating token cost).
2. Call OpenRouter's chat completions endpoint (`https://openrouter.ai/api/v1/chat/completions`, model `anthropic/claude-haiku-4.5`, research.md R2) with a structured-output request constrained to a JSON schema mirroring `SportMatchAnswers`, all fields nullable, `budget` allowing the literal `"no_seguro"` as a distinct valid value from `null` (research.md R3).
3. Check `stop_reason` — anything other than a clean completion is treated as failure, not partial success.
4. Validate `district` against the literal `DISTRICTS` list (research.md R4); non-matching values become `null` for that field.
5. Build `missing` from whichever of the 8 keys came back `null`.
6. Return `{ extracted, missing, ok: true }` — dropping any extra field the model might have emitted outside the 8 whitelisted keys.

## Auth

Callable by the `anon` role (Supabase's default JWT verification via the client's anon key) — no forced login, per Constitution Principle I. No RLS involved (this endpoint touches no table).

## Cost/abuse guardrails

- `OPENROUTER_API_KEY` carries a hard $5 usage/credit limit configured in the OpenRouter dashboard (FR-010) — the authoritative backstop, external to this code.
- Request body length cap (step 1 above) as a cheap first line of defense against pathological inputs inflating per-call token cost.
- No additional per-IP/per-user rate limiting for this initial bounded test (spec.md Assumptions) — an explicit, documented scope decision, not an oversight; revisit before any wider rollout.

## Rules

- Never persist `freeText` anywhere (data-model.md).
- Never return any field outside the 8-key `SportMatchAnswers` shape, even if present in the model's raw output.
- `ok: false` is the only failure signal the client needs — no distinct error codes/taxonomy for this bounded test.
