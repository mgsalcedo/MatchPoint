# Data Model: Data Foundation (Phase 1)

Physical schema is authoritative in `docs/database-schema.md` — this file does **not** restate every column. It records (a) which entities this feature reads, (b) the DB-row → app-`Organization` mapping that is the feature's testable core, and (c) the decisions from research.md that shape the mapping.

## Entities created vs. read this milestone

All 14 tables from `docs/database-schema.md` are **created** (schema parity, FR-006). Only these are **read**:

| Entity | Read? | Role in this feature |
|---|---|---|
| `districts` | ✅ read | location filter + venue's district name |
| `sports` | ✅ read | sport filter (by `slug`) + org's sport list |
| `organizations` | ✅ read | the core discoverable record |
| `organization_sports` | ✅ read | join: which sports an org offers (primary flag) |
| `venues` | ✅ read | org's district(s) come from here (`venues.district_id`) |
| `schedules` | ✅ read | org's training sessions (day/time/level) |
| `organization_adn` | ✅ read | environment/level signal (ADN Deportivo™) |
| `users`, `match_sessions`, `match_results`, `leads`, `profile_claims` | created, **not read/written** | schema parity only; exercised by later milestones. `leads` has **no `status` column** (immutable-Lead rule). |

## Visibility rules (RLS + query)

- Public anon `SELECT` allowed on the 7 read entities, **only** for organizations where `is_active = true AND profile_status NOT IN ('suspended','archived','rejected')` (research.md R2). Child tables (`organization_sports`, `venues`, `schedules`, `organization_adn`) inherit visibility through their parent org.
- `leads` insert restricted to `authenticated` (`user_id = auth.uid()`); not exercised this milestone but defined now (FR-008).
- `users`/`match_sessions`/`match_results`/`profile_claims`: RLS enabled, no policy = deny-all (correct; nothing touches them yet).
- **FR-005 minimum-launch-dataset eligibility** (org must have name/sport/district-or-venue/contact/schedule/level/environment/short-description to be discoverable) is a **data-completeness filter in the access layer**, not an RLS policy — RLS is the security boundary; FR-005 is recommendation-quality.

## The mapping: Supabase row → app `Organization`

Target type is the existing `app/src/types.ts` `Organization` (FR-011/SC-006 — do not invent a new shape). Mapping lives in `app/src/lib/data/mappers.ts` as **pure functions** (no Supabase import → unit-testable with fixtures).

| app `Organization` field | Source | Mapping notes |
|---|---|---|
| `id`, `name` | `organizations.id`, `.name` | direct |
| `type` | `organizations.organization_type` | enum lookup table; `OrgType` extended with `"federation"`,`"gym"` (research.md R1) |
| `sports[]` | `organization_sports → sports.slug` | slug→`Sport` lookup (`trail-running→trail`, `centro-entrenamiento→centro_entrenamiento`) |
| `description` | `organizations.description ?? short_description ?? ''` | |
| `districts[]` | dedupe of `venues[].district.name` | **org has no district column** — derived from venues (research.md R6) |
| `schedules[]` | `schedules[]` | `day_of_week`(int, 1=Mon ISO, research.md R3)→`Weekday`; `user_level`→`Level` |
| `priceRange` | — (no column) | fixed `"no_confirmado"` (research.md R5) |
| `trialClassAvailable` | — (no column) | fixed `false` (research.md R5) |
| `whatsapp`,`instagram`,`bookingLink`,`website` | `whatsapp_number`,`instagram_url`,`booking_url`,`website_url` | `?? undefined`. `website` added during implementation (research.md R8) — a real schema/mock gap the original cross-check missed. |
| `adnDeportivo` | `organization_adn` | map 1-5 scales + environments |
| `services[]` | — (no column) | fixed `[]` (research.md R5) |
| `coach` | — (no column) | `undefined` (research.md R5; Coach not table-backed yet) |
| `profileStatus` | `organizations.profile_status` | enum lookup (`rejected` never reaches here — filtered out) |

## Enum translation tables (centralized in `mappers.ts`)

- `organization_type` (13) → `OrgType` (11 after R1 extension)
- `sports.slug` (kebab) → `Sport` (underscore/none)
- `user_level` → `Level` (`never_practiced→nunca_practique`, etc.)
- `profile_status` → app `profileStatus` (5 values; `rejected` excluded upstream)
- `day_of_week` int → `Weekday` (1=Mon … 7=Sun)

## Seed shape (per FR-002, research.md R6/R7)

`002_organizations.sql` (gated): ≥10 orgs; all 6 sports covered (≥1 each; a triathlon club can cover triatlón/natación/ciclismo/running via multiple `organization_sports` rows); multiple districts incl. ≥1 with a Callao venue; each org meets the full minimum-launch-dataset (no partial rows seeded).
