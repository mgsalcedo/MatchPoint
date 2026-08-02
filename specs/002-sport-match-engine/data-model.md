# Data Model: Sport Match™ Engine (Phase 1)

Physical schema is authoritative in `docs/database-schema.md` — both tables this feature writes to (`match_sessions`, `match_results`) already exist, created by 001-data-foundation's migrations and confirmed to have zero drift from the doc (research.md R8). This file records only what this feature reads/writes and the new translation logic that makes that possible.

## Entities read vs. written this milestone

| Entity | Access | Role in this feature |
|---|---|---|
| `organizations` (+ its child tables, via `getOrganizations()`) | read | the real catalog matching runs against — no scoping filter (research.md R3) |
| `sports` | read | resolve `sports.id` from the answer's `Sport` slug, for `match_sessions.sport_id` |
| `districts` | read | resolve `districts.id` from the answer's district name, for `match_sessions.district_id` |
| `match_sessions` | **write** (insert only) | one row per completed questionnaire; anonymous (`user_id` null this milestone) |
| `match_results` | **write** (insert only) | up to 5 rows per session — the already-computed, ranked `MatchResult[]` |

No table's columns change. No new table is created. The only schema-adjacent change is a new RLS migration (research.md R1) granting `anon` insert access to `match_sessions`/`match_results`, which today have RLS enabled with zero policies for any role.

## Visibility rules (RLS)

- `anon` may `INSERT` its own `match_sessions` row, with `user_id` required to be `null` (no impersonation of a real user).
- `anon` may `INSERT` its own `match_results` rows (FK constraints to `match_sessions`/`organizations` already prevent orphaned/invalid rows regardless of RLS).
- **No `SELECT` policy exists for either table.** The client never reads a row back after writing it — matching happens entirely client-side, and the already-computed `MatchResult[]` stays in React state for the results screen. This is a strict superset of FR-006/SC-005, not a narrow satisfaction of it (research.md R1).
- `sports`/`districts` need no RLS change — both already have a public-read policy from 001-data-foundation (`public_read_sports`, `public_read_districts`), which applies to `anon` with no `to` restriction.

## The mapping: app answers/results → Supabase rows

Target tables are `match_sessions`/`match_results` exactly as `docs/database-schema.md` defines them — no new shape invented. Mapping lives in `app/src/lib/data/sessionMappers.ts` as **pure functions** (no Supabase import → unit-testable with fixtures, mirroring `mappers.ts`'s existing discipline).

| DB column | Source | Mapping notes |
|---|---|---|
| `match_sessions.id` | client-generated (`crypto.randomUUID()`) | no DB round-trip needed to get an id back (research.md R1) |
| `match_sessions.user_id` | fixed `null` | anon-only this milestone; RLS enforces this can't be anything else |
| `match_sessions.goal` | `SportMatchAnswers.goal` → `GOAL_MAP` | new vocabulary table, `Goal` → `match_goal` enum |
| `match_sessions.sport_id` | `SportMatchAnswers.sport` → DB slug (`mapSportToSlug`, reverse of `mappers.ts`'s `SPORT_SLUG_MAP`) → `getSportId()` lookup | one DB round-trip per session |
| `match_sessions.district_id` | `SportMatchAnswers.district` → `getDistrictId()` lookup | exact-name match against seeded `districts.name` |
| `match_sessions.available_days` | `SportMatchAnswers.days[]` → `mapWeekdayToDayOfWeek` (reverse of `mappers.ts`'s `DAY_OF_WEEK_MAP`) | ISO Monday=1, same convention as the read side (001-data-foundation research.md R3) |
| `match_sessions.preferred_times` | `SportMatchAnswers.time` → `TIME_OF_DAY_MAP` | single-element `text[]` (column is an array; questionnaire only captures one time-of-day today) |
| `match_sessions.level` | `SportMatchAnswers.level` → `mapLevelToDb` (reverse of `mappers.ts`'s `LEVEL_MAP`) | |
| `match_sessions.budget` | `SportMatchAnswers.budget` → `BUDGET_MAP` | new vocabulary table |
| `match_sessions.environment` | `SportMatchAnswers.environment` → `ENVIRONMENT_MAP` | new vocabulary table |
| `match_results.match_session_id` | the just-generated session id | |
| `match_results.organization_id` | `MatchResult.organization.id` | already a real DB id (from `getOrganizations()`) |
| `match_results.score` | `MatchResult.score` | already 0-100 from `matching.ts`, no conversion |
| `match_results.label` | `MatchResult.label` → `LABEL_MAP` | new vocabulary table, `MatchLabel` → `match_label` enum |
| `match_results.rank` | array index + 1 | 1-based, matches the already-sorted `MatchResult[]` order |
| `match_results.reasons` | `MatchResult.reasons` | stored as `jsonb`, already `string[]` |

## Enum translation tables (new, centralized in `sessionMappers.ts` unless noted)

- `Goal` (7) → `match_goal` (7) — `GOAL_MAP`
- `Budget` (6) → `budget_range` (6) — `BUDGET_MAP` (`no_confirmado` is never sent; it's an app-only "no DB column" default from the read side, not a real user answer)
- `Environment` (6) → `match_environment` (6) — `ENVIRONMENT_MAP`
- `MatchLabel` (5) → `match_label` (5) — `LABEL_MAP`
- `TimeOfDay` (3) → free-form `text` token — `TIME_OF_DAY_MAP` (column has no DB enum; translated anyway for consistency with every other stored vocabulary)
- Reverse of `mappers.ts`'s existing tables (added to `mappers.ts` itself, not `sessionMappers.ts`, to keep one source of truth per vocabulary — research.md R4): `Sport → sports.slug`, `Level → user_level`, `Weekday → day_of_week`

## What this feature does NOT touch

- `leads`, `profile_claims`, `users` — zero references anywhere in this feature (constitution Principle IV; Lead creation is Milestone 5).
- `organization_adn`, `venues`, `schedules` — read-only, already covered by `getOrganizations()`; no new access pattern.
- No column is added to any existing table. No enum gains a new value.
