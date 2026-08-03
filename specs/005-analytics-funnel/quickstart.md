# Quickstart: Analytics & Funnel Measurement — setup & validation

Assumes 001–004's environment is already set up (migrations 0001–0011 applied, org seed run, Google OAuth configured). This feature adds one more migration and no new external prerequisite — no owner action beyond applying the migration.

## Setup

1. **Apply migration `0012_analytics_events.sql`** via the Supabase SQL Editor, same process as prior migrations.
2. `npm install && npm run dev` in `app/` (unchanged — no new dependency).

## Validate (proves the feature works)

| Check | Command / action | Expected | Proves |
|---|---|---|---|
| Unit — analytics event mapper | `npm test` (Vitest) in `app/` | `analyticsEventMappers.test.ts`: every `AnalyticsEvent` variant maps to the correct row shape | R6, contracts/analytics-event.md |
| Unit — visit id | `npm test` | `visitId.test.ts`: `getOrCreateVisitId()` creates once, returns the same value on repeat calls, against a mocked `sessionStorage` | R2/R3 |
| Integration — anon write | `RUN_INTEGRATION=1 npx vitest run src/lib/data/analyticsEvents.integration.test.ts` (live DB, migration 0012 applied) | Anonymous insert succeeds for at least one event; no SELECT policy means the anon client cannot read it back | FR-004, R13 |
| Full funnel walkthrough | In the running app: open `/`, start Sport Match™, complete it, view results, open a profile, click contact, log in, land on contact success | One row per BR-027 step appears in `analytics_events` (Supabase Table Editor), all sharing one `visit_id` | SC-001, User Story 1 |
| Never blocks the user | Same walkthrough, with network throttled/offline briefly during a click | No visible error, no blocked action, no crash — the funnel action itself (e.g. contact click, Lead creation) completes or fails on its own terms, unaffected by analytics | FR-005, SC-004 |
| Weekly metrics | After at least one full walkthrough, run the queries in `docs/analytics-queries.md` (to be authored alongside implementation) in the Supabase SQL Editor | Completion rate, both CTRs, contacts count, and drop-off all return numbers matching what was actually done | User Story 3, SC-003 |

## Out of scope (do not do this feature)

- Any third-party analytics tool (PostHog, GA4, etc.).
- Any dashboard UI or new admin route in the app.
- User-level analytics consent/opt-out controls.
- Retention/archival policy, rate limiting on inserts, or backfilling historical events.
- Retrofitting `match_sessions.anonymous_id`.
