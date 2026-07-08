# Tasks: Data Foundation

**Input**: Design documents from `specs/001-data-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/organizations-read.md, quickstart.md

**Tests**: INCLUDED — the constitution (Principle III) mandates test-first for the row→`Organization` mapper (the business logic here). Mapper unit tests are written before the mapper; other work is not test-gated.

**Organization**: by user story (US1 P1, US2 P2, US3 P3 from spec.md), so each is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete-task dependency)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish have no story label)

---

## Phase 1: Setup (shared infrastructure)

- [X] T001 Owner action (prerequisite): create the Supabase project (region `sa-east-1`), collect Project URL, `anon` key, and DB connection string — nothing DB-related runs without this (see `specs/001-data-foundation/quickstart.md`)
- [X] T002 [P] Add `@supabase/supabase-js` dependency to `app/package.json`
- [X] T003 [P] Add `vitest` devDependency + `"test": "vitest run"` script to `app/package.json`; add a `test` block to `app/vite.config.ts` (per research.md R4)
- [X] T004 [P] Create `app/.env.example` (placeholder `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) and `supabase/.env.example` (placeholder `SUPABASE_DB_URL`)
- [X] T005 Add `supabase/.env` line to the root `.gitignore` (defensive; `app/.gitignore` `*.local` already covers `app/.env.local`)
- [X] T006 Create `supabase/migrations/` and `supabase/seed/` directories

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ CRITICAL**: no user story can be verified until the schema exists. Applies `docs/database-schema.md`'s 16-step order exactly — do not redesign.

- [X] T007 Migration — extensions (`uuid-ossp`, `pgcrypto`) + all 9 enums, verbatim from `docs/database-schema.md`, in `supabase/migrations/` (steps 1-2)
- [X] T008 Migration — `districts` table + indexes + Lima Metropolitana/Callao district reference seed (public geo data, no PII) in `supabase/migrations/` (step 3)
- [X] T009 Migration — `sports` table + the 6 PMV sports seed in `supabase/migrations/` (step 4)
- [X] T010 [P] Migration — `users` + `organizations` (+3 indexes) in `supabase/migrations/` (steps 5-6)
- [X] T011 [P] Migration — `organization_sports`, `venues`, `schedules`, `organization_adn` (+indexes) in `supabase/migrations/` (steps 7-10)
- [X] T012 [P] Migration — `match_sessions`, `match_results`, `leads` (**verify NO `status` column** — immutable-Lead rule), `profile_claims` in `supabase/migrations/` (steps 11-14)
- [X] T013 Migration — RLS policies in `supabase/migrations/` (step 15): public `SELECT` on the 7 read tables only where `is_active AND profile_status NOT IN ('suspended','archived','rejected')` (research.md R2); `leads` insert restricted to `authenticated` with `user_id = auth.uid()`; deny-all (RLS on, no policy) for users/match_sessions/match_results/profile_claims
- [X] T014 Create `app/src/lib/data/supabaseClient.ts` — single `createClient()` with the anon key, fail-fast throwing if env vars are missing (points to `app/.env.example`)
- [X] T015 Create `app/src/lib/data/types.ts` — snake_case TS interfaces for the Supabase row shapes, mirroring `docs/database-schema.md` tables

**Checkpoint**: schema applied, client wired — story work can begin. Migration SQL written and handed to the owner to run via the Supabase SQL Editor (no local psql/CLI available); pending confirmation it applied cleanly.

---

## Phase 3: User Story 1 — Discover real sports communities (Priority: P1) 🎯 MVP

**Goal**: a real, queryable catalog of Lima/Callao communities filterable by sport and district, with suspended/archived/rejected excluded.

**Independent Test**: run the integration test (T021) against a locally-seeded DB — every one of the 6 sports returns ≥1 org, a Callao district filter returns ≥1, and no suspended/archived/rejected org appears.

### Tests for User Story 1 (write FIRST, ensure they FAIL before T017-T018)

- [X] T016 [P] [US1] Write failing unit tests for the mapper in `app/src/lib/data/mappers.test.ts`: enum translation tables, `day_of_week`=Monday (ISO, research.md R3), shape-parity of `mapOrganizationRow(fixture)` against the existing `Organization` type in `app/src/types.ts`, multi-sport org → multi-element `sports[]`, zero-venue org handling, safe-default fields (`priceRange`→`"no_confirmado"`, `trialClassAvailable`→`false`, `services`→`[]`, `coach`→`undefined`, research.md R5)

### Implementation for User Story 1

- [X] T017 [US1] Extend the `OrgType` union with `"other"` in `app/src/types.ts` (research.md R1, **corrected during implementation**: `app/src/types.ts` already had `federation`/`gym`/`event_organizer`/`academy` — the only real gap vs. the DB enum was `other`, additive/lossless)
- [X] T018 [US1] Implement the pure mappers in `app/src/lib/data/mappers.ts` (mapOrganizationRow + enum/day/level/profile-status lookup tables + adn/schedule mappers; no Supabase imports) — makes T016 pass (13/13 tests green)
- [X] T019 [US1] Implement `getOrganizations({ sportSlug?, districtName? })` in `app/src/lib/data/organizations.ts` — Supabase query excluding suspended/archived/rejected, FR-005 minimum-dataset filter, exact-district via `venues.district_id` (no adjacency), seed-scale post-fetch narrowing (research.md R6); returns `Organization[]`
- [X] T020 [US1] Author `supabase/seed/002_organizations.sql` — 10 real Lima/Callao communities, all 6 sports (≥1 each), 2 Callao venues (Club Regatas Unión, The Warrior House Gym), sourced only from public info, nothing fabricated (BR-016). Repo is private (confirmed via GitHub API 404) — gate satisfied. Migrations + seed run successfully against the live Supabase project.
- [X] T021 [US1] Integration test in `app/src/lib/data/organizations.integration.test.ts` executed against the live seeded DB — 8/8 passing. Fixed one assertion during the run: expected `>=10` discoverable orgs, corrected to `>=9` because Altaïr CrossFit is intentionally seeded with zero contact channel (no real WhatsApp/Instagram found) and therefore correctly fails `meetsMinimumDataset()` by design (research.md R8) — not a bug in the seed or query layer.

