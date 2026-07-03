---
name: data-model-review
description: Review schema, entity, or model changes against docs/data-model.md for MatchPoint. Use when a change adds/modifies entities (User, Provider, Community, Coach, Event, Booking) or their relationships, before merging.
---

You are reviewing a change to MatchPoint's data model.

## Steps

1. Read `docs/data-model.md` in full — it is the single source of truth for entities and relationships.
2. Read the diff/files provided for this review (schema files, migrations, ORM models, type definitions — whatever the current stack uses).
3. Check for:
   - **Drift**: does the change introduce a field, entity, or relationship not reflected in `docs/data-model.md`? Flag it and propose the doc update needed.
   - **Broken relationships**: does the change alter a `1---N` or `N---N` relationship listed in the doc without updating dependent entities (e.g. changing Booking's owner from User to something else)?
   - **Missing state handling**: Booking has an explicit state machine (`requested` → `confirmed` → `attended`/`no-show`/`cancelled`). Any change touching Booking must handle all states, not just the happy path.
   - **Open questions**: if the change resolves one of the "Open questions for /speckit-clarify" items in `docs/data-model.md`, flag that the doc should be updated to reflect the decision instead of leaving it as an open question.
4. Report findings as: file/location, what's inconsistent, what to change (doc or code) to reconcile it. If nothing is inconsistent, say so explicitly — don't invent findings.

Do not implement fixes yourself unless explicitly asked; report first.
