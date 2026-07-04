# Microcopy — MatchPoint

Living document (Fase 3 · Diseño, added 2026-07-03). Voice and microcopy for MatchPoint — use this copy when building screens, buttons, errors, empty states, and Match™ guidance. Pairs with `docs/match-character.md` (who is speaking) and `docs/component-library.md` (where it's used).

Tone: clear, human, motivating, brief, sports-oriented, not robotic, not childish.

## Voice principles

- **Speak like a guide** — MatchPoint should sound like someone helping you take the next step.
- **Be brief** — users are on mobile; keep copy short.
- **Be encouraging** — the user may feel uncertain; reduce fear.
- **Be specific** — explain why a match is relevant.
- **Avoid jargon** — do not use internal terms like "lead", "provider", "listing", or "query" in anything the user reads (these terms remain correct and expected in internal/technical docs like `docs/data-model.md` and `docs/business-rules.md` — this rule is about user-facing copy only).

## Welcome copy

**Recommended for PMV** ("Option A"):

> Hola, soy Match™.
> Te ayudo a encontrar una comunidad deportiva que encaje contigo.
> Tomará menos de un minuto.

CTA: "Comenzar Sport Match™"

Alternative ("Option B", not used for PMV): "Encuentra dónde entrenar, con quién hacerlo y por qué ese lugar puede ser para ti." / CTA "Encontrar mi Match".

## Sport Match™ questions

- **Goal** — "¿Qué quieres lograr?" (helper: "Empecemos por tu objetivo. El deporte viene después.") Options: Empezar un deporte, Preparar una carrera, Mejorar rendimiento, Mantenerme activo, Bajar de peso, Conocer gente, Otro.
- **Sport** — "¿Qué deporte te interesa?" (helper: "Elige el deporte que más se acerca a lo que buscas ahora.") Options: Running, Trail, Ciclismo, Natación, Triatlón, Centro de entrenamiento.
- **District** — "¿Dónde te gustaría entrenar?" (helper: "Puede ser cerca de casa, trabajo o donde te quede mejor.")
- **Days** — "¿Qué días puedes entrenar?" (helper: "Puedes elegir más de uno.")
- **Time** — "¿En qué horario prefieres entrenar?" Options: Mañana, Tarde, Noche.
- **Level** — "¿Cuál es tu nivel?" Options: Nunca practiqué, Principiante, Intermedio, Avanzado. (helper: "No hay respuesta incorrecta. Esto nos ayuda a cuidar mejor tu Match.")
- **Budget** — "¿Cuánto quieres invertir al mes?" Options: Gratis, Hasta S/100, S/100-S/200, S/200-S/300, Más de S/300, No estoy seguro.
- **Environment** — "¿Qué ambiente buscas?" (helper: "El ambiente importa tanto como el entrenamiento.") Options: Competitivo, Social, Recreativo, Familiar, Alto rendimiento, Inclusivo.

## Loading copy

Primary: "Estoy buscando comunidades que realmente encajen contigo..."

Alternatives: "Cruzando tu objetivo, horario y ubicación...", "Ya casi tengo tus mejores opciones...", "Buscando un lugar donde puedas empezar bien..."

## Results copy

Headline: "Tu Match está listo." Subheadline: "Estas son las comunidades que más se parecen a lo que buscas." Alternative: "Encontré comunidades que podrían ser un gran match para ti."

## Match labels

Excelente Match, Muy buen Match, Buen Match, Match posible, Baja compatibilidad. (Enum mapping in `docs/component-library.md`'s `MatchLabel`.)

## Match explanation copy

Lead-in: "Te recomendamos esta comunidad porque:"

Reasons pool: "Entrena cerca de ti.", "Coincide con tus horarios.", "Acepta principiantes.", "Tiene un ambiente social.", "Está alineada con tu objetivo.", "Tiene sesiones para tu nivel.", "Ofrece clase de prueba.", "Tiene un enfoque de alto rendimiento.", "Es ideal para empezar.", "Tiene entrenamientos grupales."

Avoid: "Algorithm score.", "This provider matches your query.", "Ranked result."

## Result card CTA

Primary: "Ver comunidad" (recommended). Alternatives: "Conocer más", "Ver mi Match".

## Community profile copy

Match section: "¿Por qué es un buen Match?" · Schedule: "Horarios de entrenamiento" · Location: "Dónde entrenan" · ADN: "ADN Deportivo™" · Coach: "Coach / Entrenador" · Services: "También ofrecen" · Contact: "¿Te interesa esta comunidad?" (CTA: "Contactar")

## Contact copy

Before login — title: "Continúa para contactar."; body: "Así podremos guardar tu Match y ayudarte a medir si encontraste una comunidad para entrenar."; buttons: "Continuar con Google" / "Continuar con Apple".

After Lead creation: "Te estamos llevando al canal de contacto."

By channel: "Contactar por WhatsApp" · "Contactar por Instagram" · "Reservar clase"

## Empty states

- **No match** — "No encontré un match perfecto todavía, pero estas son las opciones más cercanas." Actions: Ampliar distrito, Cambiar horario, Probar otro deporte.
- **No contact** — "Esta comunidad todavía no tiene un canal de contacto confirmado."
- **No schedule** — "Horario por confirmar."
- **No price** — "Precio no confirmado."

## Error states

Generic: "Algo no salió bien. Inténtalo nuevamente." · Match error: "No pude calcular tu Match en este momento. Probemos otra vez." · Login error: "No pudimos iniciar sesión. Inténtalo otra vez." · Contact error: "No pudimos abrir el canal de contacto. Inténtalo nuevamente." · Network: "Parece que no hay conexión. Revisa internet e intenta otra vez."

## Success states

Lead created: "Listo. Ya puedes contactar a esta comunidad." · Match completed: "Encontré opciones que encajan contigo." · Profile claim submitted: "Recibimos tu solicitud. Revisaremos la información y te avisaremos pronto."

## Follow-up copy (future — 24-hour check)

"Hola, soy Match™. ¿Pudiste encontrar una comunidad para entrenar?" Options: Sí / Todavía no. If yes: "¡Qué buena noticia! Espero que hayas encontrado un lugar donde disfrutar el deporte." If no: "No hay problema. Probemos con nuevas opciones."

## Organization claim copy (V1.1, not PMV)

Title: "¿Esta comunidad es tuya?" Body: "Reclama el perfil para actualizar horarios, fotos, servicios y canales de contacto." CTA: "Reclamar perfil"

## Words to use

Comunidad, Match, Entrenar, Objetivo, Ambiente, Coach, Clase de prueba, Horario, Cerca de ti, Encaja contigo, Descubrir, Empezar.

## Words to avoid (user-facing only)

Provider, Vendor, Listing, Lead, Conversion, Query, Database, Marketplace, Algorithm, Supplier. These stay correct in internal/technical docs (`docs/data-model.md`, `docs/database-schema.md`, `docs/business-rules.md`, `docs/api-contracts.md`) — this list is about what the user reads, not what the codebase or docs are named.

## Final microcopy rule

Every word should reduce uncertainty and move the user closer to contact. If the copy does not help the user feel understood, informed, or ready to act, simplify it.
