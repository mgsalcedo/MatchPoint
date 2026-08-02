# Implementation Plan: Sport Match™ Engine (real sessions & matching)

**Branch**: `002-sport-match-engine` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-sport-match-engine/spec.md`

## Summary

Replace the Sport Match™ flow's mock-only behavior with the real thing: an anonymous user completes the already-built questionnaire, the app fetches the real organization catalog (`getOrganizations()`, 001-data-foundation), the existing `matching.ts` scoring algorithm ranks it (after fixing a real `NaN` bug in `levelFit()` that mock data was masking), a `match_sessions` row and up to 5 `match_results` rows get persisted anonymously to Supabase, and the results screen renders exactly as it does today — now backed by real data. Two new events (`sport_match_completed`, `results_viewed`) make the funnel measurable for the first time. No UI redesign, no auth, no Lead creation — this is a data-source-and-persistence swap under an unchanged UI, per the spec's explicit scope boundary.

## Technical Context

**Language/Version**: TypeScript (existing `app/` toolchain), React 19, Vite

**Primary Dependencies**: `@supabase/supabase-js` (already a dependency, no new package). `crypto.randomUUID()` (Web Crypto API, built into evergreen browsers/Node ≥19 — no new dependency).

**Storage**: Supabase PostgreSQL — same project as 001-data-foundation; one new migration (`0009`, RLS policies only, no schema/column change).

**Testing**: Vitest — unit tests (mapper/matching-logic, no DB) run by default `npm test`; integration tests (`*.integration.test.ts`, live DB) run explicitly via `RUN_INTEGRATION=1`, following the pattern already established in 001-data-foundation.

**Target Platform**: Web (mobile-first PWA), evergreen browsers.

**Project Type**: Single existing web app (`/app`) — no new project/package created.

**Performance Goals**: No new performance target. Matching stays entirely client-side against the full active catalog (no server-side pre-filter) — acceptable at current PMV scale (9-50 seeded organizations, per 001-data-foundation's integration test); revisit only if the catalog grows enough to make that a measurable cost (research.md R3).

**Constraints**: Anonymous-only database writes (no login anywhere in this feature, constitution Principle I); `anon` key only, `service_role` never used in app code; `matching.ts` must remain free of Supabase/network imports so it stays unit-testable without a database (constitution Principle III).

**Scale/Scope**: 9 new files, 6 modified files (see backend plan `.claude/doc/sport-match-engine/backend.md` §9 for the full checklist); one feature branch, no new top-level project.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still passes, no violations.*

| Principle | Status | Notes |
|---|---|---|
| I. No Login Before Value (NON-NEGOTIABLE) | ✅ PASS | Every write in this feature is anonymous (`anon` role, `user_id` forced null by RLS). No auth gate touched. |
| II. Sport Match™ First — centralized matching | ✅ PASS | `matching.ts` remains the single scoring module; only its `levelFit()` bug is fixed, no scoring logic duplicated elsewhere (e.g. not reimplemented in the write layer). |
| III. Test-First for Business Logic (NON-NEGOTIABLE) | ⚠️ GATE — enforced in tasks.md | `matching.ts` has **zero tests today** (allowed under the mock-shell exception, which no longer applies once this feature makes it real). `matching.test.ts`'s regression test for the `levelFit()` bug MUST be written and observed failing before the fix lands (tasks.md phase ordering enforces this). `sessionMappers.test.ts` also written test-first for its enum tables. |
| IV. Contact/Lead Is the North Star | ✅ PASS (not applicable) | Zero references to `leads`/Lead creation anywhere in this feature — confirmed by the backend plan. Lead creation stays Milestone 5. |
| V. PMV Scope Discipline | ✅ PASS | No new abstraction beyond the established data-access pattern; analytics utility is a ~20-line pluggable `track()` function, not an SDK; no speculative SELECT policy; no UI redesign. |
| VI. Trust & Safety | N/A — not triggered | Doesn't touch auth, location precision, contact-info visibility, or moderation. Per the constitution's own conditional wording, `security-privacy-auditor`/`trust-safety-review` are not required gates for this specific feature (they will be for Milestone 5's Lead/contact flow). |

No violations — Complexity Tracking table below is empty by design.

## Project Structure

### Documentation (this feature)

```text
specs/002-sport-match-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output — R1-R8, incl. 2 owner-flagged analytics decisions
├── data-model.md         # Phase 1 output — match_sessions/match_results write mapping
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── match-session-write.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

Existing single Vite app (`/app`) — no new project or package. Additive files under the established `app/src/lib/data/` data-access layer from 001-data-foundation, plus targeted edits to existing UI/context files:

```text
supabase/
└── migrations/
    └── 0009_match_session_results_anon_insert.sql   # NEW — RLS only, no schema change

app/src/
├── lib/
│   ├── matching.ts                # MODIFIED — levelFit() bug fix only
│   ├── matching.test.ts           # NEW — test-first, regression + baseline cases
│   ├── analytics.ts               # NEW — minimal track()/setTracker() pair
│   └── data/
│       ├── supabaseClient.ts      # unchanged
│       ├── organizations.ts       # unchanged — reused as-is, unscoped (research.md R3)
│       ├── mappers.ts             # MODIFIED — 3 reverse (app→DB) lookups added
│       ├── types.ts               # MODIFIED — 4 new DB enum types added
│       ├── sports.ts               # NEW — getSportId(slug)
│       ├── districts.ts            # NEW — getDistrictId(name)
│       ├── sessionMappers.ts       # NEW — answers/results → DB row builders
│       ├── sessionMappers.test.ts  # NEW
│       ├── matchSessions.ts        # NEW — createMatchSession() write function
│       └── matchSessions.integration.test.ts  # NEW
├── context/
│   └── MatchSessionContext.tsx    # MODIFIED — async finalizeMatch(), matchSessionPersisted state
└── pages/
    ├── SportMatch.tsx             # MODIFIED — await finalizeMatch() instead of setTimeout
    └── Results.tsx                 # MODIFIED — mount-effect fires results_viewed
```

**Structure Decision**: continues the existing single-app structure unchanged (no frontend/backend split, no new package) — this feature only adds to `app/src/lib/data/` (the data-access layer 001-data-foundation established) and wires two existing UI files to it. `app/src/data/organizations.ts` (the mock array) and its `DISTRICTS` export are explicitly **not deleted** — still used by the questionnaire's district-picker UI, which is out of scope here.

## Complexity Tracking

*No entries — Constitution Check has no violations to justify.*
