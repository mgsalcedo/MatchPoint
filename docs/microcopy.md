# Microcopy — MatchPoint

Living document (Fase 3 · Diseño, added 2026-07-03). Voice and microcopy for MatchPoint — use this copy when building screens, buttons, errors, empty states, and Match™ guidance. Pairs with `docs/match-character.md` (who is speaking) and `docs/component-library.md` (where it's used).

Tone: **jovial, witty, complicit** — clear, human, motivating, brief, sports-oriented, not robotic, not childish (recalibrated 2026-08, "Nivel 2 — Jovial y directo"; see `docs/match-character.md`'s Personality section for the full boundary — playful about the situation, never at the user's expense).

## Voice principles

- **Speak like a cómplice, not a customer-service script** — MatchPoint should sound like a friend who's genuinely good at this and enjoys helping you take the next step.
- **Be brief** — users are on mobile; keep copy short. Jovial doesn't mean wordier — a sharp, short line lands better than a long one trying hard to be funny.
- **Be encouraging** — the user may feel uncertain; reduce fear. Humor is a tool for warmth, not a replacement for it.
- **Be specific** — explain why a match is relevant.
- **Never punch down** — jokes land on the situation (waiting, a glitchy connection, an empty result), never on the user's level, choices, or the fact that they needed to ask. A beginner's "Nunca practiqué" gets the same respect as anyone else's answer.
- **Avoid jargon** — do not use internal terms like "lead", "provider", "listing", or "query" in anything the user reads (these terms remain correct and expected in internal/technical docs like `docs/data-model.md` and `docs/business-rules.md` — this rule is about user-facing copy only).

## Welcome copy

**Recommended for PMV** ("Option A", recalibrated 2026-08 — Nivel 2):

> Hola, soy Match™, tu cómplice deportivo.
> Te ayudo a encontrar una comunidad que encaje contigo.
> Toma menos de un minuto, lo prometo.

CTA: "Comenzar Sport Match™"

Alternative ("Option B", not used for PMV): "Encuentra dónde entrenar, con quién hacerlo y por qué ese lugar puede ser para ti." / CTA "Encontrar mi Match".

## Sport Match™ questions

- **Goal** — "¿Qué quieres lograr?" (helper: "Arranquemos por tu objetivo — el deporte viene después.") Options: Empezar un deporte, Preparar una carrera, Mejorar rendimiento, Mantenerme activo, Bajar de peso, Conocer gente, Otro.
- **Sport** — "¿Qué deporte te interesa?" (helper: "El que se te venga primero a la mente — confía en tu instinto.") Options: Running, Trail, Ciclismo, Natación, Triatlón, Centro de entrenamiento.
- **District** — "¿Dónde te gustaría entrenar?" (helper: "Cerca de casa, del trabajo, o donde se te haga más fácil llegar.")
- **Days** — "¿Qué días puedes entrenar?" (helper: "Puedes marcar más de uno — entre más, mejor combo te armo.")
- **Time** — "¿En qué horario prefieres entrenar?" (helper: "Mañana, tarde o noche — tú mandas.") Options: Mañana, Tarde, Noche.
- **Level** — "¿Cuál es tu nivel?" Options: Nunca practiqué, Principiante, Intermedio, Avanzado. (helper: "Acá no hay respuesta incorrecta — esto es para cuidarte, no para juzgarte.")
- **Budget** — "¿Cuánto quieres invertir al mes?" (helper: "Sin sorpresas después — dinos tu rango real.") Options: Gratis, Hasta S/100, S/100-S/200, S/200-S/300, Más de S/300, No estoy seguro.
- **Environment** — "¿Qué ambiente buscas?" (helper: "El ambiente pesa tanto como el entrenamiento mismo.") Options: Competitivo, Social, Recreativo, Familiar, Alto rendimiento, Inclusivo.

Helper text implementation note (`008-jovial-tone`, research.md R1): documented since this doc's creation but never rendered in the app until this feature — plain paragraph under each question title, reusing existing typography, no new component.

## Free-text Sport Match™ entry (`010-ai-freetext-sport-match`)

Toggle link, shown only above the Goal question: "Prefiero describirlo con mis palabras."

Free-text screen: Title "Cuéntame qué buscas, con tus palabras." Body: "Menciona lo que puedas: deporte, distrito, días, horario, nivel, presupuesto, ambiente. Lo que falte, te lo pregunto después." Placeholder: "Ej: Trabajo hasta las 7, vivo en Magdalena, quiero preparar mi primera media maratón y conocer gente." CTA: "Continuar" (shows "Buscando..." while the extraction call is in flight). Secondary link back to the tap-through: "Prefiero elegir de las opciones."

Extraction-failed fallback (nothing usable extracted, or the call fails — never shown for a merely-partial extraction, which routes silently to the next question instead): "No logré entender bien tu mensaje — vamos paso a paso, como siempre." Stays literal/reassuring per the same never-blame register as other error states (`docs/match-character.md`) — this is Match™ not understanding, never the user having done something wrong.

## Sport Match™ guide lines (Match™'s own voice above each question, `GUIDE_MICROCOPY`)

1. Goal — "Arranquemos por lo importante: ¿qué quieres lograr?"
2. Sport — "Ahora sí, hablemos de deporte. ¿Cuál tienes en mente?"
3. District — "Ubiquémonos. ¿Por dónde te queda bien entrenar?"
4. Days — "El horario también cuenta. ¿Qué días te sirven?"
5. Time — "Ya casi. Solo falta el horario."
6. Level — "Acá no hay respuesta incorrecta — esto es para cuidarte, no para juzgarte."
7. Budget — "Hablemos de presupuesto, sin sorpresas."
8. Environment — "Última pregunta, lo prometo — y es una importante."

Distinct from the per-question helper text above: the guide line is Match™ speaking (above the title, one per step of the flow); the helper is a short practical note about the question itself (below the title). Both changed in `008-jovial-tone`; question titles themselves stay neutral/scannable — the voice lives around them, not in them.

## Loading copy

Primary: "Estoy cruzando tu objetivo, horario y ubicación para armarte un buen combo..."

Alternatives: "Ya casi tengo tus mejores opciones...", "Buscando dónde vas a querer volver...", "Dame un segundo, esto lo hago con cariño..."

## Results copy

Headline: "Tu Match está listo." Subheadline: "Estas comunidades tienen pinta de encajar contigo." Alternative: "Encontré opciones que podrían ser tu próximo lugar favorito."

Persistent secondary action (`006-no-empty-results`, always visible regardless of match quality): "Cambiar mis respuestas."

## Match labels

Excelente Match, Muy buen Match, Buen Match, Match posible, Baja compatibilidad. (Enum mapping in `docs/component-library.md`'s `MatchLabel`.)

## Match explanation copy

Lead-in: "Te la recomendamos porque:"

Reasons pool: "Entrena cerca de ti.", "Coincide con tus horarios.", "Acepta principiantes con los brazos abiertos.", "Tiene un ambiente social.", "Está alineada con tu objetivo.", "Tiene sesiones para tu nivel.", "Ofrece clase de prueba.", "Tiene un enfoque de alto rendimiento.", "Es ideal para empezar.", "Tiene entrenamientos grupales.", "Ofrece {deporte}." (fallback-only, `006-no-empty-results` — used when no other dimension produced a reason, so a sport-matching community is never shown with zero explanation; kept literal/neutral even in Nivel 2 — it's the one honest thing there is to say, not a place for a joke).

Avoid: "Algorithm score.", "This provider matches your query.", "Ranked result."

## Result card CTA

Primary: "Ver comunidad" (recommended). Alternatives: "Conocer más", "Ver mi Match".

## Community profile copy

Match section: "¿Por qué es un buen Match?" · Schedule: "Horarios de entrenamiento" · Location: "Dónde entrenan" · ADN: "ADN Deportivo™" · Coach: "Coach / Entrenador" · Services: "También ofrecen" · Contact: "¿Te interesa esta comunidad?" (CTA: "Contactar")

## Contact copy

Before login — title: "Continúa para contactar."; body: "Así guardamos tu Match y no perdemos el hilo de lo que encontraste."; button: "Continuar con Google" (Apple deferred, `004-auth-lead-creation` research.md R1).

After Lead creation: "Te llevamos al canal de contacto."

By channel: "Contactar por WhatsApp" · "Contactar por Instagram" · "Reservar clase"

## Empty states

- **No communities for this sport** (`006-no-empty-results` — the only remaining true empty state; "weak-but-real matches" is no longer one, see `docs/matching-engine.md`'s No-match case) — "Todavía no tenemos comunidades de este deporte." / "No es algo que puedas resolver cambiando tus otras respuestas — elige otro deporte y sigo buscando." Action: "Elegir otro deporte" (returns to the sport question specifically, keeping other answers). Kept straightforward, not jokey — this is the one moment the product is genuinely coming up short; a joke here would read as dismissive, not jovial.
- **No contact** — "Esta comunidad todavía no tiene un canal de contacto confirmado."
- **No schedule** — "Horario por confirmar."
- **No price** — "Precio no confirmado."
- **Organization not found / stale link** (`008-jovial-tone` — found live in code, undocumented until now) — "Uy, esta comunidad no está disponible o todavía la estamos revisando."
- **Organization became unavailable between click and login** (`008-jovial-tone`) — heading "Uy, esta comunidad ya no está disponible." / body "Ya iniciaste sesión — volvamos a tus resultados y elegimos otra." Action: "Volver a resultados".

## Error states

Errors are the other place jovial stays light-touch, never at the user's expense — the goal is "no es para tanto," not a bit.

Generic: "Algo no salió bien. Lo intentamos de nuevo." · Match error: "No pude armar tu Match justo ahora. Dale, otra vez." · Login error: "No pudimos iniciar sesión. Probemos de nuevo." · Contact error: "No pudimos abrir el canal de contacto. Inténtalo una vez más." · Network: "Se nos fue el internet a caminar. Revisa tu conexión y seguimos."

Lead-save failure (`008-jovial-tone`, found live in code as two near-duplicate strings — `OrganizationProfile.tsx`'s inline message and `AuthCallback.tsx`'s post-login version — now unified to the same wording): heading/inline "No se guardó tu contacto." · body (post-login variant, where a session already exists) "Ya iniciaste sesión bien — solo falló el último paso. Dale, otra vez." · action "Reintentar".

Post-login, no pending contact found (`AuthCallback.tsx` fallback — user landed on the callback route without an active contact attempt): "Ya estás dentro." Action: "Ir al inicio".

## Success states

Lead created: "Listo. Ya puedes escribirles." · Match completed: "Encontré opciones con pinta de encajar contigo." · Profile claim submitted: "Recibimos tu solicitud. La revisamos y te avisamos pronto."

## Follow-up copy (future — 24-hour check)

"Hola, soy Match™. ¿Encontraste tu lugar para entrenar?" Options: Sí / Todavía no. If yes: "¡Qué bueno! Me alegra haber sido parte de eso." If no: "No hay drama. Sigamos buscando tu combo."

## Organization claim copy (V1.1, not PMV)

Title: "¿Esta comunidad es tuya?" Body: "Reclama el perfil para actualizar horarios, fotos, servicios y canales de contacto." CTA: "Reclamar perfil"

## Words to use

Comunidad, Match, Entrenar, Objetivo, Ambiente, Coach, Clase de prueba, Horario, Cerca de ti, Encaja contigo, Descubrir, Empezar. Nivel 2 additions: Cómplice, Combo, Pinta (de buen match), Dale, Sin drama.

## Words to avoid (user-facing only)

Provider, Vendor, Listing, Lead, Conversion, Query, Database, Marketplace, Algorithm, Supplier. These stay correct in internal/technical docs (`docs/data-model.md`, `docs/database-schema.md`, `docs/business-rules.md`, `docs/api-contracts.md`) — this list is about what the user reads, not what the codebase or docs are named.

## Final microcopy rule

Every word should reduce uncertainty and move the user closer to contact. If the copy does not help the user feel understood, informed, or ready to act, simplify it.
