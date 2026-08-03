# Data Model: Analytics & Funnel Measurement

Phase 1 output for `/speckit-plan`. One new entity; no changes to any existing entity.

## AnalyticsEvent (new)

Represents a single occurrence of one of BR-027's funnel steps (spec.md's Key Entities section calls this "Funnel Event" — same concept; `docs/data-model.md` will use "AnalyticsEvent" to match the already-shipped `app/src/lib/analytics.ts` module name).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid, PK | DB-generated (`gen_random_uuid()`) — nothing ever reads it back, unlike `leads`/`match_results`, which needed client-generated ids for a downstream reference. |
| `visit_id` | uuid, not null | Client-generated per browser-tab visit (`lib/visitId.ts`, R2/R3). Correlates one visitor's events across the funnel, including across the OAuth redirect round-trip. Deliberately **not** `MatchSession.anonymous_id` (R2/R3). |
| `user_id` | uuid, nullable | No FK (R5). Null for anonymous writes and any pre-login event. |
| `event_name` | enum, not null | One of the 11 currently-defined `AnalyticsEvent["name"]` values (BR-027's 9, plus 2 pre-existing extras — `no_match_viewed`, `login_started` — kept for diagnostic value). |
| `sport` | text, nullable | Raw app-level `Sport` value; district-level precision only (`docs/security-standards.md`). |
| `district` | text, nullable | Raw district name; district-level precision only. |
| `match_session_id` | uuid, nullable | No FK (R5). |
| `result_count` | integer, nullable | |
| `organization_id` | uuid, nullable | No FK (R5). |
| `contact_type` | enum (`contact_type`), nullable | Reuses the existing `contact_type` enum type — no parallel vocabulary. |
| `result_rank` | integer, nullable | |
| `lead_id` | uuid, nullable | No FK (R5). |
| `login_provider` | text, nullable | `"google" \| "apple"`, matching `users.auth_provider`'s own plain-text convention. |
| `created_at` | timestamptz, not null | Default `now()`. |

**Rules**:
- Written on every tracked funnel action, from an anonymous OR logged-in client (FR-004).
- Never blocks or fails visibly to the user if the write fails (FR-005) — see R7.
- No raw free text, no precise location, no PII beyond an optional `user_id` (FR-006).
- **Deliberately has no enforced foreign keys** to `User`/`Organization`/`MatchSession`/`Lead` (R5) — it is best-effort telemetry, not a referentially-integral record. For this reason it is excluded from `docs/data-model.md`'s ER diagram (not because it's deferred/unbuilt, unlike `Event`/`Coach` — it simply has no relationships to draw).
- No SELECT policy for any client role (`anon` or `authenticated`) — the product owner queries this table directly via the Supabase SQL Editor (admin/service-role context, bypasses RLS), per this feature's "no dashboard UI" decision.

## Relationship to existing entities

None enforced at the database level (R5). Logical, query-time-only correlation:
- `visit_id` ties one visitor's rows together across their whole visit (including anonymous → logged-in transitions).
- `match_session_id`, `organization_id`, `lead_id`, `user_id` are optional cross-references usable in SQL joins (e.g. for the profile→contact CTR query, R10) but carry no referential-integrity guarantee.

## State transitions

None — `AnalyticsEvent` rows are immutable, append-only, single-event records (no `status` field, no update path), the same discipline already established for `Lead`.
