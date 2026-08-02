# Research & Decisions: Sport Match™ Engine (Phase 0)

Resolves the technical unknowns surfaced by the `backend-architect` plan (`.claude/doc/sport-match-engine/backend.md`). Each is decided with a sensible default so `/speckit-tasks` has no unresolved `NEEDS CLARIFICATION`. Two decisions (R6, R7) are product-facing (they change what a funnel metric counts) and are flagged to the owner explicitly — implementation proceeds with the stated default unless overridden.

## R1 — RLS design for anonymous `match_sessions`/`match_results` writes

**Decision**: Insert-only policies for the `anon` role, **no SELECT policy at all**, on both tables (new migration `0009_match_session_results_anon_insert.sql`). The client generates every row id itself via `crypto.randomUUID()` before inserting, so it never needs Supabase to `RETURNING` a row (which would itself require a SELECT policy it doesn't otherwise need). `match_sessions` additionally gets `with check (user_id is null)` — an anonymous request has no verified identity, so it must not be able to write an arbitrary `user_id`, which would fabricate session attribution.

**Rationale**: no SELECT policy is a strict superset of FR-006/SC-005 ("no one can read another session's data") — it's not just narrowly satisfied, it's structurally impossible via the anon key. This is also the minimal-privilege reading of constitution Principle V (PMV Scope Discipline): don't grant read access nothing currently needs.

**Alternatives considered**: SELECT policy scoped by a client-held session token — rejected as unneeded complexity; nothing in this feature's UI re-fetches a session after writing it (results are already in browser memory from the matching computation).

**Consequence flagged to owner**: if a future milestone needs to "resume a match" after a page reload, it will need a new, narrowly-scoped SELECT policy added then — not built speculatively now.

## R2 — `levelFit()` NaN bug in `matching.ts`

**Decision**: Fix `levelFit()` to filter out schedules with no confirmed `level` before computing rank distances, falling back to the function's existing neutral `0.5` when zero schedules have a confirmed level (same treatment as its existing "zero schedules at all" case) — not a fabricated level (BR-016 stays satisfied).

**Rationale**: `Schedule.level` became optional during 001-data-foundation's code-review pass (real seeded schedules can legitimately have no confirmed level). `LEVEL_RANK[undefined]` poisons the whole weighted score into `NaN`, which silently forces the organization to "Weak Match" with no visible error — a real, live bug that this feature's data-source swap (mock → real orgs) would otherwise surface for the first time in production. Fixing it here, with a regression test, is in scope because FR-004 explicitly requires matching to handle this case correctly.

**Alternatives considered**: defaulting missing `level` to a specific rank (e.g. "principiante") — rejected, it's exactly the fabrication BR-016 forbids.

## R3 — Fetch scope for `getOrganizations()` when matching

**Decision**: Call `getOrganizations()` with **no** `sportSlug`/`districtName` filter params when computing matches — fetch the full active/eligible catalog and let `matching.ts`'s own scoring (including its soft sport-fit and adjacent-district 0.6 scoring) do the ranking, exactly as it does against the mock array today.

**Rationale**: pre-filtering by the user's exact sport/district would silently change matching behavior (an org offering a *related* sport, or in an *adjacent* district, would never even reach the scorer) while looking like a pure data-source swap. Per `docs/matching-engine.md`'s geo-matching checklist, this would be an undocumented behavior regression disguised as a refactor.

**Alternatives considered**: server-side pre-filtering for performance — rejected at current scale (9-50 seeded organizations, confirmed by 001-data-foundation's integration test); revisit only if the catalog grows enough that shipping the full set client-side becomes a measurable cost.

## R4 — Data-access layer additions

**Decision**: Add `app/src/lib/data/sports.ts` and `districts.ts` (id-by-slug/name lookups, read-only, already anon-readable under existing RLS — no policy change needed), extend `mappers.ts` with three reverse (app→DB) translation functions derived from its existing tables (no second copy of the same vocabulary), and add `sessionMappers.ts` for the vocabularies genuinely new to this feature (goal/budget/environment/label). All follow 001-data-foundation's established pattern: pure functions, zero Supabase imports in anything test-covered for business logic, `supabase` client only in the thin write function (`matchSessions.ts`).

**Rationale**: one source of truth per vocabulary table (`docs/base-standards.md`'s no-duplicate-domain-logic rule) — deriving the reverse direction from the existing `SPORT_SLUG_MAP`/`LEVEL_MAP`/`DAY_OF_WEEK_MAP` avoids a second, driftable copy.

## R5 — Persistence failure handling

**Decision**: `createMatchSession()` never throws; every failure mode (sport/district lookup miss, network error, insert error) collapses to `{ matchSessionId, persisted: false }`. The caller always has a `matchSessionId` (client-generated) to hold in state, and always shows the already-computed results regardless of `persisted`.

**Rationale**: FR-009 requires a save failure to never block or blank the results screen — persistence is a side effect of showing value, not a precondition for it, consistent with constitution Principle I in spirit (don't add new friction/failure points in front of the user seeing their match).

**Consequence flagged to owner (forward-compatibility, not a decision needed now)**: `matchSessionPersisted: boolean` is added to session state alongside `matchSessionId` specifically so Milestone 5 (Lead creation) doesn't accidentally reference a `match_session_id` that was never actually written (which would violate `leads.match_session_id`'s foreign key). Nothing about Lead creation is built here — this is a note left for that milestone's plan.

## R6 — RESOLVED (owner decision, 2026-07-28): `sport_match_completed` fires only when persisted

**Decision**: the event fires only when `persisted === true` — a literal reading of FR-007's wording ("record... when a session is successfully created").

**Rationale**: the owner confirmed this over firing on questionnaire completion regardless of write success — the completion-rate metric is meant to double as a data-quality signal ("did we actually capture this session"), not purely measure user-facing behavior independent of backend success. This directly feeds `docs/roadmap.md`'s "60%+ Sport Match™ completion rate" PMV validation target.

## R7 — RESOLVED (owner decision, 2026-07-28): `no_match_viewed` is a distinct event

**Decision**: `results_viewed` fires only when `results.length > 0` (matched results shown). A **separate** event, `no_match_viewed`, fires when the questionnaire completes with zero results (the "no strong match" screen). Both are added to the `AnalyticsEvent` union in `app/src/lib/analytics.ts`; both are mount-only-effect events on the results screen, mutually exclusive by construction (a given results-screen render has either results or it doesn't).

**Rationale**: the owner confirmed this over conflating both into one `results_viewed` count — distinguishing "viewed matched results" from "viewed the no-match screen" lets the team see exactly how often the real (currently 9-organization) catalog fails to produce a match, which is a direct, actionable signal for whether more organizations need to be sourced (Milestone 7's "30-50 organizations" target). This also keeps User Story 2 / SC-003 (the no-match experience) independently measurable, not just independently testable.

**FR update**: spec.md's FR-008 is extended to also require the `no_match_viewed` event for the zero-results case (see spec.md's amended requirement).

## R8 — Schema/RLS drift check

**Decision**: No entity/column drift found. `match_sessions`/`match_results` in migration `0006_match_and_leads.sql` match `docs/database-schema.md` exactly (already applied, from 001-data-foundation). The only gap is the missing RLS policy (R1), not a schema mismatch — confirmed by direct line-by-line comparison.

## R9 — `match_sessions.anonymous_id` intentionally left null (data-model-review finding)

**Decision**: `sessionMappers.ts`'s `buildMatchSessionRow` does not populate `match_sessions.anonymous_id`. Every session this feature writes has both `user_id` and `anonymous_id` null.

**Context**: `docs/data-model.md`'s `MatchSession` rules state "anonymous session is allowed (`user_id` null, `anonymous_id` set)" — read literally, an anonymous session is expected to carry a value in `anonymous_id`. This feature does not do that.

**Rationale for deferring, not implementing**: `anonymous_id` exists to let a returning anonymous visitor's sessions be correlated (e.g. before/after login-linking, or cross-session analytics) — but this feature has no consumer for that: session-resume and cross-session linking are explicitly out of scope (spec.md's Assumptions), and Milestone 5 (the first feature that would plausibly read it, to link a session to a newly-authenticated user) doesn't exist yet either. Populating it now would mean inventing a client-side persistent-visitor-identifier mechanism (e.g. a `localStorage`-backed id) that nothing reads — exactly the kind of ahead-of-need complexity constitution Principle V (PMV Scope Discipline) rejects. `match_sessions.id` (client-generated, already known) is sufficient for everything this feature actually does with a session.

**Consequence flagged to owner**: whichever future feature needs to correlate an anonymous visitor's sessions (most likely Milestone 5's post-login session-linking) must introduce the persistent-identifier mechanism and backfill this decision — it is not solved here. `docs/data-model.md`'s rule is accurate as a target-state description; this is a documented, deliberate gap against it, not an oversight.

## Cross-check result

The `backend-architect` confirmed this plan touches nothing related to `leads`, auth, or Lead immutability (constitution Principle IV) — Lead creation remains Milestone 5, fully untouched here. The matching algorithm's weights/formula/reasons-generation are unchanged; only `levelFit()`'s bug is fixed (R2).
