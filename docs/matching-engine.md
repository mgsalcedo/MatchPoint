# Matching Engine — MatchPoint

Living document. Defines the logic behind Sport Match™ and ADN Deportivo™. Use this document when implementing the Sport Match™ questionnaire, match scoring, results ranking, match explanations, organization profile data fields, or lead tracking context. Referenced by the `geo-matching-review` skill and the `backend-architect` agent — see the reconciliation note in `docs/data-model.md` before implementing entities from this doc.

The PMV uses a Wizard of Oz approach: the recommendation experience feels smart, but the initial implementation can use rules, weights, curated data, and AI-generated explanation text.

## Purpose

The Matching Engine answers: "Which sports communities are most compatible with this user right now?" The goal is not to find the objectively "best" team, gym, coach, or organization — it's to find the best fit for a specific person based on their goal, sport, location, schedule, level, budget, preferred environment, and training expectations.

## Core concepts

- **Sport Match™** — the guided user flow that collects preferences and generates recommendations.
- **ADN Deportivo™** — the structured representation of a sports organization's identity, culture, and fit characteristics.
- **Match Score** — a compatibility score between a user and an organization.
- **Match Explanation** — a human-readable explanation of why an organization was recommended.
- **Contact** — the outcome that validates the match.

## Matching philosophy

The engine should prioritize fit over popularity. A popular community is not necessarily right for a beginner. An expensive training center is not necessarily right for someone looking for social running. A competitive team is not necessarily right for someone returning to sports after years. The matching engine should help the user avoid bad first experiences.

## V1 matching inputs

Sport Match™ should collect the minimum viable set of inputs.

Required: goal, sport, district or preferred location, available days, preferred time of day, level, budget, preferred environment.

Optional/future: gender preference, age range, injury history, race date, target distance, preferred coach style, social preference, distance radius, need for parking, need for showers, need for trial class, training frequency.

## Sport Match™ questionnaire

This is the canonical list of questions/options — `docs/ux-flows.md` (screen/validation rules), `docs/microcopy.md` (exact copy/helper text), and `docs/functional-requirements.md` (FR-005…FR-012) each restate it for their own audience. If a question or its options change, update here first, then propagate to those three.

1. **Goal** — "¿Qué quieres lograr?" → Empezar un deporte / Preparar una carrera / Mejorar rendimiento / Mantenerme activo / Bajar de peso / Conocer gente / Otro.
2. **Sport** — "¿Qué deporte te interesa?" → Running / Trail / Ciclismo / Natación / Triatlón / Centro de entrenamiento.
3. **District** — "¿Dónde te gustaría entrenar?" → searchable district selector, Lima and Callao.
4. **Days** — "¿Qué días puedes entrenar?" → multi-select weekdays.
5. **Time** — "¿En qué horario prefieres entrenar?" → Mañana / Tarde / Noche.
6. **Level** — "¿Cuál es tu nivel?" → Nunca practiqué / Principiante / Intermedio / Avanzado.
7. **Budget** — "¿Cuánto quieres invertir al mes?" → Gratis / Hasta S/100 / S/100-S/200 / S/200-S/300 / Más de S/300 / No estoy seguro.
8. **Environment** — "¿Qué ambiente buscas?" → Competitivo / Social / Recreativo / Familiar / Alto rendimiento / Inclusivo.

## Organization ADN Deportivo™ (attribute schema)

- **Basic identity** — name, organization type, sports, description, logo, photos, Instagram, WhatsApp, website.
- **Location** — districts, venues, address, map coordinates, meeting points.
- **Schedule** — days, start time, end time, session type, level per session.
- **Commercial** — price range, trial class, free sessions, membership model, payment method.
- **Community profile** — beginner friendliness, competitiveness, social atmosphere, training intensity, group size, age range, gender mix, coach involvement, event frequency.
- **Services** — strength training, nutrition, physiotherapy, recovery, race planning, technique clinics, performance testing.
- **Trust** — claimed profile, verified profile, verified coach, last updated date, external links, certifications.

## Match score V1

Weighted scoring model:

| Variable | Weight |
|---|---:|
| Goal fit | 25% |
| Sport fit | 20% |
| Schedule fit | 15% |
| Location fit | 15% |
| Level fit | 10% |
| Environment fit | 10% |
| Budget fit | 5% |

```pseudo
function calculateMatch(user, organization):
    score = 0
    score += goalFit(user.goal, organization.adn) * 0.25
    score += sportFit(user.sport, organization.sports) * 0.20
    score += scheduleFit(user.days, user.time, organization.schedules) * 0.15
    score += locationFit(user.district, organization.districts) * 0.15
    score += levelFit(user.level, organization.levels) * 0.10
    score += environmentFit(user.environment, organization.adn) * 0.10
    score += budgetFit(user.budget, organization.priceRange) * 0.05
    return round(score * 100)
```

Each fit function returns a value between 0 and 1. Centralize this logic in one module per `docs/base-standards.md` — never reimplement scoring rules per endpoint.

