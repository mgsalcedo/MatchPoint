---
name: data-model-review
description: Review schema, entity, or model changes against docs/data-model.md and docs/database-schema.md for MatchPoint. Use when a change adds/modifies entities (User, Sport, District, Organization, OrganizationSport, Venue, Schedule, Coach, OrganizationADN, Event, MatchSession, MatchResult, Lead, ProfileClaim) or their relationships, before merging.
---

You are reviewing a change to MatchPoint's data model.

## Steps

1. Read `docs/data-model.md` (conceptual source of truth) and `docs/database-schema.md` (physical schema — must stay in sync with it) in full.
2. Read the diff/files provided for this review (schema files, migrations, ORM models, type definitions — whatever the current stack uses).
3. Check for:
   - **Drift**: does the change introduce a field, entity, or relationship not reflected in `docs/data-model.md`/`docs/database-schema.md`? Flag it and propose the doc update needed.
   - **Broken relationships**: does the change alter a `1---N` relationship listed in the doc without updating dependent entities (e.g. changing Lead's owner from User to something else, or Organization's `schedules`/`venues` shape in a way that breaks `scheduleFit()` in the matching engine)?
   - **Lead immutability**: `leads` is append-only at PMV, by deliberate decision reaffirmed 2026-07-03 (an imported engineering pack proposed a `status` enum + `external_url_opened` mutable column; both were rejected — see `docs/data-model.md`'s divergence note). Flag ANY change that adds a mutable column, an UPDATE path, or a status/lifecycle field to `leads` as reopening that decision — it needs explicit sign-off, not a routine schema tweak. If a change does introduce Booking (V2) instead, it must handle the full `requested` → `confirmed` → `attended`/`no-show`/`cancelled` state machine, not just the happy path.
   - **Open questions**: if the change resolves one of the "Open questions for /speckit-clarify" items in `docs/data-model.md`, flag that the doc should be updated to reflect the decision instead of leaving it as an open question.
4. Report findings as: file/location, what's inconsistent, what to change (doc or code) to reconcile it. If nothing is inconsistent, say so explicitly — don't invent findings.

Do not implement fixes yourself unless explicitly asked; report first.
