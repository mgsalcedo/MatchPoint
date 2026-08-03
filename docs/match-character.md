# Match™ Character Guide — MatchPoint

Living document (Fase 3 · Diseño, added 2026-07-03). Defines Match™, the digital guide for MatchPoint — use this when writing UI copy, guided flow text, assistant messages, loading states, and onboarding. Pairs with `docs/microcopy.md` (the actual strings) and `docs/vision.md`'s "Match™" section (product-level framing).

Match™ is not a full chatbot in PMV — it's a lightweight product guide.

## Who is Match™?

Match™ is the digital guide that helps users find a sports community that fits them: a coach-like guide, a friendly advisor, a motivator, a translator between user needs and sports communities, a confidence builder.

Match™ is **not**: a mascot for children, a robot, a generic AI assistant, a full conversational chatbot in PMV, a fitness influencer, a medical advisor.

## Role in product

Match™ appears in: welcome screen, Sport Match™ flow, loading state, results explanation, contact gate, follow-up. Match™ makes the product feel guided and human.

## Personality

**Recalibrated 2026-08 ("Nivel 2 — Jovial y directo", product decision after reviewing 3 calibrated intensity options against real app copy)**: Match™ keeps every trait it already had — clear, practical, brief, warm, motivating, supportive — and turns up energy and personality on top of that base, not instead of it. Think: the friend who's genuinely good at this and enjoys helping, not a hype-man and not a customer-service script.

Should sound: clear, practical, brief, warm, motivating, **jovial, witty, like a cómplice (a friend who's in on it with you)**, human, supportive, confidently informal (natural Peruvian everyday Spanish, not slang-for-slang's-sake).

Should not sound: robotic, overly enthusiastic (exclamation-point spam, forced hype), childish, pushy, salesy, technical, judgmental, **sarcastic at the user's expense, mocking of a user's level or choices, try-hard**.

**The line that matters most**: jovial is a *tone*, never a *target*. Match™ can be playful about the situation (searching, waiting, an app hiccup) — it is never playful *at the user*. A beginner picking "Nunca practiqué" gets the same warmth as an advanced athlete; a network error gets a light touch, not the user's mistake being the joke. This is the same boundary Rules #1/#2 below already drew — recalibrating tone doesn't touch it.

## Voice examples

**Good** (post-recalibration): "¡Qué tal! Soy Match™, tu cómplice para encontrar dónde entrenar." · "Ya casi termino — estoy cruzando tus datos para encontrar tu combo ideal." · "Te recomiendo esta comunidad porque coincide con tu objetivo, horario y nivel — no es magia, es matemática con buen gusto." · "No hay drama. Probemos con opciones cercanas."

**Still bad** (unchanged — jovial doesn't mean any of this becomes okay): "Processing user input." · "Your query has returned 5 providers." · "You must register to continue." · "This is the optimal algorithmic result." · ~~"Jaja, ¿en serio nunca has practicado nada?"~~ (mocks the user) · ~~"¡¡¡Encontré tu match perfecto!!!"~~ (overly enthusiastic, also violates Rule #5 — never claims a perfect result) · ~~"Otra vez sin internet, típico."~~ (blames/mocks the user for an error)

## Match™ across the flow

Rewritten for the Nivel 2 recalibration — see `docs/microcopy.md` for the authoritative, complete copy (this section stays illustrative, not exhaustive, per this doc's own original scope).

- **First screen** — "Hola, soy Match™, tu cómplice deportivo. Te ayudo a encontrar una comunidad que encaje contigo — toma menos de un minuto, lo prometo." CTA: "Comenzar Sport Match™"
- **Goal question** — "Arranquemos por lo importante: ¿qué quieres lograr?"
- **Sport question** — "Ahora sí, hablemos de deporte. ¿Cuál tienes en mente?"
- **District question** — "Ubiquémonos. ¿Por dónde te queda bien entrenar?"
- **Days question** — "El horario también cuenta. ¿Qué días te sirven?"
- **Level question** — "Acá no hay respuesta incorrecta — esto es para cuidarte, no para juzgarte."
- **Environment question** — "El ambiente pesa tanto como el entrenamiento mismo. ¿Qué buscas?"
- **Loading** — "Estoy cruzando tu objetivo, horario y ubicación para armarte un buen combo..." (alternatives: "Ya casi tengo tus mejores opciones...", "Buscando dónde vas a querer volver...")
- **Results** — "Encontré comunidades que tienen pinta de gran match para ti." / "Estas opciones coinciden con lo que estás buscando — y no es casualidad."
- **Before contact** — "Para contactarlos, continúa con Google. Así guardamos tu Match y no perdemos el hilo."
- **Follow-up** — "Hola, soy Match™. ¿Encontraste tu lugar para entrenar?" If yes: "¡Qué bueno! Me alegra haber sido parte de eso." If no: "No hay drama. Sigamos buscando tu combo."

## Visual representation

Match™ can eventually be represented as a minimal character, a subtle icon, a coach-like avatar, a motion element, or a branded symbol. PMV does not require a full illustrated character.

Recommended PMV approach: use Match™ as voice and small visual cue; avoid delaying development with complex character illustration; add character visuals later if brand direction is clear.

If Match™ becomes a visual character, it should feel sporty, simple, warm, modern, gender-neutral or broadly inclusive, not childish, not overly muscular, not robotic. Avoid: cartoonish mascot, gym bro character, futuristic robot, overly detailed illustration, similarity to existing mascots.

## Match™ rules

1. Match™ never pressures the user.
2. Match™ never shames the user's level.
3. Match™ never invents data.
4. Match™ never gives medical advice.
5. Match™ never claims a perfect result.
6. Match™ explains recommendations clearly.
7. Match™ keeps the user moving forward.
8. Match™ should make the user feel capable.

## PMV implementation

In PMV, Match™ is implemented through welcome text, helper text, loading text, result explanations, empty state copy, contact gate copy. No chatbot required, no generative AI conversation required.

## Future Match™ capabilities

Natural language input, personalized recommendations, training goal guidance, event suggestions, follow-up reminders, saved preferences, AI explanation refinement (see `docs/matching-engine.md`'s "Future AI layer" section).

## Final character rule

Match™ exists to reduce uncertainty. Every Match™ message should help the user feel: "This product understands me and is helping me take the next step."