### Variable definitions

- **Goal fit** — is the organization appropriate for the user's desired outcome (e.g. prepare race → structured training + coaches + race experience; meet people → social/community-oriented groups; lose weight → training centers/functional classes/beginner-friendly; improve performance → advanced teams/certified coaches; start a sport → beginner-friendly + trial class).
- **Sport fit** — does the organization offer the selected sport; exact match scores highest, related sports may score partially in future versions.
- **Schedule fit** — overlap between user availability and organization sessions (high: same day + time period; medium: partial overlap; low: none).
- **Location fit** — V1 uses district matching (high: same/nearby district, medium: adjacent, low: far); future versions use distance radius.
- **Level fit** — does the community accept and support the user's level; a beginner should not be matched first with an advanced-only group.
- **Environment fit** — preferred environment vs. community personality (social↔social, competitive↔high-performance, recreational↔casual, inclusive↔explicitly inclusive).
- **Budget fit** — does the organization price range fit the user budget; if price unknown, do not overly penalize in V1, mark as "price not confirmed".

## Match labels

Do not show raw percentages as the main message in PMV — use human labels.

| Score | Label |
|---:|---|
| 85-100 | Excellent Match |
| 70-84 | Very Good Match |
| 55-69 | Good Match |
| 40-54 | Possible Match |
| 0-39 | Weak Match |

Show top 5 results. Avoid showing weak matches unless no alternatives exist.

## Result ranking

Rank by: (1) match score, (2) number of strong explanation reasons, (3) profile completeness, (4) claimed/verified status, (5) recency of profile update, (6) availability of contact method. Do not rank by payment in PMV — future monetization can include promoted placements, but user trust must be protected.

## Match explanation

Each result should include 3-5 reasons, generated from actual data — never fabricated. If a data point is missing, do not mention it.

Templates:

- Location — "Trains in or near your preferred district." / "Has sessions close to where you want to train."
- Schedule — "Matches your preferred training time." / "Has sessions on the days you selected."
- Level — "Accepts beginners." / "Has intermediate groups." / "Offers advanced training."
- Goal — "Helps people prepare for races." / "Good option if you want to start a sport." / "Aligned with your goal of improving performance."
- Environment — "Has a social atmosphere." / "Strong fit for a competitive environment." / "Ideal for recreational training."
- Budget — "Fits your monthly budget." / "Offers a free or trial class." / "Pricing is within your selected range."

## No-match case

Never show an empty dead-end state. If there are no strong matches: "No encontré un match perfecto todavía, pero estas son las opciones más cercanas." Then offer: expand district, change schedule, include nearby sports, notify me when new communities appear.

## Missing data rules

- Missing data should reduce confidence, not automatically exclude.
- Missing sport → exclude from sport-specific matching.
- Missing schedule → lower ranking.
- Missing contact info → do not show contact CTA.
- Missing district → exclude from location-based recommendations.
- Missing price → mark as "price not confirmed".

## Profile completeness score

| Field | Points |
|---|---:|
| Name | Required |
| Sport | Required |
| District | Required |
| Contact method | Required |
| Schedule | 20 |
| Photos | 10 |
| Description | 10 |
| Coach | 10 |
| Price | 10 |
| Environment attributes | 20 |
| Services | 10 |
| Trial class info | 10 |

Completeness should influence ranking slightly.

## Future AI layer

Future versions can support natural language input, e.g. "Trabajo hasta las 7, vivo en Magdalena, quiero preparar mi primera media maratón y conocer gente" — extracted into schedule/district/goal/environment/sport/level, then run through the same matching engine. AI should augment the matching engine, not replace structured data.

## Learning loop

After contact: "¿Sentiste que fue un buen match?" (Yes / Not really / I did not attend yet). Future learning signals: contact created, booking completed, attendance confirmed, user feedback, organization response, repeat contact, saved community, joined community. These signals can improve future ranking.

## Edge cases

- User selects low budget and all organizations are paid → show closest options, label price clearly.
- User selects beginner and only advanced groups exist → warn "These communities may be more advanced than your current level."
- User wants to meet people but selects an individual coach → rank group communities higher unless the coach offers group sessions.
- Organization has no schedule → lower ranking, prompt organization to complete profile.
- User selects Callao and few results exist → allow nearby Lima districts.
- Multiple top results tie → prioritize verified, claimed, more complete, recently updated profiles.

## Data needed before launch

Minimum viable dataset per organization: name, sport, district, contact method, schedule, level, environment tag, price (or price unknown), short description.

Recommended launch data quality: ≥80% of organizations have schedule + contact method; ≥60% have environment tags; ≥50% have photos.

## PMV match output format

Each result includes: organization name, sport, district, match label, 3 reasons, main photo or logo, key schedule, contact CTA, "Ver comunidad" CTA.

## Final matching principle

A technically simple match that users trust is better than a complex algorithm users do not understand. Trust comes from relevant results, clear reasons, honest data, fast contact. That is the V1 standard.
