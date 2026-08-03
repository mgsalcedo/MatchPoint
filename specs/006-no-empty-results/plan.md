# Implementation Plan: No Empty Sport Match™ Results

**Branch**: `006-no-empty-results` | **Date**: 2026-08-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-no-empty-results/spec.md`

## Summary

Fix a real BR-015 violation: `calculateMatches()` silently drops any organization producing zero human-readable reasons, so a sport-matching organization can vanish from results if every other dimension scores weakly — collapsing the whole Results screen to a dead end. Planning uncovered a second, more serious bug along the way: nothing today hard-excludes on sport at all, so a wrong-sport organization can already leak into results if it scores well enough on location/schedule/budget. The fix (research.md R1) is two changes, not one: a new explicit sport-eligibility filter (closes the wrong-sport leak, FR-002) plus removal of the zero-reasons filter (closes the original dead-end bug, FR-001), with a new fallback-only sport reason in `reasonsFor()` (FR-003) so a sport-only match still has something honest to say. Post-fix, `results.length === 0` is proven (research.md R2) to be an unambiguous signal for "zero organizations offer this sport at all" — the one legitimate true-empty case (User Story 2), distinct from "weak-but-real matches now shown" (User Story 1). Two new UI actions follow directly from the two clarified answers: a persistent "change your answers" full-restart action (FR-008) and a "choose a different sport" sport-only-jump action (FR-009).

## Technical Context

**Language/Version**: TypeScript (React 19, Vite) — unchanged, matches `app/` throughout.

**Primary Dependencies**: none new — pure logic + existing React Router `location.state` pattern (already used by `OrganizationProfile.tsx`).

**Storage**: N/A — no persistence-layer change (data-model.md confirms no entity/schema impact).

**Testing**: Vitest — extends the already-existing `app/src/lib/matching.test.ts` (not created from scratch) with new describe blocks; one existing test renamed/strengthened per research.md R6. TDD is NON-NEGOTIABLE here per constitution Principle III (matching/ranking logic) — every new test is written failing-first against pre-fix code.

**Target Platform**: Same as the rest of `/app` — PWA, mobile-first web.

**Project Type**: Single project (`/app` frontend) — no backend/API/schema touched.

**Performance Goals**: N/A — no change to computation shape or volume (still a single client-side pass over the organization catalog).

**Constraints**: Must not fabricate reasons, organizations, or scores (BR-016); must not relabel a weak match as strong (FR-004); must not exclude an organization that genuinely offers the requested sport, and must not include one that doesn't (FR-001/FR-002).

**Scale/Scope**: Two files change (`matching.ts`, plus two page components); four docs need sync (research.md R8) since they currently describe the pre-fix single-empty-state model.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. No Login Before Value** — ✅ Pass / N/A. Sport Match™ and Results remain fully pre-login; this fix doesn't touch auth.
- **II. Sport Match™ First** — ✅ Pass, directly. This fix strengthens the core promise (every result has a human-readable reason, BR-012) and keeps matching logic centralized in `matching.ts` — no duplicated scoring logic introduced.
- **III. Test-First for Business Logic** — ✅ Pass, NON-NEGOTIABLE and directly applicable — this IS matching/ranking logic. `matching.test.ts` gets 5 new describe blocks written failing-first (research.md R6), plus one existing test strengthened from a vacuous assertion to a real one.
- **IV. Contact/Lead Is the North Star** — ✅ Pass / N/A. No change to Lead creation, contact flow, or anything downstream of Results.
- **V. PMV Scope Discipline** — ✅ Pass. This closes an existing, documented business rule (BR-015) rather than adding new product surface; the two clarified UI actions (FR-008/FR-009) are minimal, reuse existing patterns (`resetMatch()`+navigate, `location.state`), and explicitly avoid over-engineering (research.md R5 — a single literal `startAt: "sport"`, not a general "jump to any question" feature).
- **VI. Trust & Safety** — ✅ Pass / N/A. No auth, location-precision, contact-info-visibility, or moderation change — this doesn't trigger the conditional security/trust-safety review requirement.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/006-no-empty-results/
├── plan.md              # This file
├── research.md          # Phase 0 output (R1-R8)
├── data-model.md         # Phase 1 output (confirms no entity impact)
├── quickstart.md         # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` directory — this feature has no new or changed external interface (no API, no DB contract) to document.

### Source Code (repository root)

Single project — no new files, only edits to existing ones.

```text
app/src/
├── lib/
│   ├── matching.ts             # MODIFIED — sport eligibility filter, reasonsFor() sport fallback
│   └── matching.test.ts        # MODIFIED — 5 new describe blocks, 1 existing block refocused
└── pages/
    ├── Results.tsx              # MODIFIED — true-empty-catalog branch (new copy + action), persistent "change answers" action
    └── SportMatch.tsx           # MODIFIED — reads location.state.startAt to enter at the sport question

docs/
├── matching-engine.md          # MODIFIED — sport-as-hard-gate clarification, rewritten no-match section
├── microcopy.md                # MODIFIED — new empty-state copy, sport reason template, new action copy
├── ux-flows.md                 # MODIFIED — Flow 3's no-results trigger/actions narrowed
├── component-library.md        # MODIFIED — EmptyMatchState props/copy flagged and narrowed
└── api-contracts.md            # MODIFIED (optional, recommended) — explicit sport-exclusion rule
```

**Structure Decision**: no new files, no new directories — this is a targeted bug fix within the existing `lib`/`pages` split established since `001`. Doc updates follow the same living-doc discipline as every prior feature.

## Complexity Tracking

*No entries — no Constitution Check violations requiring justification.*
