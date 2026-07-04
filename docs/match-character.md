# Match™ Character Guide — MatchPoint

Living document (Fase 3 · Diseño, added 2026-07-03). Defines Match™, the digital guide for MatchPoint — use this when writing UI copy, guided flow text, assistant messages, loading states, and onboarding. Pairs with `docs/microcopy.md` (the actual strings) and `docs/vision.md`'s "Match™" section (product-level framing).

Match™ is not a full chatbot in PMV — it's a lightweight product guide.

## Who is Match™?

Match™ is the digital guide that helps users find a sports community that fits them: a coach-like guide, a friendly advisor, a motivator, a translator between user needs and sports communities, a confidence builder.

Match™ is **not**: a mascot for children, a robot, a generic AI assistant, a full conversational chatbot in PMV, a fitness influencer, a medical advisor.

## Role in product

Match™ appears in: welcome screen, Sport Match™ flow, loading state, results explanation, contact gate, follow-up. Match™ makes the product feel guided and human.

## Personality

Should sound: clear, practical, brief, warm, motivating, energetic, human, supportive.

Should not sound: robotic, overly enthusiastic, childish, pushy, salesy, technical, judgmental.

## Voice examples

**Good**: "Perfecto. Ahora veamos dónde te gustaría entrenar." · "Ya casi termino. Estoy buscando opciones que realmente encajen contigo." · "Te recomiendo esta comunidad porque coincide con tu objetivo, horario y nivel." · "No hay problema. Probemos con opciones cercanas."

**Bad**: "Processing user input." · "Your query has returned 5 providers." · "You must register to continue." · "This is the optimal algorithmic result."

## Match™ across the flow

- **First screen** — "Hola, soy Match™. Te ayudo a encontrar una comunidad deportiva que encaje contigo. Tomará menos de un minuto." CTA: "Comenzar Sport Match™"
- **Goal question** — "Primero dime qué quieres lograr."
- **Sport question** — "Perfecto. Ahora elijamos el deporte que más se acerca a eso."
- **District question** — "Busquemos algo que te quede bien."
- **Days question** — "El horario también importa. ¿Qué días puedes entrenar?"
- **Level question** — "No hay respuesta incorrecta. Esto nos ayuda a cuidar mejor tu Match."
- **Environment question** — "El ambiente importa tanto como el entrenamiento."
- **Loading** — "Estoy buscando comunidades que realmente encajen contigo..." (alternatives: "Cruzando tu objetivo, horario y ubicación...", "Ya casi tengo tus mejores opciones...")
- **Results** — "Encontré comunidades que podrían ser un gran match para ti." / "Te recomiendo estas opciones porque coinciden con lo que estás buscando."
- **Before contact** — "Para contactar con esta comunidad, continúa con Google o Apple. Así podremos guardar tu Match."
- **Follow-up** — "Hola, soy Match™. ¿Pudiste encontrar una comunidad para entrenar?" If yes: "¡Qué buena noticia! Me alegra que hayas dado el primer paso." If no: "No hay problema. Probemos con nuevas opciones."

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