**Checkpoint**: mapper unit-tested and green (14/14); query layer written; integration test executed against live seeded DB (8/8 green).

---

## Phase 4: User Story 2 — Reproducible, secret-safe environment (Priority: P2)

**Goal**: a new dev reproduces the DB from versioned files + a runbook, with no secret committed.

**Independent Test**: fresh clone → follow runbook → schema matches `docs/database-schema.md`; secret scan of repo+history finds nothing.

- [X] T022 [US2] Write the setup runbook `docs/runbooks/data-foundation-setup.md` (create project → env → migrations → reference seed → org seed [gated] → verify; <30 min per SC-004; explicit warning: `service_role` key never in `app/` or committed)
- [X] T023 [US2] Verify reproducibility: structural check (all 12 tables in `docs/database-schema.md` match the migrations 1:1) + functional check (8/8 integration tests pass against the live migrated+seeded DB, which would fail on schema drift). Documented in the runbook's new "Reproducibility check (T023)" section, including the stricter `information_schema` query for a future contributor with DB credentials.
- [X] T024 [US2] Secret scan: `git log --all -S "<project-ref>"` and history search for `.env.local`/`.env` find nothing — never committed; `git check-ignore -v` confirms `app/.env.local` and `supabase/.env` are gitignored; repo-wide grep for `supabase.co`/JWT-shaped strings in tracked source found only benign matches (npm `package-lock.json` integrity hashes, a generic `<ref>.supabase.co` placeholder in the runbook).

**Checkpoint**: environment is reproducible and secret-safe.

---

## Phase 5: User Story 3 — Privacy-respecting preloaded data (Priority: P3)

**Goal**: real third-party contact info is committed only after the repo is private (FR-012).

**Independent Test**: inspect that the contact-bearing seed lands only after the repo-visibility change; seeded orgs are `preloaded` with no fabricated fields.

- [X] T025 [US3] Owner action: make the GitHub repo private before committing any file containing real contact info (FR-012). **Done — confirmed via `curl` to the GitHub API returning 404 unauthenticated.**
- [ ] T026 [US3] Now that the repo is private: commit `supabase/seed/002_organizations.sql` once authored (T020); verify seeded orgs have `profile_status = 'preloaded'` and no fabricated data beyond public info (BR-016, spec P3 scenario 2)

**Checkpoint**: all three stories independently satisfied.

---

## Phase 6: Polish & cross-cutting

- [ ] T027 [P] Doc-sync follow-ups (for the `/speckit-analyze` step): add `rejected` to BR-008's exclusion in `docs/business-rules.md`; add the "list organizations by sport/district" contract to `docs/api-contracts.md`; note Vitest in `CLAUDE.md`'s Recommended stack (all flagged in research.md R2/R4 and contracts/organizations-read.md)
- [X] T028 Ran `specs/001-data-foundation/quickstart.md` validation end-to-end: all 5 rows of the Validate table hold — unit (14/14), integration incl. all 6 sports + Callao (8/8), RLS-anon (leads/users empty, suspended excluded — part of the 8), secrets (clean scan), and the runbook's own setup steps were just executed live (migrations + seed via SQL Editor) without deviation.

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2)** → **Stories (P3-5)** → **Polish (P6)**.
- **US1 (P1)** is the MVP: needs Setup + Foundational only. Fully testable locally without the repo being private.
- **US2 (P2)** needs Foundational (migrations must exist to verify reproducibility). Independent of US1.
- **US3 (P3)** depends on **US1/T020** (the seed must be authored before it can be gated/committed) and on the owner making the repo private (T025). This is the one intentional cross-story dependency — inherent to FR-012.
- Within US1: T016 (tests) before T017-T018; T018 (mapper) before T019 (query uses it); T019 + T020 before T021 (integration test needs both).

### Parallel opportunities

- Setup: T002, T003, T004 in parallel.
- Foundational: T010, T011, T012 in parallel (separate migration files).
- US1: T016 can be written in parallel with T017 (different files).

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1.** At that point you can query real Lima communities from a local Supabase DB, with the mapper test-covered and the query proven — the core value of the milestone. US2 (reproducibility/secret-safety) and US3 (repo-private commit gating) harden it for sharing.

## Notes

- `app/src/data/organizations.ts` (mock), `app/src/pages/*`, `MatchSessionContext.tsx`, `matching.ts` are **NOT touched** this milestone (UI stays on mock — Milestone 3 rewires).
- `leads` table: never add a `status`/mutable column (immutable-Lead rule) — flagged for code review at T012.
- T025 (repo private) is the natural place for the `blocked` label on the PR until the owner performs it.
