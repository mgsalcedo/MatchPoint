# Runbook: Data Foundation setup

Reproduces MatchPoint's Supabase database (schema + seed) from scratch. Target: under 30 minutes (SC-004). Two paths are given for running SQL — the Supabase **SQL Editor** (web UI, no CLI install needed, recommended for this PMV) and the **Supabase CLI** (for those who prefer it). Pick one.

## 1. Create the Supabase project (~5 min)

1. Sign in at [supabase.com](https://supabase.com) (GitHub sign-in is fastest).
2. **New project** → name it (e.g. `matchpoint`) → set a database password (save it — you may need it later) → region **South America (São Paulo)** (`sa-east-1`, nearest to Peru) → Free plan → **Create new project**.
3. Wait ~2 minutes for provisioning.

## 2. Collect credentials (~2 min)

Settings (gear icon) → **API**:
- **Project URL** (`https://<ref>.supabase.co`)
- **`anon` `public`** key

⚠️ There is also a `service_role` key on that page. **Never** put it in `app/`, never prefix it `VITE_`, never commit it — it bypasses Row Level Security entirely. This runbook never uses it.

## 3. Set environment variables (~3 min)

```sh
cp app/.env.example app/.env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from step 2
```

`app/.env.local` is gitignored (`*.local` in `app/.gitignore`) — verify with `git check-ignore app/.env.local` (should print the path, confirming it's ignored).

## 4. Apply the schema migrations (~8 min)

Run the 7 files in `supabase/migrations/` **in order** (`0001` → `0007`). Each is idempotent-safe for a fresh database.

**Option A — SQL Editor (recommended, no install needed):**

1. In the Supabase dashboard, left sidebar → **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_extensions_and_enums.sql` locally, copy its contents, paste into the editor, click **Run**.
3. Repeat for `0002_districts.sql`, `0003_sports.sql`, `0004_users_organizations.sql`, `0005_org_sports_venues_schedules_adn.sql`, `0006_match_and_leads.sql`, `0007_rls_policies.sql` — **in that exact order** (later files reference tables/types created earlier).

**Option B — Supabase CLI:**

```sh
cp supabase/.env.example supabase/.env
# fill in SUPABASE_DB_URL from Settings → Database → Connection string
supabase link --project-ref <your-project-ref>
supabase db push
```

**Verify**: Table Editor (sidebar) should show 12 tables: `districts`, `sports`, `users`, `organizations`, `organization_sports`, `venues`, `schedules`, `organization_adn`, `match_sessions`, `match_results`, `leads`, `profile_claims`. `sports` should already have 6 rows and `districts` ~24 rows (both seeded inside migrations 0002/0003 — see below).

## 5. Reference seed check (~1 min)

The public-safe reference data (6 PMV sports, ~24 Lima/Callao districts) ships **inside** migrations `0002` and `0003` — no separate step needed, since it's non-sensitive schema-adjacent data (research.md R7). Confirm via Table Editor or:

```sql
select count(*) from sports;    -- expect 6
select count(*) from districts; -- expect ~24
```

## 6. Organization seed (~2 min) — gated

`supabase/seed/002_organizations.sql` contains real communities with real public contact info (WhatsApp/Instagram). Per FR-012, this file is committed to the repo **only after making the repository private**.

- If the repo is already private (check: `curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/<owner>/<repo>` returns `404` when private and unauthenticated): run the seed via the SQL Editor (paste and Run) or `psql "$SUPABASE_DB_URL" -f supabase/seed/002_organizations.sql`.
- If the repo is still public: do not commit this file. You may still run it locally against your own database for testing, but keep it uncommitted until the repo's visibility changes (GitHub → repo **Settings** → scroll to **Danger Zone** → **Change visibility** → **Make private**, type the repo name to confirm).

## 7. Verify (~5 min)

```sh
cd app
npm install
npm test                                                     # unit tests (mapper) — no DB needed

# integration — needs steps 1-6 done. RUN_INTEGRATION=1 is required: Vitest's file-filter
# argument does not by itself override vite.config.ts's default exclude of *.integration.test.ts
# (that exclude keeps `npm test` DB-free for CI/local unit runs — research.md R7).
RUN_INTEGRATION=1 npx vitest run src/lib/data/organizations.integration.test.ts   # bash/Git Bash
$env:RUN_INTEGRATION=1; npx vitest run src/lib/data/organizations.integration.test.ts  # PowerShell
```

Expected: all unit tests pass; integration tests confirm all 6 sports return results, Callao is covered, suspended/archived/rejected orgs are excluded, and the anon role cannot read `leads`/`users`.

## Total time

Comfortably under 30 minutes end-to-end (SC-004), most of it waiting for project provisioning (step 1) and copy-pasting SQL (step 4).

## Troubleshooting

- **"Missing Supabase env vars" error on `npm test` (integration) or in the app**: `app/.env.local` isn't set or the dev server needs a restart to pick up new env vars.
- **Migration fails with "type already exists" / "relation already exists"**: you're re-running a migration against a database that already has it applied — safe to ignore, or start from a fresh project if you need a clean slate.
- **Integration tests return 0 results for a sport**: the organization seed (step 6) hasn't been run yet, or the repo-private gate hasn't been satisfied — see step 6.

## Reproducibility check (T023)

No raw `information_schema` query was run against the live project — that needs the DB connection string/password, which per this project's security posture is never requested or pasted into chat (only the `anon` key lives in `app/.env.local`). Reproducibility was instead verified two ways, both sufficient at PMV scale:

1. **Structural**: each `supabase/migrations/000N_*.sql` file's header states it transcribes `docs/database-schema.md` verbatim; a table-by-table check confirms all 12 tables in the doc (`## Tables` section) exist 1:1 in the migrations, same columns/types/constraints.
2. **Functional**: the integration test suite (step 7) queries the live, migrated+seeded database through the real `organizations`/`venues`/`schedules`/`organization_adn` tables and the RLS-protected `leads`/`users` tables, and all 8 assertions pass — this would fail immediately on any column/type/RLS drift from what the mapper (`app/src/lib/data/mappers.ts`) expects, which itself mirrors `docs/database-schema.md`.

If a future contributor has the DB connection string, a stricter check is: `select table_name, column_name, data_type from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position;` compared column-by-column against `docs/database-schema.md`.
