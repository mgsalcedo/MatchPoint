# Data Model: Real Auth & Lead Creation (Phase 1)

Physical schema is authoritative in `docs/database-schema.md`. Both tables this feature writes to (`users`, `leads`) already exist, created by 001-data-foundation's migrations — no columns change anywhere. This file records only what this feature reads/writes, the RLS gap it closes, and the new translation logic involved.

## Entities read vs. written this milestone

| Entity | Access | Role in this feature |
|---|---|---|
| `users` | **write** (upsert, first real use) | one row per authenticated person, `id` always equal to `auth.uid()` (research.md R2) |
| `leads` | **write** (insert only, first real use) | one row per completed contact action — the North Star event |
| `organizations` | read (new function, extends 001's `organizations.ts`) | single-row re-verification immediately before a Lead insert (FR-013) |
| `sports`, `districts` | read (reused from 002) | resolve `sport_id`/`district_id` for a Lead's optional match context |
| `match_sessions`, `match_results` | write (existing insert path from 002, gains `authenticated`-role access) | a Lead may reference the session/result it came from; the write path itself is unchanged in shape, only who can write to it |

No table's columns change. The only schema-adjacent changes are two new RLS migrations (research.md R3, R4).

## Visibility rules (RLS)

- `authenticated` may `INSERT`/`UPDATE`/`SELECT` only their **own** `users` row (`id = auth.uid()`). No `anon` policy — a `users` row is only ever created after login.
- `authenticated` may `INSERT` their own `leads` (`user_id = auth.uid()`) and `SELECT` their own — **already shipped** in 001-data-foundation (migration 0007); this feature is the first thing that actually exercises it.
- `authenticated` may now also `INSERT` `match_sessions` (`user_id = auth.uid()`, or left null if not logged in) and `match_results` — closing a gap left open since 002 that this feature's session-persistence work newly exposes (research.md R4).
- `leads` has no `UPDATE`/`DELETE` policy for any role, ever — this is the enforcement mechanism behind Lead immutability (constitution Principle IV), not just a convention.

## The mapping: real auth session + pending contact → Supabase rows

### `users` (upsert on every login/session-restore)

| DB column | Source | Mapping notes |
|---|---|---|
| `id` | Supabase Auth session's `user.id` | MUST equal `auth.uid()` (research.md R2) — never the column's own default |
| `auth_provider` | `user.app_metadata.provider` (fallback: first identity's provider) | `"google"` this milestone (research.md R1) |
| `auth_provider_id` | first identity's `.id` (fallback: `user.id`) | |
| `name` | `user.user_metadata.full_name` ?? `.name` ?? null | best-effort fallback chain, unverified against a real payload until R1's credentials exist (research.md R5) |
| `email` | `user.email` ?? null | `unique(email)` permits multiple nulls |
| `avatar_url` | `user.user_metadata.avatar_url` ?? `.picture` ?? null | same best-effort caveat as `name` |

### `leads` (insert on completed contact)

| DB column | Source | Mapping notes |
|---|---|---|
| `id` | client-generated (`crypto.randomUUID()`) | same pattern as `match_sessions.id`/`match_results.id` |
| `user_id` | the authenticated user's id | never null — a Lead cannot exist without a real logged-in user |
| `organization_id` | the organization being contacted | re-verified contactable immediately before insert (FR-013, research.md R12) |
| `match_session_id` | `pendingContact.matchSessionId`, only if that session was actually persisted | null if the originating session write failed — never references a non-existent row |
| `match_result_id` | `pendingContact.matchResultId` | null unless the specific result row was persisted (research.md R8) — new capability this feature adds |
| `contact_type` | `ContactType` → DB `contact_type` enum | now a direct 1:1 mapping, no translation table (research.md R6) |
| `source` | `LeadSource` → DB `lead_source` enum | newly typed, was untyped `string` (research.md R7) |
| `sport_id`, `district_id` | resolved via 002's existing `getSportId`/`getDistrictId` | failure degrades to null, never blocks the Lead |
| `goal` | app `Goal` → same English token already used for `match_sessions.goal` (`GOAL_MAP`, exported from `sessionMappers.ts`) | one shared vocabulary, not a second copy (research.md §6.1) |
| `result_rank` | `pendingContact.resultRank` | |

## What this feature does NOT touch

- No column added to `users`, `leads`, `organizations`, `match_sessions`, or `match_results`.
- `profile_claims` — untouched (claim flow is V1.1).
- No `status`/mutable field anywhere on `leads` — it remains a single immutable event (constitution Principle IV), enforced by the complete absence of any `UPDATE`/`DELETE` RLS policy on the table, not just by application-code discipline.
- Retroactively linking a previously-anonymous `match_session` to a user after login — explicitly out of scope (spec.md).
