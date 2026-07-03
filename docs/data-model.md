# Data Model — MatchPoint (draft)

Living document. First-pass entities derived from `docs/product-brief.md`, to be refined during `/speckit-specify` and `/speckit-plan`. Referenced by the `data-model-review` skill and the `backend-architect` agent.

## Core entities

- **User** — a person looking for a sports community. Attributes: sport interests, objective (e.g. train for a race, socialize, compete), location, availability, skill level.
- **Provider** — any entity offering sports activities: club, gym, training center, coach, or event organizer. One Provider can offer multiple Communities.
- **Community** — a specific offering under a Provider (e.g. "Tuesday/Thursday running group", "Beginner swim class"). Has schedule, venue(s), coach(es), level, price/services.
- **Coach** — can belong to one or more Providers/Communities; has profile, specialties, certifications (self-reported at MVP stage).
- **Event** — one-off or recurring activity (race, clinic, open training day) published by a Provider, discoverable independent of ongoing Community membership.
- **Booking** — a User's reservation of a trial class or contact request tied to a Community or Event. Has state (`requested` → `confirmed` → `attended`/`no-show`/`cancelled`).
- **SearchQuery / Match** — not necessarily persisted long-term at MVP: a User's search criteria (sport, location radius, objective, availability, level) scored against Communities/Events/Coaches to produce ranked results.

## Relationships (draft)

```
User        1---N Booking
Provider    1---N Community
Provider    1---N Event
Community   N---N Coach
Community   1---N Booking
Event       1---N Booking
```

## Open questions for /speckit-clarify

- Does a Provider need its own auth/login (self-service listing management) at MVP, or is provider content seeded/managed manually?
- Is "Match" a persisted, explainable ranking (user can see why) or an ephemeral query result at MVP?
- What defines a "trial class" completion — self-reported by User, confirmed by Provider, or both?
- Do Coaches exist as a distinct entity at MVP, or are they just a field on Community until multi-provider coaches become common?
