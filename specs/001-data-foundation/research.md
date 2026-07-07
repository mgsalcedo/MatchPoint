# Research & Decisions: Data Foundation (Phase 0)

Resolves the open questions surfaced by the `backend-architect` plan (`.claude/doc/matchpoint-data-foundation/backend.md` §9) plus the schema/mock gaps (§4.5). Each is decided with a sensible default so `/speckit-tasks` has no unresolved `NEEDS CLARIFICATION`. Notable decisions were surfaced to the product owner in the plan summary; none blocks progress.

## R1 — `organization_type` enum mismatch (DB 13 values vs app 9)

**Decision**: Map DB → app in the mapper via a lookup table, and **extend the app's `OrgType` union additively** with `"federation"` and `"gym"` so no DB value is lost. Mapping: `running_team|trail_team|cycling_club|swimming_academy|triathlon_club → "club"` is rejected as lossy; instead map each `*_team`/`*_club`/`*_academy` to the closest existing value (`running_team → "team"`, `cycling_club|triathlon_club → "club"`, `swimming_academy → "academy"`, `training_center → "training_center"`, `coach_independent → "coach"`, `sports_community → "community"`, `federation → "federation"` [new], `gym → "gym"` [new], `event_organizer|academy|other → "academy"|"other"`).

**Rationale**: additive union extension is lossless and low-risk (touches only `app/src/types.ts` + the mapper; the mock data doesn't use `federation`/`gym`, so nothing breaks). Lossy collapse would silently misrepresent org types once the UI shows real data in Milestone 3.

**Alternatives considered**: (a) lossy collapse into the existing 9 — rejected, loses information. (b) seed only orgs whose type maps cleanly — rejected, artificially constrains the real-data curation.

**Consequence flagged to owner**: `app/src/types.ts` `OrgType` gains two values. This is the one code file outside `supabase/`+`lib/data/` this milestone touches.

## R2 — Should `profile_status = 'rejected'` also be excluded from public reads?

**Decision**: Yes. RLS and the query filter exclude `('suspended', 'archived', 'rejected')`.

**Rationale**: BR-008 names suspended/archived explicitly, but a `rejected` org record was never approved for publication — surfacing it in public discovery contradicts the preload-then-claim model (ADR-0005) and the "no unmoderated public listing" posture (`docs/security-standards.md`). Excluding it is the conservative, safe reading of an ambiguity `docs/data-model.md` doesn't address.

**Alternatives considered**: include `rejected` (only exclude the two named states) — rejected as a likely trust-safety hole.

**Doc follow-up**: propose adding `rejected` to BR-008's exclusion list in `docs/business-rules.md` during `/speckit-analyze` (sync), so the rule and the code agree.

## R3 — `day_of_week` integer convention

**Decision**: `day_of_week = 1` means **Monday** (ISO 8601, 1=Mon … 7=Sun). The mapper's `DAY_OF_WEEK_MAP` and the seed both follow this; a fixture unit test pins it.

**Rationale**: ISO 8601 is the unambiguous standard; `docs/database-schema.md` uses `check (day_of_week between 1 and 7)` without stating the anchor, so we fix it here. An off-by-one silently breaks every `scheduleFit` calc in `matching.ts` once Milestone 3 wires it — hence the pinning test.

## R4 — Test runner

**Decision**: **Vitest** — add `vitest` devDependency and a `"test": "vitest run"` script to `app/package.json`.

**Rationale**: the app has no test framework today; Principle III (test-first for the mapper) requires one. Vitest is the Vite-native choice (reuses `vite.config.ts`, TS-first, zero extra toolchain). Nothing in the constitution or CLAUDE.md names a runner yet, so this is a net-new tooling decision — chosen as the obvious default, not assumed silently.

**Alternatives considered**: Jest — rejected (extra config, slower with Vite/ESM). Node's built-in test runner — rejected (weaker TS/DX for a React project).

**Doc follow-up**: add a one-line "Testing: Vitest" note to CLAUDE.md's Recommended stack during sync, so it isn't re-litigated per feature.

## R5 — Schema/mock field gaps (price, trial class, services, coach)

**Decision**: The mapper populates these with safe, honest defaults, because `docs/database-schema.md` has **no column for any of them**: `priceRange → "no_confirmado"`, `trialClassAvailable → false`, `services → []`, `coach → undefined`. No columns are added to the schema this milestone.

**Rationale**: FR-006 requires matching the schema exactly (adding columns = scope creep); BR-016 forbids fabricating data. Safe defaults preserve `Organization`-shape parity (FR-011/SC-006) without inventing values. The mock currently shows richer data than the real schema can store — that's a real finding, not a bug to paper over.

**Consequence flagged to owner**: when the UI shows real data (Milestone 3), organizations will display "Precio no confirmado", no trial-class badge, no services, no coach — until/unless a future migration adds those columns. Candidate for a `docs/data-model.md` amendment if product wants them real.

**Alternatives considered**: add the columns now — rejected (out of scope, contradicts FR-006). Fabricate plausible values — rejected (BR-016).

## R6 — Sport/district filtering approach

**Decision**: For this milestone's seed scale (tens of records), fetch the active catalog and apply the sport/district narrowing after fetch (approach (a) in backend.md §4.3), rather than pre-resolving matching IDs via child-table joins. District comes from `venues.district_id` (an org has no district column); **exact-district match only** — no adjacency (adjacency is matching logic, stays out of this discovery layer).

**Rationale**: SC-002 explicitly sets the bar at seed scale ("no perceptible delay, tens of records"), where post-fetch filtering is simpler to unit-test and keeps the query/mapper clean. Revisit join-based filtering only if the catalog grows to hundreds of rows — documented tradeoff, not silently chosen.

## R7 — Reference seed placement, and CI

**Decision**: Fold the public-safe reference seed (districts + 6 sports, zero PII) directly into migration steps 3 and 4 rather than a separate seed file; only the contact-bearing org seed (`002_organizations.sql`) is a gated, separate step. CI wiring for the integration test is **deferred** — the integration test must exist and be runnable locally/manually (documented in the runbook); an ephemeral-Supabase CI pipeline is a later infra decision (no CI config exists in the repo today).

**Rationale**: districts/sports are reference data effectively part of the schema; gating them behind repo-private would over-apply FR-012 (which is specifically about third-party contact info). Deferring CI keeps this milestone's scope honest — the constitution's test-first rule is satisfied by the tests existing and passing locally.

## Cross-check result

The `backend-architect` confirmed **no drift** between `docs/database-schema.md`, `docs/data-model.md`, and the spec: `leads` has no `status` column, no `coaches`/`events` tables exist, all 14 schema tables are accounted for. This plan applies the schema; it does not redesign it.
