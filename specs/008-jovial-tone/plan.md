# Implementation Plan: Match™ Jovial Tone Recalibration

**Branch**: `008-jovial-tone` | **Date**: 2026-08-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-jovial-tone/spec.md`

## Summary

Implement the "Nivel 2 — Jovial y directo" voice recalibration that the product owner already approved (via a 3-option calibration exercise) and that `docs/match-character.md`/`docs/microcopy.md` already carry as the rewritten source of truth. This is a copy-swap across ~20 hardcoded strings in 7 page components, plus one deliberate small addition: Sport Match™ question helper text, documented since the docs' creation but never rendered (research.md R1) — built as a plain paragraph reusing existing typography, not a new component. Two live strings not previously documented (an org-not-found heading, a lead-save-failure message) were found during research and folded into `docs/microcopy.md` per the spec's own Edge Cases handling, so the doc stays complete. The one hard constraint carried through every string: jovial is a tone on the *situation*, never on the *user* — errors, the true-empty-catalog case, and match-reason text stay literal or light-touch, never jokes.

## Technical Context

**Language/Version**: TypeScript (React 19, Vite) — unchanged.

**Primary Dependencies**: none new — plain JSX string edits and one optional field on an existing local array.

**Storage**: N/A — no persistence-layer change (data-model.md confirms no impact).

**Testing**: no new automated tests. Pure copy content has no business-logic surface for constitution Principle III's test-first mandate to apply to. Verification is the quickstart's manual walkthrough plus a direct re-read of every changed string against `docs/microcopy.md`. Existing suites must stay green as a regression guard (copy changes must not break any test that happens to assert on string content).

**Target Platform**: Same as the rest of `/app`.

**Performance Goals**: N/A.

**Constraints**: FR-002/FR-003/FR-005 — never mock, never blame, never joke on errors/empty-catalog/match-reasons; FR-004 — option labels untouched; FR-006 — no visual, logic, or behavioral-rule changes.

**Scale/Scope**: ~20 strings across 7 files, +1 optional field on 1 local array, 0 new files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. No Login Before Value** — ✅ Pass / N/A. No auth-gate change.
- **II. Sport Match™ First** — ✅ Pass. Question titles stay neutral/scannable by deliberate choice (research.md R2) — the voice change doesn't compromise the questionnaire's clarity or turn it into something to read rather than tap through.
- **III. Test-First for Business Logic** — ✅ Pass / N/A. No business logic touched.
- **IV. Contact/Lead Is the North Star** — ✅ Pass. Contact-flow copy (Login, lead-save-failure, contact success) gets warmer, not more friction; no change to the Lead-creation ordering guarantee.
- **V. PMV Scope Discipline** — ✅ Pass. The one scope addition (helper text) is deliberately small (plain paragraph, existing typography, no new component) and directly serves the feature's own stated goal — not a tangent.
- **VI. Trust & Safety** — ✅ Pass. No auth/location/contact-visibility/moderation surface touched — `trust-safety-review` is not triggered. The feature's own internal guardrail (never mock, never blame) is verified directly against each string during implementation, not via a separate review pass, since it's a copy constraint, not a data-exposure risk.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/008-jovial-tone/
├── plan.md              # This file
├── research.md          # Phase 0 output (R1-R5, full string mapping table)
├── data-model.md        # Phase 1 output (confirms no data-model impact)
├── quickstart.md        # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — no new or changed external interface.

### Source Code (repository root)

No new files.

```text
app/src/pages/
├── Welcome.tsx            # MODIFIED — greeting + body
├── SportMatch.tsx          # MODIFIED — QUESTIONS gains helper field + render, GUIDE_MICROCOPY rewritten, matching-transition heading
├── Results.tsx             # MODIFIED — subheadline only (headline/action already matched)
├── OrganizationProfile.tsx # MODIFIED — org-not-found heading, org-unavailable inline, lead-save-failure inline
├── Login.tsx               # MODIFIED — body only (title already matched)
├── ContactSuccess.tsx      # MODIFIED — headline
└── AuthCallback.tsx        # MODIFIED — org_unavailable, lead_failed, fallback headings/bodies

docs/
├── match-character.md      # Already updated this session (Personality, Voice examples, across-the-flow)
└── microcopy.md            # Already updated this session + this feature adds the 2 previously-undocumented strings and the helper/guide-line reference sections
```

**Structure Decision**: no new files, no structural change — a targeted string-and-one-optional-field pass within the existing `pages/` layout established since `001`.

## Complexity Tracking

*No entries — no Constitution Check violations requiring justification.*
