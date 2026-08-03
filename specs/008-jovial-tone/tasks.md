# Tasks: Match™ Jovial Tone Recalibration

**Input**: Design documents from `specs/008-jovial-tone/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: NONE automated — pure copy content plus one small UI addition, no business-logic surface for constitution Principle III to gate. Verification is a direct re-read of every changed string against `docs/microcopy.md`, plus the existing test suites staying green as a regression guard.

**Organization**: by user story (US1 P1, US2 P1 from spec.md). US2 is guardrail *verification* on strings US1 writes, not separate implementation — its tasks are review tasks, not code tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete-task dependency)
- **[Story]**: US1 / US2 (setup/foundational/polish have no story label)

---

## Phase 1: Setup

None — no new dependencies, no scaffolding.

---

## Phase 2: Foundational

None — no shared blocking prerequisite. Each file's string swap is independent (different files, no cross-file dependency), so work starts directly in Phase 3.

---

## Phase 3: User Story 1 — Every screen sounds like the same jovial guide (Priority: P1) 🎯 MVP-of-this-feature

**Goal**: every Match™-voiced string across the full funnel matches `docs/microcopy.md`'s recalibrated text.

**Independent Test**: walk the full funnel and confirm every string matches the doc exactly, screen by screen.

### Implementation for User Story 1

- [X] T001 [P] [US1] `app/src/pages/Welcome.tsx` — update greeting and body per research.md R2's mapping table
- [X] T002 [US1] `app/src/pages/SportMatch.tsx` — three changes in one file, done together: (a) add optional `helper?: string` to the `Question` type and populate it per question from `docs/microcopy.md`'s "Sport Match™ questions" section (research.md R1 — new UI, plain `<p>` under the `<h2>`, reusing existing paragraph styling, no new component); (b) rewrite all 8 `GUIDE_MICROCOPY` entries per research.md R2; (c) rewrite the matching-transition `<h2>`
- [X] T003 [P] [US1] `app/src/pages/Results.tsx` — update the subheadline only (headline and "Cambiar mis respuestas" already match the doc, confirm and leave untouched)
- [X] T004 [P] [US1] `app/src/pages/Login.tsx` — update the body only (title already matches, confirm and leave untouched)
- [X] T005 [P] [US1] `app/src/pages/ContactSuccess.tsx` — update the headline
- [X] T006 [P] [US1] `app/src/pages/OrganizationProfile.tsx` — update the org-not-found heading, the org-unavailable inline message, and the lead-save-failure inline message per research.md R2/R3
- [X] T007 [P] [US1] `app/src/pages/AuthCallback.tsx` — update the org_unavailable heading/body, lead_failed heading/body, and fallback heading per research.md R2/R3 (leave "Confirmando tu ingreso..." unchanged — sub-second transitional state, not worth rewriting per research.md R2)

**Checkpoint**: every screen in the funnel reflects the recalibrated voice; option labels, match-reason text, and the true-empty-catalog message remain untouched by construction (never edited in these tasks).

---

## Phase 4: User Story 2 — The playful tone never lands on the user (Priority: P1)

**Goal**: confirm the guardrail held across every error, empty, and failure state written in Phase 3.

**Independent Test**: trigger every error/empty/failure state and confirm none mocks, blames, or jokes about the situation.

### Verification for User Story 2

- [X] T008 [US2] Re-read every string touched in T006/T007 (org-not-found, org-unavailable, lead-save-failure, AuthCallback fallback) against `docs/match-character.md`'s "line that matters most" (playful about the situation, never at the user's expense) — confirm none implies the failure is the user's fault (depends on T006, T007)
- [X] T009 [US2] Confirm by direct comparison that the true-empty-catalog message (`Results.tsx`) and match-reason text (`app/src/lib/matching.ts`'s `reasonsFor()`) are byte-for-byte unchanged from before this feature — these must never have been touched (depends on T001-T007, verification only, no code change expected)
- [X] T010 [US2] Confirm by direct comparison that all selectable option labels (`app/src/lib/labels.ts`'s `*_LABELS` maps) are byte-for-byte unchanged — verification only, no code change expected

**Checkpoint**: the guardrail is verified, not assumed — every risky string has been explicitly checked, not just written and trusted.

---

## Phase 5: Polish & cross-cutting

- [X] T011 Run the existing test suites and `tsc -b` as a regression guard — no logic changed, so both must be green with no modifications (use the real build-mode check per `007-visual-identity-system`'s finding that the root `tsconfig.json` alone is a silent no-op)
- [X] T012 Run `specs/008-jovial-tone/quickstart.md` end to end in the running app, including triggering the error/failure states (network/login error, a Lead-save failure, the true-empty-catalog path) — not just the happy path

---

## Dependencies & Execution Order

- **US1 (T001-T007)**: all 7 tasks touch different files — fully parallelizable, no ordering dependency between them. T002 is internally three related edits to one file, kept as a single task rather than split, since splitting would create an artificial same-file conflict.
- **US2 (T008-T010)** depends on US1 being complete — it verifies what US1 wrote.
- **Polish (T011-T012)** depends on US1 and US2 both being complete.

### Parallel opportunities

- T001, T003, T004, T005, T006, T007 are all different files — fully parallel. T002 stands alone (same file, three related edits).
- T008, T009, T010 can run in parallel with each other (independent checks) once US1 is done.

## Implementation Strategy

**MVP = all of US1.** There's no meaningful partial version of a tone recalibration — Story 1's own priority rationale is explicit that a partial rollout is worse than none, so this feature ships as one unit (US1 + US2's verification + Polish), not incrementally.

## Notes

- No `data-model-review` or `trust-safety-review` run required — no schema, auth, location, contact-visibility, or moderation surface touched (plan.md Constitution Check).
- Two previously-undocumented strings (org-not-found, lead-save-failure) were already folded into `docs/microcopy.md` during planning (research.md R3) — T006/T007 implement what the doc now already says, they don't require a separate copywriting decision.
