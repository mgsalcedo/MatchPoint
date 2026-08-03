# Contract: Analytics event write

No REST endpoint — implemented as a direct Supabase client insert from the browser, same pattern as `002`'s `match_sessions`/`match_results` writes and `004`'s `leads`/`users` writes. Documented here (not `docs/api-contracts.md`) as the interface contract for this feature, per that doc's precedent of noting "implemented as a direct Supabase insert" rather than fabricating an endpoint that was never asked for.

## Client-facing interface

`track(event: AnalyticsEvent): void` — unchanged public signature (`app/src/lib/analytics.ts`). Callers never see the write path; `installSupabaseAnalyticsSink()` (`app/src/lib/data/analyticsEvents.ts`) swaps the default console-only sink for a Supabase-backed one at app bootstrap (`main.tsx`).

**Contract**: `track()` NEVER throws, NEVER returns a rejected promise the caller must handle, and NEVER delays the caller — it is fire-and-forget by design (R7). Any downstream write failure is caught and logged (`console.error`, message-only) but never surfaces to the user or blocks any action.

## `AnalyticsEvent` union (additions this feature)

```ts
| { name: "app_opened" }
| { name: "match_started" }
| { name: "profile_opened"; organizationId: string; resultRank: number | null }
| { name: "contact_clicked"; organizationId: string; contactType: ContactType; resultRank: number | null }
```

(7 existing members — `sport_match_completed`, `results_viewed`, `no_match_viewed`, `login_started`, `login_completed`, `lead_created`, `external_contact_opened` — unchanged.)

## Insert row shape (`analytics_events` table)

```json
{
  "visit_id": "uuid",
  "user_id": "uuid | null",
  "event_name": "app_opened | match_started | sport_match_completed | results_viewed | no_match_viewed | profile_opened | contact_clicked | login_started | login_completed | lead_created | external_contact_opened",
  "sport": "string | null",
  "district": "string | null",
  "match_session_id": "uuid | null",
  "result_count": "integer | null",
  "organization_id": "uuid | null",
  "contact_type": "whatsapp | instagram | booking | call | form | null",
  "result_rank": "integer | null",
  "lead_id": "uuid | null",
  "login_provider": "string | null"
}
```

`visit_id` and `user_id` are resolved by the write layer itself (`getOrCreateVisitId()`, `supabase.auth.getSession()`), never passed by the `track()` caller. All other fields are derived from the specific `AnalyticsEvent` variant by `buildAnalyticsEventRow()` (pure mapper, `analyticsEventMappers.ts`).

## Auth

- `anon` role: INSERT only, `user_id` must be null.
- `authenticated` role: INSERT only, `user_id` must be null or the caller's own `auth.uid()` (never spoofable).
- No SELECT policy for any client role — reads are admin/SQL-Editor-only (bypasses RLS via the Supabase dashboard).

## Rules

- Create the event row asynchronously, detached from the caller (R7) — never awaited by any UI code path.
- Never validate against or block on an unavailable/suspended organization, missing session, etc. — this is telemetry, not a business-rule-enforcing write (contrast with `POST /api/leads`'s contract, which explicitly does enforce those things).
- Preserve the PII/location allow-list already applied to the 7 existing event payloads (R6) for the 4 new ones.
