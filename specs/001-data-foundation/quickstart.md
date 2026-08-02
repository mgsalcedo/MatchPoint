# Quickstart: Data Foundation — setup & validation

Condensed run/validation guide. Full step detail (with time estimates) becomes `docs/runbooks/data-foundation-setup.md` during implementation. Target: a new developer reproduces the environment in under 30 minutes (SC-004).

## Prerequisites

- A Supabase account (the human owner creates the project — cannot be automated).
- Supabase CLI installed.
- Node + the existing `/app` dependencies installed (`npm install` in `app/`).

## Setup

1. **Create the Supabase project** (owner) — region `sa-east-1` (São Paulo, nearest to Peru). Collect: Project URL, `anon` public key, DB connection string.
2. **Env vars**:
   - `cp app/.env.example app/.env.local` → fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   - `cp supabase/.env.example supabase/.env` → fill `SUPABASE_DB_URL`.
   - ⚠️ Never put the `service_role` key in `app/` or commit it. The `anon` key is safe client-side (RLS protects data, not key secrecy).
3. **Migrations**: `supabase db push` (applies all 15 schema steps + RLS + the public-safe districts/sports reference seed).
4. **Organization seed** — **only if the repo is already private** (FR-012): run `supabase/seed/002_organizations.sql`. If the repo is still public, use a local uncommitted copy for personal testing and do not commit it.
5. Install new deps in `app/`: `@supabase/supabase-js`, `vitest` (added to `package.json` this milestone).

## Validate (proves the feature works)

| Check | Command / action | Expected | Proves |
|---|---|---|---|
| Unit — mapper | `npm test` (Vitest) in `app/` | Mapper fixture tests green; shape-parity test passes | FR-011, SC-006, Principle III |
| Integration — read | Call `getOrganizations({ sportSlug: 'running' })` against seeded DB | Only active, non-suspended/archived/rejected orgs; ≥1 org per each of the 6 sports; a Callao district filter returns ≥1 | FR-002/003/004, SC-001/002/005 |
| RLS — anon | Query `leads`/`users` as the anon role; query a suspended org | Denied / not returned | FR-004/008, SC-005 |
| Secrets | Scan repo + git history for URL/keys | None found | FR-009, SC-003 |
| Runbook time | New dev follows `docs/runbooks/data-foundation-setup.md` | Reproduced in <30 min | SC-004 |

## Out of scope (do not do this milestone)

- Rewiring `app/src/pages/*`, `MatchSessionContext.tsx`, or `matching.ts` to the new layer (Milestone 3).
- Any change to `app/src/data/organizations.ts` (the mock stays; UI reads it this milestone).
- Adding matching/adjacency logic to the data layer.
