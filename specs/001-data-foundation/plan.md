# Implementation Plan: Data Foundation

**Branch**: `001-data-foundation` | **Date**: 2026-07-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-data-foundation/spec.md`

**Backend architecture plan**: `.claude/doc/matchpoint-data-foundation/backend.md` (produced by the `backend-architect` agent; this plan synthesizes it — see it for full SQL/RLS/mapper detail).

## Summary

Stand up MatchPoint's real persistence layer: a Supabase PostgreSQL database matching `docs/database-schema.md` exactly, seeded with 10+ real Lima/Callao sports communities (all 6 PMV sports, incl. Callao coverage), exposed through a tested, framework-isolated data-access layer that returns organizations by sport and district in the app's existing `Organization` shape. Scope stops at the database + the data-access layer; the app keeps reading mock data this milestone (UI swap is Milestone 3). Real third-party contact info in the seed is gated behind making the repo private first.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Node (Vite 8 toolchain) — existing `/app`. SQL (PostgreSQL 15, Supabase-managed) for schema/seed.

**Primary Dependencies**: `@supabase/supabase-js` (NEW — to add to `app/package.json`); Supabase CLI (dev tooling, migrations/seed); Vitest (NEW devDependency — recommended test runner, see research.md R4).

**Storage**: Supabase PostgreSQL, schema per `docs/database-schema.md` (locked by constitution).

**Testing**: Vitest (new). Pure mapper functions unit-tested test-first (fixtures, no DB); data-access query verified by an integration test against a seeded DB.

**Target Platform**: PWA (browser), Vite build. DB is Supabase-hosted (region `sa-east-1`/São Paulo — nearest to Peru, latency-acceptable for PMV).

**Project Type**: Web application (existing SPA frontend in `/app` + a hosted Postgres backend via Supabase; no custom API server this milestone — the data-access layer calls Supabase directly with the anon key under RLS).

**Performance Goals**: Seed-scale (tens of records) — filtering by sport/district returns with no perceptible delay (SC-002). No index/scale tuning needed beyond the indexes already in `docs/database-schema.md`.

**Constraints**: No secret committed (FR-009); anon key only in client, `service_role` never in `app/`; real contact seed gated behind repo-private (FR-012); `leads` table has no `status` column (immutable-Lead rule); no UI rewire this milestone (out of scope).

**Scale/Scope**: 10+ organizations, ~15-20 districts, 6 sports; ~14 tables created (schema parity, FR-006) but only 7 read this milestone.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. No login before value | ✅ PASS | Read path is anonymous (public RLS read); no login introduced. |
| II. Sport Match™ first / centralize matching | ✅ PASS | This is the data layer *under* matching; plan explicitly forbids leaking `matching.ts`'s `ADJACENT_DISTRICTS` adjacency into the discovery query (backend.md §4.3). No scoring logic added. |
| III. Test-first for business logic | ✅ PASS | Pure row→`Organization` mapper is the business logic here and is unit-tested test-first (research.md R4, backend.md §5). Vitest introduced to enable it. |
| IV. Contact/Lead North Star | ✅ PASS | `leads` table created with NO status column (FR-007); no lead writes this milestone; RLS insert policy defined but not exercised. |
| V. PMV scope discipline | ✅ PASS | Scope explicitly bounded to DB + data-access layer; UI rewire, matching, auth, lead writes all deferred. No feature/table beyond `docs/database-schema.md` added (no `coaches`/`events`). |
| VI. Trust & safety | ✅ PASS (with a hard prerequisite) | Only reads already-public org data anonymously; no precise user location involved. Real contact seed is gated behind repo-private (FR-012) — a blocking prerequisite before the org-seed step, not a violation. |

**Result**: PASS. No violations → Complexity Tracking below is empty. One operational prerequisite (repo must be private before the contact-bearing seed lands) is tracked as a gated implementation step, not a constitutional exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-data-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions resolving the 6 open questions
├── data-model.md        # Phase 1 — entities read + the row→Organization mapping
├── quickstart.md        # Phase 1 — setup + validation runbook (condensed)
├── contracts/
│   └── organizations-read.md   # the getOrganizations() data-access contract
└── tasks.md             # (created later by /speckit-tasks)
```

### Source Code (repository root)

```text
supabase/                         # NEW — DB as code
├── migrations/                   # 15 SQL files, one per docs/database-schema.md step 1-15
│   └── *.sql
├── seed/
│   ├── 001_reference_data.sql    # districts + 6 sports (public-safe, no PII)
│   └── 002_organizations.sql     # 10+ real orgs (GATED: repo must be private first)
└── .env.example                  # placeholder SUPABASE_DB_URL (real .env gitignored)

app/
├── .env.example                  # NEW — placeholder VITE_SUPABASE_URL / _ANON_KEY
├── .env.local                    # (gitignored via *.local) real values
├── package.json                  # CHANGED — add @supabase/supabase-js, vitest, "test" script
└── src/
    ├── lib/data/                 # NEW — the data-access layer
    │   ├── supabaseClient.ts     # single anon-key client
    │   ├── organizations.ts      # getOrganizations({sportSlug?, districtName?})
    │   ├── mappers.ts            # pure row→Organization (no I/O, unit-tested)
    │   ├── mappers.test.ts       # test-first unit tests
    │   ├── types.ts              # Supabase row shapes (snake_case)
    │   └── organizations.integration.test.ts  # against seeded DB
    ├── data/organizations.ts     # UNCHANGED — mock stays; UI reads it this milestone
    ├── types.ts                  # CHANGED only if OrgType extended (research.md R1)
    └── pages/*, context/*, lib/matching.ts  # UNCHANGED (no rewire — Milestone 3)

docs/runbooks/
└── data-foundation-setup.md      # NEW — <30-min setup runbook (SC-004)
```

**Structure Decision**: Web-application layout. The frontend already exists in `/app`; this milestone adds a `supabase/` "database-as-code" directory (migrations + seed, Supabase CLI convention) and a `app/src/lib/data/` access layer. No custom backend/API server is introduced — the client calls Supabase directly under RLS with the publishable anon key, which is the intended Supabase model. A dedicated API layer is deferred until a milestone genuinely needs server-side logic.

## Complexity Tracking

> No Constitution Check violations — this section is intentionally empty.
