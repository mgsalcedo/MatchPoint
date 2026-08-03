# Tasks: No Empty Sport Match™ Results

**Input**: Design documents from `specs/006-no-empty-results/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: INCLUDED and NON-NEGOTIABLE — constitution Principle III mandates test-first for matching/ranking logic, and this feature IS matching/ranking logic. `app/src/lib/matching.test.ts` already exists (3 describe blocks from `002-sport-match-engine`) — this feature extends it, not creates it from scratch.

**Organization**: by user story (US1 P1, US2 P2 from spec.md), with a Foundational phase for the shared `matching.ts` fix both stories depend on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete-task dependency)
- **[Story]**: US1 / US2 (setup/foundational/polish have no story label)

---

## Phase 1: Setup

None — no new dependencies, no scaffolding needed. This is a targeted fix within existing files.

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ CRITICAL**: both user stories depend on `calculateMatches()`'s corrected behavior and the proof that `results.length === 0` unambiguously means "true empty catalog" post-fix (research.md R2).

- [X] T001 Rename and strengthen the existing `"calculateMatches — no strong match"` describe block in `app/src/lib/matching.test.ts` to `"calculateMatches — wrong sport is always excluded (FR-002, 006-no-empty-results)"`; change its assertion from the vacuously-true reasons check to an explicit `expect(results).toHaveLength(0)` (research.md R6)
- [X] T002 [P] Write failing tests in `app/src/lib/matching.test.ts` — new describe block `"calculateMatches — sport eligibility gate (FR-002)"`: (a) excludes a wrong-sport org that scores well on every other dimension, (b) never lets a wrong-sport org outrank a correctly-sport-matching one (research.md R1, backend.md §5.2)
- [X] T003 [P] Write failing tests in `app/src/lib/matching.test.ts` — new describe block `"calculateMatches — sport-matching org is never dropped for lacking other reasons (FR-001, FR-003)"`: (a) a weak-but-right-sport org is included with `["Ofrece {sport}."]` as its only reason and an honest low label, (b) the sport reason is NOT appended when real reasons already exist — no regression (backend.md §5.3)
- [X] T004 [P] Write failing tests in `app/src/lib/matching.test.ts` — new describe block `"calculateMatches — true-empty-catalog signal (FR-005)"`: (a) zero results when no organization in the catalog offers the requested sport, even if organizations exist for other sports, (b) at least one result whenever at least one organization offers the requested sport, regardless of how weak (research.md R2, backend.md §5.4)
- [X] T005 [P] Write failing test in `app/src/lib/matching.test.ts` — new describe block `"calculateMatches — 5-result cap unchanged (FR-007)"`: still caps at 5 when more than 5 organizations offer the requested sport (backend.md §5.5)
- [X] T006 Implement the `matching.ts` fix — add the explicit `eligible = organizations.filter(org => sportFit(answers, org) > 0)` gate before scoring, remove the trailing `.filter((r) => r.reasons.length > 0)` — makes T001-T005 pass (research.md R1, depends on T001-T005)
- [X] T007 Implement `reasonsFor()`'s sport fallback — push `"Ofrece {sport}."` only when `reasons.length === 0` at that point and `fits.sport >= 1` — makes T003 pass (research.md R4, depends on T006)
- [X] T008 Confirm the pre-existing `"levelFit — real-data regression"` and `"calculateMatches — shape-integration smoke test"` blocks in `matching.test.ts` still pass unmodified after T006/T007 (research.md R6, no code change expected — verification only)

**Checkpoint**: `calculateMatches()` correctly excludes wrong-sport organizations, never drops a sport-matching organization for lacking other reasons, and `results.length === 0` is a proven, unambiguous true-empty-catalog signal. All matching-logic tests green.

---

## Phase 3: User Story 1 — A weak match is still a match, not nothing (Priority: P1) 🎯 MVP-of-this-feature

**Goal**: a user whose answers produce only weak fits still sees real, honestly-labeled results — never the old dead end — and can always choose to change their answers regardless of match quality.

**Independent Test**: pick an answer combination known to produce zero results today for a sport that IS in the catalog; confirm the Results screen shows at least one organization with a visible reason and honest label.

### Implementation for User Story 1

- [X] T009 [US1] Add a persistent "Cambiar mis respuestas" secondary action to `Results.tsx`'s success-path branch (after the results list), unconditional on match quality — reuses the existing `resetMatch()` + `navigate("/match")` pattern (FR-008, research.md R5, depends on T006/T007)

**Checkpoint**: weak-but-real matches are shown honestly (proven by Foundational's tests + this UI wiring); the always-visible "change answers" action exists. User Story 1 is independently demoable.

---

## Phase 4: User Story 2 — A genuinely empty catalog says so plainly (Priority: P2)

**Goal**: when zero organizations offer the requested sport at all, the user sees a distinct, honest message with a single actionable next step — choosing a different sport — not a message implying their answers were the problem.

**Independent Test**: complete Sport Match™ for a sport with zero organizations in the catalog; confirm the message and action are distinguishable from the weak-match case, and clicking through lands on the sport question with other answers intact.

### Implementation for User Story 2

- [X] T010 [US2] Rewrite `Results.tsx`'s `results.length === 0` branch — new copy distinguishing "no communities for this sport yet" from a retry-your-answers message, single primary action `navigate("/match", { state: { startAt: "sport" } })`, deliberately does NOT call `resetMatch()` (FR-009, research.md R5, depends on T006/T007)
- [X] T011 [US2] Add the `location.state.startAt === "sport"` read to `SportMatch.tsx` — initialize `step` at `QUESTIONS.findIndex(q => q.key === "sport")` instead of `0` when set (research.md R5, backend.md §4, depends on T010)

**Checkpoint**: the true-empty-catalog case is fully distinct from the weak-match case in both message and action; both user stories independently functional.

---

## Phase 5: Polish & cross-cutting

- [X] T012 [P] Doc-sync: `docs/matching-engine.md` — sport-as-hard-gate clarification, sport reason template, rewritten "No-match case" section splitting the two states (research.md R8)
- [X] T013 [P] Doc-sync: `docs/microcopy.md` — new true-empty-catalog empty-state copy (replacing the old "expand district/change schedule" actions), sport-fallback reason template, new "Cambiar mis respuestas" copy (research.md R8)
- [X] T014 [P] Doc-sync: `docs/ux-flows.md` — Flow 3's no-results trigger/actions narrowed to match FR-009's single clarified action; note the persistent "change answers" action (research.md R8)
- [X] T015 [P] Doc-sync: `docs/component-library.md` — flag/narrow `EmptyMatchState`'s documented props (`onExpandDistrict`/`onChangeSchedule` → `onChooseAnotherSport`) and copy to match the post-fix model (research.md R8)
- [X] T016 [P] Doc-sync (optional, recommended): `docs/api-contracts.md` — add the sport-exclusion rule explicitly to `POST /api/match-sessions`'s Rules line (research.md R8, backend.md §6.5)
- [X] T017 Run `specs/006-no-empty-results/quickstart.md` validation end-to-end in the running app

---

## Dependencies & Execution Order

- **Foundational** (T001-T008) blocks both user stories — `calculateMatches()`'s corrected behavior is required before either story's UI wiring can be verified.
- **US1 (P1)** needs Foundational only — independently demoable once T009 lands.
- **US2 (P2)** needs Foundational only, independent of US1 — T010/T011 don't touch anything US1 touches.
- Within Foundational: T001-T005 (tests, parallel across describe blocks but same file) before T006; T006 before T007; T008 is verification-only, any time after T007.
- T010 before T011 (SportMatch.tsx's mechanism only matters once Results.tsx actually navigates with the new state).

### Parallel opportunities

- Foundational: T002-T005 are all new describe blocks in the same file (`matching.test.ts`) — can be drafted in parallel conceptually, but land as one coherent edit to one file in practice; T001 (rename existing block) is independent and can happen alongside them.
- US1 and US2 can be implemented in parallel once Foundational is done (different branches of `Results.tsx`, plus US2's own file `SportMatch.tsx`).
- Polish: T012-T016 are all different doc files — fully parallelizable.

## Implementation Strategy

**MVP = Foundational + US1.** US1 alone closes the literal BR-015 violation (the reported bug) and delivers the always-visible "change answers" action. US2 delivers the secondary, correctness-of-messaging improvement for the rarer true-empty-catalog case — valuable, but the core dead-end bug is already fixed without it.

## Notes

- No entity/schema/migration task exists in this list by design — confirmed zero data-model impact (data-model.md).
- No `data-model-review`/`trust-safety-review` skill run required — no schema change, no auth/location/contact-info/moderation surface touched (plan.md Constitution Check).
- T006/T007 are the one non-parallel, sequential core of this feature — everything else fans out from or depends on them.
