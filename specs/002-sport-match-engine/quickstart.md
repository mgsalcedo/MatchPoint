# Quickstart: Sport Match™ Engine — setup & validation

Assumes 001-data-foundation's environment is already set up (`app/.env.local` configured, migrations 0001-0008 applied, org seed run — see `docs/runbooks/data-foundation-setup.md`). This feature adds one more migration and no new environment variables.

## Setup

1. **Apply migration `0009`** (anon insert policies for `match_sessions`/`match_results`) via the Supabase SQL Editor, same process as prior migrations.
2. **Install deps**: none new — `crypto.randomUUID()` is a Web Crypto API built into evergreen browsers and Node ≥19, no package added.
3. `npm install && npm run dev` in `app/` (unchanged from 001-data-foundation).

## Validate (proves the feature works)

| Check | Command / action | Expected | Proves |
|---|---|---|---|
| Unit — matching bug fix | `npm test` (Vitest) in `app/` | `matching.test.ts`'s NaN-regression test fails before the `levelFit()` fix, passes after | FR-004, constitution Principle III |
| Unit — session mappers | `npm test` | `sessionMappers.test.ts`: every vocabulary table round-trips; `buildMatchResultRows` ranks 1-based in input order | data-model.md |
| Integration — anon write | `RUN_INTEGRATION=1 npx vitest run src/lib/data/matchSessions.integration.test.ts` (needs migration 0009 applied) | Anon insert of session+results succeeds; anon `select()` afterward returns `[]` for both tables; non-null `user_id` insert is rejected | FR-006, FR-001, SC-005 |
| End-to-end — real match | In the running app: complete Sport Match™ with answers likely to match a real seeded org (e.g. running, San Isidro) | Results screen shows real organizations (not the old mock set); a new row exists in `match_sessions` and `match_results` (check via Supabase Table Editor — read access is admin-only via the dashboard, not the app) | User Story 1, SC-001, SC-002 |
| End-to-end — no match | Complete Sport Match™ with an unlikely combination (e.g. a sport/district pairing far from all seeded venues) | Existing "no strong results" screen appears, no broken/empty state | User Story 2, SC-003 |
| Analytics | Run the dev-mode console tracker (default `analytics.ts` sink logs to console) | `sport_match_completed` logs once per completed session (per research.md R6's default: only when persisted); `results_viewed` logs once per results-screen mount (per R7's default: only when there are results) | FR-007, FR-008, SC-004 |

## Out of scope (do not do this feature)

- Auth gate, Google/Apple login, Lead creation (Milestone 5).
- Any change to the organization profile page beyond repointing its lookup at session results instead of the mock array.
- Any change to the questionnaire's questions or the matching algorithm's weights/formula.
- A real third-party analytics provider integration (the `track()`/`setTracker()` pair is the extension point; wiring PostHog/GA4/etc. is a separate, later decision).
