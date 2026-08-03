# Implementation Plan: Analytics & Funnel Measurement

**Branch**: `005-analytics-funnel` | **Date**: 2026-08-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-analytics-funnel/spec.md`

## Summary

Close the two real gaps in the PMV funnel's measurability (Milestone 6, `docs/roadmap.md`): 4 of BR-027's 9 required events are not tracked at all (`app_opened`, `match_started`, `profile_opened`, `contact_clicked`), and none of the 7 already-tracked events are durably stored — `track()`'s default sink is `console.info`-only. This feature adds the 4 missing `AnalyticsEvent` variants, a new `analytics_events` Supabase table (RLS-gated for both `anon` and `authenticated` inserts, no client-side SELECT), a Supabase-backed `setTracker()` sink that never blocks or fails visibly to the user, and a new client-generated `visit_id` (sessionStorage-backed) to correlate one visitor's funnel across the anonymous→logged-in transition. No dashboard UI — the deliverable for computing weekly funnel metrics is a documented SQL queries file the product owner runs manually.

## Technical Context

**Language/Version**: TypeScript (React 19, Vite) — unchanged, matches `app/` throughout.

**Primary Dependencies**: `@supabase/supabase-js` (already in place) — no new dependency.

**Storage**: Supabase PostgreSQL, one new table (`analytics_events`, migration `0012`).

**Testing**: Vitest — unit tests for the 2 new pure modules (`analyticsEventMappers.ts`, `visitId.ts`); one new live-DB integration test (`analyticsEvents.integration.test.ts`) for the `anon`-role write path, following `002`'s established `matchSessions.integration.test.ts` pattern.

**Target Platform**: Same as the rest of `/app` — PWA, mobile-first web.

**Project Type**: Single project (`/app` frontend + Supabase backend) — same structure as 001–004, no new option needed.

**Performance Goals**: N/A — this feature does not introduce a new user-facing latency budget; writes are fire-and-forget and must never be perceptible to the user (FR-005).

**Constraints**: Every event write must never block, delay, or visibly fail any user-facing action (FR-005); every payload must stay on the existing PII/location allow-list (FR-006, `docs/security-standards.md`).

**Scale/Scope**: PMV/Lima-only scale — no rate limiting or retention policy required this milestone (research.md R12, explicitly flagged and deferred, not solved).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. No Login Before Value** — ✅ Pass. All 4 new events fire regardless of login state; none gate any part of the funnel behind auth. `anon`-role writes are first-class (FR-004), not an afterthought.
- **II. Sport Match™ First** — ✅ Pass / N/A. No change to matching/ranking logic; `geo-matching-review` is not required (research.md §1 of the backend plan).
- **III. Test-First for Business Logic** — ✅ Pass. This feature is not matching/ranking/lead-eligibility logic, so the NON-NEGOTIABLE gate doesn't strictly apply — but the two new pure modules (`analyticsEventMappers.ts`, `visitId.ts`) still get tests-first, consistent with this project's established practice for every prior pure data-mapping module (`sessionMappers.ts`, `leadMappers.ts`).
- **IV. Contact/Lead Is the North Star** — ✅ Pass. This feature makes the North Star *measurable*, and explicitly does not touch `Lead`'s immutability — `AnalyticsEvent` is a separate, equally-immutable, append-only entity with no `status`/mutable field (data-model.md). The write path is also designed so it can never delay or interfere with the actual `createLead`/external-redirect ordering guarantee (R7 — fire-and-forget, never blocking).
- **V. PMV Scope Discipline** — ✅ Pass. No dashboard UI, no new admin surface, no third-party tool — all explicitly confirmed by the owner before this spec was written and re-confirmed by the backend plan (§1, "what this plan does NOT touch").
- **VI. Trust & Safety** — ⚠️ Judgment call, not a clean auto-trigger. This doesn't literally hit `docs/security-standards.md`'s auto-trigger list (no new contact-info exposure, no new auth mechanism) — but it does newly aggregate `user_id` + district + organization at a durability/volume the project hasn't had before. **Decision**: run `trust-safety-review` before merge as a precaution (research.md R12), even though it's not a hard constitutional requirement here the way it was for `004`.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/005-analytics-funnel/
├── plan.md              # This file
├── research.md          # Phase 0 output (R1-R13)
├── data-model.md         # Phase 1 output (AnalyticsEvent)
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── analytics-event.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

Single project — extends the existing `/app` structure from 001–004, no new top-level directories.

```text
app/src/
├── lib/
│   ├── analytics.ts                       # MODIFIED — 4 new AnalyticsEvent union members
│   ├── visitId.ts                         # NEW — getOrCreateVisitId()
│   ├── visitId.test.ts                    # NEW
│   └── data/
│       ├── analyticsEventMappers.ts       # NEW — buildAnalyticsEventRow() (pure)
│       ├── analyticsEventMappers.test.ts  # NEW
│       ├── analyticsEvents.ts             # NEW — installSupabaseAnalyticsSink()
│       └── analyticsEvents.integration.test.ts  # NEW — anon-role live-DB test
├── App.tsx                                # MODIFIED — app_opened mount effect
├── main.tsx                               # MODIFIED — installSupabaseAnalyticsSink() before render()
└── pages/
    ├── SportMatch.tsx                     # MODIFIED — match_started mount effect
    └── OrganizationProfile.tsx            # MODIFIED — profile_opened mount effect, contact_clicked in handleContact

supabase/migrations/
└── 0012_analytics_events.sql              # NEW

docs/
├── data-model.md                          # MODIFIED — new AnalyticsEvent section
├── database-schema.md                     # MODIFIED — new table, RLS bullet, migration-order entry
├── api-contracts.md                       # MODIFIED — short implementation note
└── analytics-queries.md                   # NEW — documented SQL for weekly funnel metrics (User Story 3 deliverable)
```

**Structure Decision**: same single-project layout as 001–004 (`/app` frontend, `/supabase/migrations`, `/docs`) — no new project type introduced. New files follow the existing `lib/`, `lib/data/` split (pure logic vs. Supabase I/O) established since `002`.

## Complexity Tracking

*No entries — no Constitution Check violations requiring justification.*
