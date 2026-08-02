# Tasks: Sport Match™ Engine (real sessions & matching)

**Input**: Design documents from `specs/002-sport-match-engine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/match-session-write.md, quickstart.md

**Tests**: INCLUDED — the constitution (Principle III) mandates test-first for the `levelFit()` bug fix and the new session/result mappers (business logic + a translation layer with silent-failure risk). UI wiring tasks are not test-gated beyond that.

**Organization**: by user story (US1 P1, US2 P2, US3 P3 from spec.md), so each is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete-task dependency)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish have no story label)

---

## Phase 1: Setup (shared infrastructure)

- [X] T001 [P] Add `DbMatchGoal`, `DbBudgetRange`, `DbMatchEnvironment`, `DbMatchLabel` types to `app/src/lib/data/types.ts` (data-model.md)

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ CRITICAL**: no user story can be verified until real matching is correct and the anonymous write path exists.

- [X] T002 Write migration `supabase/migrations/0009_match_session_results_anon_insert.sql` — anon insert-only policies for `match_sessions`/`match_results`, `with check (user_id is null)` on `match_sessions`, no SELECT policy (research.md R1)
- [X] T003 Owner action: apply migration from T002 to the Supabase project via the SQL Editor — done
- [X] T004 [P] Write a failing regression test for the `levelFit()` bug in `app/src/lib/matching.test.ts` — confirmed red (1/5 failing) before the fix; note: the bug's real manifestation isn't a literal `NaN` in the final score (the function's own fallback branch catches that), it's that ONE unconfirmed-level schedule drags an org's whole level-fit down to the worst-case `0.15` even when its OTHER schedules confirm an exact level match — the regression test asserts against that, not bare `Number.isFinite`
- [X] T005 Fix `levelFit()` in `app/src/lib/matching.ts` to filter out schedules with no confirmed `level` before ranking, falling back to the existing neutral `0.5` when none remain (research.md R2) — confirmed green (5/5) after the fix
- [X] T006 [P] Add reverse (app→DB) enum lookups — `mapSportToSlug`, `mapLevelToDb`, `mapWeekdayToDayOfWeek` — to `app/src/lib/data/mappers.ts`
- [X] T007 [P] Create `app/src/lib/data/sports.ts` — `getSportId(slug)`
- [X] T008 [P] Create `app/src/lib/data/districts.ts` — `getDistrictId(name)`
- [X] T009 Write failing tests in `app/src/lib/data/sessionMappers.test.ts` — confirmed red (module didn't exist) before implementation
- [X] T010 Implement `app/src/lib/data/sessionMappers.ts` — confirmed green (29/29) after implementation
- [X] T011 Implement `createMatchSession()` in `app/src/lib/data/matchSessions.ts`
- [X] T012 [P] Write `app/src/lib/data/matchSessions.integration.test.ts` — executed after T003, 3/3 passing against the live DB

**Checkpoint**: matching produces correct scores for real data; anonymous persistence works and is proven against a live DB — user story work can begin.

---

## Phase 3: User Story 1 — Get real, trustworthy match results (Priority: P1) 🎯 MVP

**Goal**: a user who completes Sport Match™ gets ranked results from the real, currently-active organization catalog, and a corresponding session is persisted.

**Independent Test**: complete the questionnaire in the running app with answers likely to match a real seeded organization (e.g. running, San Isidro); confirm the results screen shows real organizations and a new row exists in `match_sessions`/`match_results` (quickstart.md).

### Implementation for User Story 1

- [X] T013 [US1] Make `finalizeMatch` in `app/src/context/MatchSessionContext.tsx` async — **superseded backend.md §6.3's own suggested fix**: keeping `state.answers` in the `useCallback` deps array does NOT prevent a stale read when `finalizeMatch()` is invoked synchronously right after `updateAnswers()` in the same click handler (React hasn't applied that `setState` yet, so the closure captured at render time is one answer behind regardless of deps). Found this live (see T017) — fixed by having `finalizeMatch(answers)` take the final merged answers as a **parameter** instead of reading `state.answers` from closure at all; the caller (`SportMatch.tsx`) builds the merge explicitly.
- [X] T014 [US1] Update `app/src/pages/SportMatch.tsx`'s last-question handler — builds `finalAnswers = { ...answers, ...partial }` explicitly and passes it to `finalizeMatch(finalAnswers)` (see T013 note)
- [X] T015 [US1] Repoint `getOrganization(id)` and `confirmPendingContact()` in `MatchSessionContext.tsx` at `state.results`
- [X] T016 [US1] Ran `RUN_INTEGRATION=1 npx vitest run src/lib/data/matchSessions.integration.test.ts` against the live, migrated DB — 3/3 passing
- [X] T017 [US1] Manual end-to-end verification in the running app (San Isidro running, "Conocer gente" goal): **first run failed** — "Failed to persist match session" logged, root-caused to the stale-closure bug (T013). Fixed, re-ran: real results rendered (Peru Runners "Excellent Match" with correct reasons), `sport_match_completed` fired (proving `persisted: true`), no errors

**Checkpoint**: User Story 1 fully functional — real, persisted matches, independently demoable.

---

## Phase 4: User Story 2 — Graceful "no match yet" for real gaps (Priority: P2)

**Goal**: answer combinations with no strong real match show the existing no-results screen, never a broken or partial one.

**Independent Test**: complete the questionnaire with a combination unlikely to match any real seeded organization; confirm the no-results screen appears, and a session row is still created with zero result rows (SC-002).

### Implementation for User Story 2

- [X] T018 [P] [US2] Added a test to `app/src/lib/matching.test.ts` asserting `calculateMatches` returns `[]` when no organization clears the `reasons.length > 0` bar — passing
- [X] T019 [US2] Manual verification — **could not reproduce a zero-result case against the live catalog**: an exhaustive single-day search over every goal × sport × district × day × time × level × budget × environment combination (9 real orgs) found none that yields `results.length === 0`. This isn't a bug — with only 9 orgs spanning most districts and 6+ independent scoring factors (any one clearing a low 0.6 bar produces a "reason"), the current catalog is too broad/generous for the honest no-match state to actually surface yet. The zero-results *code path itself* is proven correct at the unit level (T018, controlled fixture) and `Results.tsx`'s empty-state branch is simple, pre-existing, and unmodified — but the live UI screen was not visually observed this session. Flagged to the owner, not silently marked "verified."

**Checkpoint**: both the real-match and no-match paths are verified against the live catalog.

---

## Phase 5: User Story 3 — Funnel is measurable (Priority: P3)

**Goal**: questionnaire completion and the results-vs-no-match outcome are each trackable, per research.md R6/R7.

**Independent Test**: complete the questionnaire twice (once matching, once not); confirm exactly one completion event and exactly one of `results_viewed`/`no_match_viewed` logs per run.

### Implementation for User Story 3

- [X] T020 [P] [US3] Created `app/src/lib/analytics.ts` — `AnalyticsEvent` union, `track()`/`setTracker()`, dev-console default sink
- [X] T021 [US3] `sport_match_completed` fires in `finalizeMatch()`, conditioned on `persisted === true` — confirmed live (T017)
- [X] T022 [US3] `results_viewed`/`no_match_viewed` fire from a mount-only effect in `Results.tsx`
- [X] T023 [US3] Manual verification — `sport_match_completed` and `results_viewed` both confirmed firing correctly in the live E2E run (T017). `results_viewed` fired twice in that run, traced to React `StrictMode` (enabled in `main.tsx`) double-invoking mount effects in dev only — expected React behavior, not a real duplicate (won't happen in a production build). `no_match_viewed` was not observed live, since T019 could not reach the no-match state — code-reviewed only, not live-confirmed.

**Checkpoint**: all three user stories independently functional; the funnel is observable end to end.

---

## Phase 6: Polish & cross-cutting

- [X] T024 [P] Doc-sync: added the anon-insert RLS note to `docs/database-schema.md` and the implementation note under `POST /api/match-sessions` in `docs/api-contracts.md`
- [X] T025 Ran `data-model-review` — no schema/migration drift; found `match_sessions.anonymous_id` is left null against `docs/data-model.md`'s stated rule (documented as a deliberate deferral, research.md R9) and a low-severity note that `match_results`' insert policy isn't scoped to "the session's own creator" (accepted risk, UUIDs unguessable, no SELECT policy to discover them)
- [X] T026 Ran `geo-matching-review` — no regression: no haversine/radius introduced, no scoring logic duplicated outside `matching.ts`, missing-district exclusion still handled upstream by `meetsMinimumDataset()`, unscoped catalog fetch confirmed fine at current scale
- [X] T027 Quickstart validation — unit/integration/E2E-real-match/analytics rows confirmed; the no-match row has the same caveat as T019 (mechanism proven at the unit level, not observed live against the real catalog)

---

## Dependencies & Execution Order

- **Setup** → **Foundational** → **Stories (US1 → US2 → US3)** → **Polish**.
- **US1 (P1)** is the MVP: needs Setup + Foundational only.
- **US2 (P2)** depends on Foundational only (the no-match path is a side effect of T005's bug fix + T013's unscoped fetch) — independently testable once Foundational is done, though practically verified after US1's wiring lands (T013-T014) since it uses the same code path.
- **US3 (P3)** depends on Foundational (T020's analytics module) plus US1's `finalizeMatch`/`Results.tsx` touch points (T013, and the existing `Results.tsx`) to attach `track()` calls to — cannot be meaningfully tested before T013 lands.
- Within Foundational: T004 (test) before T005 (fix); T006 before T010; T009 (test) before T010; T007+T008+T010 before T011.

### Parallel opportunities

- Setup: T001 alone (no other Setup tasks).
- Foundational: T004, T006, T007, T008 in parallel (different files); T012 in parallel with US1/US2 work once written (only *running* it needs T003 done).
- US2's T018 can run in parallel with US1's T013-T017 (same test file as T004/T005 but an additive, independent test case).
- US3's T020 can be written in parallel with anything in US1/US2 (new, independent file); T021/T022 need their respective call sites to exist first.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1.** At that point a user gets real, persisted match results end to end — the core value of this feature. US2 hardens the honest-failure case; US3 makes the funnel measurable for PMV validation.

## Notes

- `app/src/data/organizations.ts` (the mock array) is **not deleted** — its `DISTRICTS` export is still used by the questionnaire's district-picker UI (out of scope here).
- `app/src/lib/data/organizations.ts` (`getOrganizations()`) is reused **unmodified**.
- Nothing in this feature touches `leads`, auth, or the Lead-immutability rule (constitution Principle IV) — flagged for code review to confirm at T025/T026.
- `matchSessionPersisted` (added to session state in T013) is a forward-compatibility flag for Milestone 5 (Lead creation) — not consumed by anything in this feature, but must not be dropped (backend.md §6.5).
