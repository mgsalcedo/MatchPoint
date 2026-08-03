# Tasks: Analytics & Funnel Measurement

**Input**: Design documents from `specs/005-analytics-funnel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/analytics-event.md, quickstart.md

**Tests**: INCLUDED for the two new pure modules (`visitId.ts`, `analyticsEventMappers.ts`), matching this project's established practice for pure data-mapping modules (`sessionMappers.ts`, `leadMappers.ts`) even though constitution Principle III doesn't strictly gate this (not matching/ranking/lead-eligibility logic). The `anon`-role write path additionally gets a live-DB integration test (research.md R13) — unlike `004`'s RLS-gated writes, this one needs no `service_role` and no authenticated session, so it's safe to automate.

**Organization**: by user story (US1 P1, US2 P1, US3 P2 from spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete-task dependency)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish have no story label)

---

## Phase 1: Setup

- [X] T001 [P] Add 4 new `AnalyticsEvent` union members (`app_opened`, `match_started`, `profile_opened`, `contact_clicked`) to `app/src/lib/analytics.ts` (contracts/analytics-event.md, research.md R1)

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ CRITICAL**: no user story can be verified until storage exists and the write path is wired up.

- [X] T002 Write migration `supabase/migrations/0012_analytics_events.sql` — `analytics_event_name` enum, `analytics_events` table (no foreign keys on any correlation column, research.md R5), indexes, `anon`/`authenticated` INSERT-only RLS policies, no SELECT policy for any client role (data-model.md, research.md R4/R5/R6)
- [X] T003 Owner action: apply migration `0012` to the Supabase project via the SQL Editor
- [X] T004 [P] Write failing tests in `app/src/lib/visitId.test.ts` — `getOrCreateVisitId()` creates once and returns the same value on repeat calls, against a mocked `sessionStorage` (research.md R2/R3)
- [X] T005 [P] Implement `app/src/lib/visitId.ts` — makes T004 pass (depends on T004)
- [X] T006 [P] Write failing tests in `app/src/lib/data/analyticsEventMappers.test.ts` — every `AnalyticsEvent` variant maps to the correct row shape in `buildAnalyticsEventRow` (contracts/analytics-event.md) (depends on T001)
- [X] T007 [P] Implement `app/src/lib/data/analyticsEventMappers.ts` — makes T006 pass (depends on T001, T006)
- [X] T008 Implement `app/src/lib/data/analyticsEvents.ts` — `installSupabaseAnalyticsSink()`, fire-and-forget write via a detached async call, never throws/blocks the caller (research.md R7/R8) (depends on T005, T007)
- [X] T009 Wire `installSupabaseAnalyticsSink()` into `app/src/main.tsx`, called before `render()` (research.md R9's bootstrap-ordering note) (depends on T008)

**Checkpoint**: durable storage and the non-blocking write path exist and are unit-tested; new event call sites can now be added.

---

## Phase 3: User Story 1 — Every funnel step is captured (Priority: P1) 🎯 MVP-of-this-feature

**Goal**: all 9 BR-027 funnel steps produce a tracked event, including the 4 currently missing.

**Independent Test**: walk through the full funnel once and confirm, via the Supabase Table Editor, that one event row exists for each of the 9 steps, sharing one `visit_id`.

### Implementation for User Story 1

- [X] T010 [US1] Add `app_opened` tracking: mount-time `useEffect` in `app/src/App.tsx` (research.md R9) (depends on T009)
- [X] T011 [US1] Add `match_started` tracking: mount-time `useEffect` in `app/src/pages/SportMatch.tsx`, mirroring `Results.tsx`'s existing mount-effect pattern (research.md R9) (depends on T009)
- [X] T012 [US1] Add `profile_opened` tracking: mount-time `useEffect` in `app/src/pages/OrganizationProfile.tsx`, guarded on `organization` actually resolving (skip the "no longer available" branch) (research.md R9) (depends on T009)
- [X] T013 [US1] Add `contact_clicked` tracking: first statement inside `handleContact()` in `app/src/pages/OrganizationProfile.tsx`, before `setContactState("sending")` and before `requestContact(...)` (research.md R9, FR-002) (depends on T009)

**Checkpoint**: all 9 BR-027 events fire and are durably stored — full funnel walkthrough is verifiable end to end.

---

## Phase 4: User Story 2 — Events survive so they can be analyzed later (Priority: P1)

**Goal**: prove storage actually works for anonymous visitors and that a write failure never affects the user.

**Independent Test**: perform a tracked action as an anonymous visitor and confirm a row appears in storage without needing to be logged in; simulate a write failure and confirm zero user-visible effect.

### Implementation for User Story 2

- [X] T014 [US2] Write live-DB integration test `app/src/lib/data/analyticsEvents.integration.test.ts` — anon insert of an event succeeds; the anon client cannot read it back (no SELECT policy), following `matchSessions.integration.test.ts`'s established pattern (research.md R13) (depends on T003, T008)
- [X] T015 [US2] Manual verification per quickstart.md: throttle/disconnect the network briefly during a tracked action (e.g. a contact click) and confirm no visible error, no blocked action, no crash (depends on T008)

**Checkpoint**: storage durability and non-blocking behavior are proven, not just designed.

---

## Phase 5: User Story 3 — Weekly funnel metrics can actually be computed (Priority: P2)

**Goal**: a documented, ready-to-run way to compute the PMV's core funnel metrics for any date range.

**Independent Test**: with at least one full funnel walkthrough's worth of events stored, run the documented queries and confirm they return correct counts/rates.

### Implementation for User Story 3

- [X] T016 [US3] Write `docs/analytics-queries.md` — SQL for Sport Match™ completion rate, results→profile CTR, profile→contact CTR (joined on `visit_id` + `organization_id` together, not `visit_id` alone — research.md R10's overcounting flag), leads/contacts generated count, and step-by-step drop-off (hardcoding BR-027's 9-step order) (depends on T002)
- [X] T017 [US3] Manual verification per quickstart.md: run the queries against a sample walkthrough's data and confirm the numbers match what was actually done (depends on T016, T010, T011, T012, T013)

**Checkpoint**: all three user stories independently functional; the funnel is both complete and measurable.

---

## Phase 6: Polish & cross-cutting

- [X] T018 [P] Doc-sync: new `AnalyticsEvent` section in `docs/data-model.md` (no ER-diagram entry — no enforced relationships, research.md R5/R11), new `### analytics_events` table section + RLS-notes bullet + migration-order entry in `docs/database-schema.md`, short implementation note (no fabricated endpoint) in `docs/api-contracts.md` (research.md R11)
- [X] T019 Run the `data-model-review` skill against the diff (new migration/table touches `database-schema.md`-adjacent code)
- [X] T020 Run the `trust-safety-review` skill against the diff — recommended, not a hard constitutional trigger here, but this table newly aggregates `user_id` + district + organization at a durability/volume the project hasn't had before (plan.md Constitution Check, research.md R12)
- [X] T021 Run `specs/005-analytics-funnel/quickstart.md` validation end-to-end

---

## Dependencies & Execution Order

- **Setup** → **Foundational** → **Stories (US1 → US2 → US3)** → **Polish**.
- **US1 (P1)** needs Foundational's write path (T009) — no dependency on US2/US3.
- **US2 (P1)** needs Foundational (T003 applied migration, T008 write path) — independently testable from US1 (doesn't need any of the 4 new call sites to prove anon writes work; it can use any existing event).
- **US3 (P2)** needs T002 (schema) for the queries doc, and needs US1's call sites (T010-T013) actually landed to have real sample data for its manual verification step.
- Within Foundational: T002 before T003; T004 (test) before T005; T001 before T006; T006 (test) before T007; T005+T007 before T008; T008 before T009.

### Parallel opportunities

- Setup: T001 alone.
- Foundational: T004/T005 in parallel with T006/T007 (different files); T003 (owner action) can happen any time after T002, in parallel with T004-T007.
- US1's T010-T013 are all different files — fully parallelizable once T009 lands.
- US2's T014/T015 can run in parallel with each other and with US1, once T008/T003 are done.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1.** US1 alone closes BR-027's literal event-coverage gap and proves storage works end to end (since Foundational already includes the write path). US2 hardens the durability/non-blocking guarantee with explicit tests; US3 delivers the actual metrics payoff the milestone exists for, but has zero value until US1's events exist.

## Notes

- No `Lead` schema change anywhere in this feature — `analytics_events` is a wholly separate, equally-immutable entity. Confirm at T019/T020.
- No dashboard UI, no third-party analytics tool, no consent/opt-out mechanism — none of these are tasks in this list by design (spec.md Assumptions, plan.md Constitution Check).
- T020 (trust-safety-review) is a judgment call, not a hard constitutional gate here — do not skip it anyway, per plan.md's Constitution Check reasoning.
