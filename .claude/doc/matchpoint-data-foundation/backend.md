# Backend Plan — Data Foundation (Milestone 0 + 1)

Feature branch: `001-data-foundation`. Source of truth for scope: `specs/001-data-foundation/spec.md` (all FR-001…FR-012, SC-001…SC-006 referenced below are from that file). Source of truth for schema: `docs/database-schema.md` — this plan applies it, it does not redesign it. This is a plan only; nothing here is implemented.

## 0. Cross-check summary (read this first)

No drift found between `docs/database-schema.md`, `docs/data-model.md`, and the spec. Specifically confirmed:

- `leads` table in `docs/database-schema.md` has **no `status` column** and no `external_url_opened` column — matches FR-007 and the immutable-Lead divergence note. This plan does not add one. Anyone tempted to add a `status`/`opened` field to `leads` during implementation must stop and flag it per CLAUDE.md's Lead rule — it is not in scope and reopens a settled decision.
- All 14 tables in the 16-step migration order (districts, sports, users, organizations, organization_sports, venues, schedules, organization_adn, match_sessions, match_results, leads, profile_claims) are to be created now per FR-006, even though only organizations/organization_sports/venues/schedules/organization_adn/sports/districts are read this milestone.
- `Coach` and `Event` are correctly **absent** from `docs/database-schema.md`'s migration order (per `docs/data-model.md`'s "defined but not implemented" notes) — this plan does not introduce `coaches` or `events` tables. Do not add them; that would be scope creep beyond FR-006's "match the schema exactly."
- The app's mock `Organization` type (`app/src/types.ts`) uses Spanish-slug enums (`"gratis"`, `"principiante"`, `"mar"`/`"jue"` weekdays, districts as bare strings) that do **not** match the DB's English enums (`user_level`, `budget_range` etc.) or normalized district/venue FKs. This is expected and is exactly why FR-011 asks for a mapping layer, not a passthrough — flagged in detail in §4.
- No conflict with `docs/security-standards.md` found: this milestone only ever reads organization/sport/district/venue/schedule/ADN data anonymously (already public per that doc — "Organization contact channels... are public marketplace data once the profile is published"), and precise **user** location is never involved (no user-location column is read or written this milestone). The `leads` RLS write-restriction (§3) is defined now but not exercised, consistent with FR-008.
- No stack ambiguity to flag: Supabase PostgreSQL + Vite/React are locked by the constitution's Technology & Engineering Constraints, so no options need to be presented for the persistence or client layer.

## 1. Supabase project setup / env

**Who does what:** the human owner (not Claude) creates the Supabase project and obtains its credentials — this cannot be automated by an agent. This plan only specifies what the project needs and how the app consumes it.

### 1.1 Project creation (documented in the runbook, §7 — not performed by Claude)

1. Owner creates a project at supabase.com (choose a region close to Peru — likely `sa-east-1`/São Paulo, the nearest AWS region Supabase offers; no region in Peru itself exists, note this as a latency-acceptable tradeoff for PMV, not a blocker).
2. Owner obtains from Project Settings → API: `Project URL`, `anon` public key, and separately the `service_role` key (kept out of the app entirely — see 1.3).
3. Owner obtains the Postgres connection string (Project Settings → Database) for running migrations via the Supabase CLI or `psql`.

### 1.2 Environment variables

New file: `app/.env.local` (gitignored — verified, see below). Vite only exposes variables prefixed `VITE_` to client code (`import.meta.env`), so:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

Also create `app/.env.example` (committed, no real values) documenting the same two keys with placeholder values, so a new dev knows what to fill in — this is the concrete deliverable for FR-010's "environment setup documented."

For migrations/seed (run outside the Vite app, via Supabase CLI or `psql`, not read by the browser bundle), a separate non-`VITE_`-prefixed set is needed at the repo root or in a `supabase/.env` (also gitignored):

```
SUPABASE_DB_URL=postgres://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # only for CLI/admin scripts, NEVER in app/
```

**Gitignore verification:** `app/.gitignore` already contains `*.local`, which matches `.env.local` (Vite's own gitignore convention — confirmed by reading `app/.gitignore`, line 13). This covers `app/.env.local`. It does **not** cover a bare `supabase/.env` — that needs an explicit line. Action: add `.env` and `supabase/.env` to the **root** `.gitignore` (root `.gitignore` currently has `.env` and `.env.local` already, confirmed by reading it — so a root-level `supabase/.env` is already covered by the existing `.env` root-level ignore only if git treats `.gitignore` patterns as matching at any depth, which it does for a bare `.env` pattern with no leading slash). Still, explicitly add `supabase/.env` as a defensive, self-documenting line rather than relying on the implicit match — cheap insurance against a future contributor being confused.

**Trust-safety flag (explicit, per this task's instructions):** the `anon` key is safe to ship in client bundles — it is designed to be publishable and is the whole point of Supabase's RLS model (the key identifies the *project*, not a privileged session; RLS policies, not key secrecy, protect the data). The **`service_role` key bypasses RLS entirely** and must never appear in `app/` (client bundle), never be prefixed `VITE_`, and never be committed. This plan's data-access layer (§4) uses only the anon key. Flag this explicitly in the runbook (§7) as a one-line warning, since a new dev unfamiliar with Supabase could plausibly reach for the service key out of convenience.

### 1.3 How the Vite app reads the env vars

New file: `app/src/lib/data/supabaseClient.ts` — a single `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)` instance, exported once and imported by the data-access layer only (§4). Requires adding the `@supabase/supabase-js` dependency to `app/package.json` (currently absent — confirmed by reading `app/package.json`; only `react`, `react-dom`, `react-router-dom` are dependencies today). This is a new dependency addition, flag it as such in the PR.

Fail-fast note: if either env var is undefined at module load, throw immediately with a message pointing at `app/.env.example` — cheaper to debug than a silent `null` client failing deep in a query.

## 2. Migration organization

New directory: `supabase/migrations/` at the repo root (Supabase CLI's own convention — `supabase migration new <name>` generates timestamped files there; using the CLI's own convention means `supabase db push`/`supabase db reset` work with zero extra tooling).

Structure mirrors `docs/database-schema.md`'s 16-step order exactly, one file per step (numbered by the CLI's timestamp prefix, but ordered exactly as below so a linear read matches the doc):

| # | File (illustrative name; CLI will timestamp-prefix) | Content |
|---|---|---|
| 1 | `..._extensions.sql` | `uuid-ossp`, `pgcrypto` |
| 2 | `..._enums.sql` | All 9 enums from `docs/database-schema.md` §Enums, verbatim |
| 3 | `..._districts.sql` | `districts` table + indexes |
| 4 | `..._sports.sql` | `sports` table + the 6-sport seed insert **(schema-level reference seed, not the org seed — see §6 on why this one ships with the migration, not the gated seed)** |
| 5 | `..._users.sql` | `users` table |
| 6 | `..._organizations.sql` | `organizations` table + 3 indexes |
| 7 | `..._organization_sports.sql` | `organization_sports` table |
| 8 | `..._venues.sql` | `venues` table + 2 indexes |
| 9 | `..._schedules.sql` | `schedules` table + 3 indexes |
| 10 | `..._organization_adn.sql` | `organization_adn` table |
| 11 | `..._match_sessions.sql` | `match_sessions` table |
| 12 | `..._match_results.sql` | `match_results` table |
| 13 | `..._leads.sql` | `leads` table + 3 indexes — **verify in code review that no `status` column is present** |
| 14 | `..._profile_claims.sql` | `profile_claims` table |
| 15 | `..._rls_policies.sql` | All RLS policies, §3 below |
| 16 | (seed — see §6, handled separately from migrations proper) | |

**Why the `sports` seed (6 PMV sports) ships inside migration step 4, not the gated org seed:** the 6 sports (`running`, `trail-running`, `ciclismo`, `natacion`, `triatlon`, `centro-entrenamiento`) are reference/lookup data with zero PII and zero third-party contact info — they're effectively part of the schema, already written out verbatim in `docs/database-schema.md`. Gating them behind "repo must be private" would be over-applying FR-012's constraint, which is specifically about *third-party organization contact info*. Districts likewise: seed the ~15-20 Lima Metropolitana + Callao districts (names/province/region are public geographic facts, no PII) as part of migration step 3, not the gated seed.

**What's created now vs. exercised now** (explicit table for whoever implements, since FR-006 requires all tables but only some are queried):

- Created **and** exercised (read) this milestone: `sports`, `districts`, `organizations`, `organization_sports`, `venues`, `schedules`, `organization_adn`.
- Created but **not yet written to** this milestone (schema parity only, per FR-006): `users`, `match_sessions`, `match_results`, `leads`, `profile_claims`. No seed rows for these except perhaps zero — do not fabricate placeholder users/leads to "test" the schema; an empty table with correct constraints is sufficient proof of parity (verified by comparing `information_schema` against the doc, not by inserting fake rows).

## 3. RLS policies

File: `supabase/migrations/..._rls_policies.sql` (step 15). Concrete policies, one per table, matching `docs/database-schema.md`'s "RLS notes" section precisely:

```sql
-- Enable RLS on every table (required even for public-read tables)
alter table districts enable row level security;
alter table sports enable row level security;
alter table organizations enable row level security;
alter table organization_sports enable row level security;
alter table venues enable row level security;
alter table schedules enable row level security;
alter table organization_adn enable row level security;
alter table users enable row level security;
alter table match_sessions enable row level security;
alter table match_results enable row level security;
alter table leads enable row level security;
alter table profile_claims enable row level security;

-- Public read: reference data (always active by construction, no extra filter needed)
create policy "public_read_districts" on districts
  for select using (is_active = true);

create policy "public_read_sports" on sports
  for select using (is_active = true);

-- Public read: organizations — active AND not suspended/archived (BR-008)
create policy "public_read_organizations" on organizations
  for select using (
    is_active = true
    and profile_status not in ('suspended', 'archived')
  );

-- Public read: child tables, filtered through the parent organization's visibility
create policy "public_read_organization_sports" on organization_sports
  for select using (
    exists (
      select 1 from organizations o
      where o.id = organization_sports.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived')
    )
  );

create policy "public_read_venues" on venues
  for select using (
    is_active = true
    and exists (
      select 1 from organizations o
      where o.id = venues.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived')
    )
  );

create policy "public_read_schedules" on schedules
  for select using (
    is_active = true
    and exists (
      select 1 from organizations o
      where o.id = schedules.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived')
    )
  );

create policy "public_read_organization_adn" on organization_adn
  for select using (
    exists (
      select 1 from organizations o
      where o.id = organization_adn.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived')
    )
  );

-- Leads: insert restricted to authenticated users; users read only their own leads.
-- Not exercised this milestone (no write path shipped yet) but must be correct now (FR-008).
create policy "authenticated_insert_leads" on leads
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users_read_own_leads" on leads
  for select
  to authenticated
  using (user_id = auth.uid());

-- users/match_sessions/match_results/profile_claims: no public policy defined this milestone
-- (RLS enabled with no policy = deny-all by default, which is correct: nothing reads/writes
-- them yet). Do NOT add a public-read policy to these — that would be scope creep past FR-006.
```

**"Active + not suspended/archived" enforcement — RLS vs. query filter, both, per the spec's own framing:** enforce at the RLS layer (above) as the authoritative gate — this is what makes the anon key safe to ship (defense holds even if a future endpoint forgets the `WHERE` clause). *Additionally*, the data-access layer (§4) should still pass explicit `.eq('is_active', true)` and a `.not('profile_status', 'in', '(suspended,archived)')` filter in its own query — not because RLS is insufficient, but because (a) it makes the query self-documenting without needing to open the migrations file, and (b) it lets the same query be tested against a fixture Postgres/mocked client where RLS isn't necessarily active (e.g. a local test DB using the service role for setup). Belt-and-suspenders here is intentional, not redundant: RLS is the security boundary; the query filter is the readability/testability aid.

**Note on `organizations` also needing the minimum-launch-dataset filter (FR-005):** RLS above enforces "active + not suspended/archived" only. FR-005's "must have name/sport/district-or-venue/contact method/schedule/level/environment/short description to be discoverable" is a **data-completeness** rule, not a visibility/security rule — it belongs in the data-access layer's query/mapping logic (§4), not in RLS. Encoding it in RLS would require a very unwieldy `EXISTS` policy checking five joined tables and would conflate "who is allowed to see this row" with "is this row good enough to recommend," which are different concerns. Flag this distinction for the implementer: RLS = security boundary; FR-005 = product/recommendation-quality filter, enforced in `app/src/lib/data/organizations.ts`.

## 4. Data-access layer design

### 4.1 File layout

```
app/src/lib/data/
  supabaseClient.ts       # single createClient() instance (§1.3)
  organizations.ts        # the public function(s) FR-011 asks for
  mappers.ts              # pure row → Organization mapping (no I/O, unit-testable)
  types.ts                # Supabase row shapes (snake_case, mirrors database-schema.md tables)
```

Do not put the mapping logic inside `organizations.ts` alongside the Supabase query — split them (per Principle III / base-standards' "pure domain logic isolated from framework/IO code") so `mappers.ts` has zero Supabase imports and can be unit-tested with plain fixture objects.

### 4.2 Function signature

```typescript
// app/src/lib/data/organizations.ts
export interface GetOrganizationsParams {
  sportSlug?: string;   // e.g. "running" — matches sports.slug
  districtName?: string; // e.g. "Miraflores" — matches districts.name
}

export async function getOrganizations(
  params: GetOrganizationsParams = {}
): Promise<Organization[]>
```

Returns `Organization[]` using the **existing** `app/src/types.ts` shape — this is the whole point of FR-011/SC-006: nothing downstream (Results.tsx, MatchSessionContext.tsx, matching.ts) needs to change when the UI is rewired in Milestone 3. Accepting a `sportSlug`/`districtName` pair (both optional, so calling with no args returns the full active catalog) satisfies the spec's "by sport and by district" contract (FR-003) without inventing a different shape than `docs/api-contracts.md` implies elsewhere (that doc's `GET /api/organizations/:slug` is a single-org profile fetch; there is no `GET /api/organizations?sport=&district=` list endpoint documented yet — this milestone's function is the **data layer under** where such an endpoint or server action would eventually sit; it does not itself need to be an HTTP endpoint yet since nothing calls it over HTTP this milestone. Flag this as a **doc gap**: `docs/api-contracts.md` has no explicit "list organizations by sport/district" contract — recommend adding one when Milestone 3 wires the UI to this layer, so the contract doc and the function signature converge at that point rather than drifting.)

### 4.3 Query shape (the Supabase call itself, isolated from the mapper)

```typescript
// inside getOrganizations(), illustrative — implementer fills in exact Supabase query builder calls
let query = supabase
  .from('organizations')
  .select(`
    id, name, slug, organization_type, description, short_description,
    instagram_url, whatsapp_number, booking_url,
    profile_status,
    organization_sports:organization_sports(sport:sports(id, name, slug)),
    venues(id, name, district:districts(id, name)),
    schedules(id, day_of_week, start_time, end_time, session_name, level_min, level_max, venue_id, sport_id),
    organization_adn(*)
  `)
  .eq('is_active', true)
  .not('profile_status', 'in', '(suspended,archived)');

if (params.sportSlug) {
  // district-filter nuance and sport-filter nuance both require a join-based .in() or a second query,
  // since organization_sports/venues are child tables, not columns on organizations. Two viable approaches:
  //   (a) filter client-side after fetch (fine at seed scale, tens of records — matches SC-002's
  //       "no perceptible delay at seed scale" acceptance bar), or
  //   (b) pre-fetch matching organization_ids via a scoped query on organization_sports/venues,
  //       then .in('id', matchingIds) on the main query.
  // Recommend (a) for this milestone given SC-002 explicitly says seed-scale (tens of records) is
  // the bar, and (a) keeps the query and the mapper simpler to unit-test. Revisit (b) if/when the
  // catalog grows past a few hundred rows — flag this as a documented tradeoff, not silently chosen.
}
```

**The district-filter nuance, spelled out explicitly (per this task's request):** an organization does **not** have a `district` column. Its district(s) come from its `venues` (each venue has `district_id`, and one org can have multiple venues in different districts — see `docs/data-model.md`'s Venue section). So "get organizations in district X" means: fetch organizations whose **any** venue is in district X (or whose venue's district is in an adjacency set, if the matching-engine's adjacent-district logic from `app/src/lib/matching.ts`'s `ADJACENT_DISTRICTS` is to be honored here — **it should not be** at this milestone; adjacency is matching/ranking logic, out of scope for a plain discovery-layer query per the spec's Edge Cases section: "adjacency handling detail belongs to the matching milestone, but the catalog must not hide it" — meaning this layer returns the exact-district set only, and Milestone 3's matching rebuild is where adjacency re-enters). Implementer note: don't reach into `matching.ts`'s `ADJACENT_DISTRICTS` map from this data layer — that would violate the "centralize matching logic in one module" rule by leaking a matching concern into the data-access layer.

### 4.4 The mapping function (row → Organization) — the testable core

```typescript
// app/src/lib/data/mappers.ts
export function mapOrganizationRow(row: SupabaseOrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    type: mapOrganizationType(row.organization_type),      // enum translation table, see below
    sports: row.organization_sports.map((os) => mapSportSlug(os.sport.slug)),
    description: row.description ?? row.short_description ?? '',
    districts: dedupe(row.venues.map((v) => v.district.name)),
    schedules: row.schedules.map(mapSchedule),
    priceRange: 'no_confirmado', // no price field exists in database-schema.md's organizations
                                  // table at all — flag this as a genuine gap, see §4.5
    trialClassAvailable: false,  // same — no such column exists; see §4.5
    whatsapp: row.whatsapp_number ?? undefined,
    instagram: row.instagram_url ?? undefined,
    bookingLink: row.booking_url ?? undefined,
    adnDeportivo: mapAdn(row.organization_adn),
    services: [],                 // no such column/table exists; see §4.5
    profileStatus: mapProfileStatus(row.profile_status),
  };
}
```

**Enum translation tables needed** (DB enum value → app's mock-vocabulary value) — these must be centralized as small lookup objects in `mappers.ts`, not inlined per-field, so there is exactly one place that knows e.g. `'ciclismo'` (DB slug, matches DB's Spanish sport-slug convention already) maps to `'ciclismo'` (app type — happens to already match) but `'centro-entrenamiento'` (DB slug, hyphenated) maps to `'centro_entrenamiento'` (app type, underscored). Concretely needed translation tables:

- `organization_type` (DB enum, e.g. `running_team`) → app `OrgType` (e.g. `"team"`) — **these vocabularies do not line up 1:1** (DB has 13 values incl. `coach_independent`, `federation`, `sports_community`; app type has 9 values incl. `"community"`, `"coach"`). This needs an explicit many-to-one mapping table, documented inline, e.g. `running_team|trail_team|cycling_club|swimming_academy|triathlon_club → "team"` (or `"club"` — **ambiguous, flag for product decision**), `training_center → "training_center"`, `coach_independent → "coach"`, `federation → ? (no equivalent app type exists)`, `gym → ? (no equivalent app type exists)`. **This is a real gap, not a mechanical translation** — flag explicitly to whoever implements: the app's `OrgType` union may need new values (`"federation"`, `"gym"`) added to `app/src/types.ts`, OR the DB's richer enum collapses lossily into the app's coarser one. Recommend surfacing this as an explicit question before implementation, not guessing.
- `sports.slug` (DB, kebab-case) → app `Sport` (mostly underscore/no-separator) — mostly mechanical (`running→running`, `trail-running→trail`, `ciclismo→ciclismo`, `natacion→natacion`, `triatlon→triatlon`, `centro-entrenamiento→centro_entrenamiento`).
- `user_level` (DB: `never_practiced/beginner/intermediate/advanced`) → app `Level` (`nunca_practique/principiante/intermedio/avanzado`) — mechanical 1:1, used for `schedules[].level` (see next point).
- `profile_status` (DB has 6 values incl. `rejected`) → app `profileStatus` (5 values, **no `rejected`**) — since `rejected` orgs should never be in the query result anyway (they're not `suspended`/`archived` per the enum, but a `rejected` org was never published — flag: should the RLS/query filter also exclude `rejected`? **Likely yes** — `docs/data-model.md` doesn't explicitly say, but a rejected-claim org (a *distinct* concept — `profile_status='rejected'` seems to mean the org record itself was rejected, not a claim) showing up in public discovery seems wrong. Flag this as a concrete open question for implementation: should the RLS policy's `not in ('suspended','archived')` also exclude `'rejected'`? Recommend yes, propose amending §3's policy to `not in ('suspended', 'archived', 'rejected')` and confirming with product/data-model owner, since this is a genuine ambiguity in `docs/data-model.md`, not something to silently decide either way.

**`schedules[].day` mapping is the trickiest one:** DB stores `day_of_week integer` (1-7, ISO convention presumably Monday=1); the app's mock uses 3-letter Spanish abbreviations (`"lun"|"mar"|"mie"|"jue"|"vie"|"sab"|"dom"`). Needs a small `DAY_OF_WEEK_MAP: Record<number, Weekday>` — confirm with whoever owns the seed data whether `1` means Monday (ISO 8601) before committing this map, since an off-by-one here silently breaks every schedule-fit calculation downstream in `matching.ts`. Flag this as a fixture-test-worthy edge case (§5).

### 4.5 Real gaps between the DB schema and the app's mock `Organization` type (flag, do not silently fabricate)

Per Principle VI / BR-016 ("never fabricate data — unknown is displayed as unknown, never invented") and CLAUDE.md's "the agent does not invent" rule, the following mock fields have **no corresponding column in `docs/database-schema.md`**, so the mapper must not invent plausible-looking values for them:

- `priceRange` / `Budget` — no price/cost column exists anywhere in `organizations`, `schedules`, or any other table in `docs/database-schema.md`. Map to a fixed `"no_confirmado"` for all rows (already a valid value in the app's `Budget | "no_confirmado"` union) rather than guessing. Flag as a **schema gap** worth a future migration if pricing display is wanted — out of scope to add now (not in FR-001's list, not in the 16-step order), so do not add a column speculatively.
- `trialClassAvailable` (boolean) — no equivalent column. Map to `false` for all rows (safer default than fabricating `true`), and flag the same way.
- `services: string[]` — no equivalent column/table (`organization_adn.culture_tags text[]` is the closest thing but represents something different — ADN culture tags, not a services list). Map to `[]`.
- `coach?: string` — no equivalent column (per `docs/data-model.md`'s open question #2, Coach isn't backed by a table at all yet). Map to `undefined`.

None of these four gaps block FR-011 (the shape-parity requirement is about the **output type matching**, which is satisfied — the fields exist and are typed correctly, just populated with safe defaults rather than fabricated data). But flag all four explicitly in the PR description per base-standards' "no ad-hoc duplicate shapes" and BR-016, so a reviewer doesn't mistake `false`/`[]`/`"no_confirmado"` for real curated data. This is also a natural trigger for a future `docs/data-model.md` amendment if product decides pricing/trial-class/services should become real columns — flag, don't implement speculatively.

## 5. Testing plan

Per constitution Principle III and `docs/base-standards.md`: business logic needing test-first coverage here is narrower than "the whole data layer" — specifically:

**Unit-testable (pure, no DB, test-first):**
1. `mapOrganizationRow()` and its sibling mappers (`mapOrganizationType`, `mapSportSlug`, `mapProfileStatus`, day-of-week mapping) in `app/src/lib/data/mappers.ts` — test against **fixture row objects** (hand-written objects matching the Supabase row shape, not a live query). This is the correctness-critical unit: get an enum translation wrong and every downstream match score in `matching.ts` silently degrades.
2. **Shape-parity test (directly satisfies SC-006):** a test asserting that `mapOrganizationRow(fixtureRow)` produces an object whose keys/types are assignable to the existing `Organization` type from `app/src/types.ts` — i.e., compile-time type-check plus a runtime snapshot test comparing structure (not values) against one entry from `app/src/data/organizations.ts`. This is the literal proof that Milestone 3's future UI swap needs no component changes.
3. Edge cases worth explicit fixture tests: an organization with zero venues (should the district list just be empty, or should the org be filtered out entirely per FR-005's minimum-dataset rule — recommend the latter, and test it), an organization offering multiple sports (should map to a multi-element `sports` array, confirming the Edge Case in the spec: "org offers multiple sports → appears under each"), an organization with a `rejected` status if that filter question from §4.4 is resolved to exclude it.

**What test runner:** `app/package.json` currently has **no test framework at all** (confirmed — only `oxlint` for linting, no `vitest`/`jest` dependency). This is a real gap to flag: this milestone needs to introduce one. Recommend **Vitest** (native Vite integration, zero extra config beyond a `vitest.config.ts` or reusing `vite.config.ts`, fast, TS-first) — add `vitest` to `devDependencies` and a `"test": "vitest run"` script. This is a net-new tooling decision for the plan to surface, not assume silently, per this task's "no stack lock-in beyond what's decided" principle — flag it as the recommended default and let the human confirm, since nothing in CLAUDE.md or the constitution names a test runner yet.

**Integration-level (against a seeded DB, not unit-tested):**
4. A test (can be a script run manually or via CI against a real/local Supabase instance — a full CI wiring is arguably beyond this milestone's scope, but at minimum a documented manual verification step in the runbook) that calls `getOrganizations({ sportSlug: 'running' })` against the seeded database and asserts: only active, non-suspended/archived orgs come back; every one of the 6 sports returns at least one org; district filter narrows correctly; a Callao-district filter returns at least one org (directly verifies SC-001's Callao coverage and FR-002's sport/district spread requirements).
5. RLS verification: a test/script running as the **anon** role confirming it cannot read `leads`/`users`/`match_sessions` and confirming it **can** read active organizations but **cannot** read suspended ones (directly verifies FR-004/FR-008 and SC-005's "100% of suspended/archived excluded").

**Not test-gated this milestone** (explicitly, to prevent scope creep): the matching/ranking algorithm in `matching.ts` itself is unchanged and out of scope here; booking-state-machine testing doesn't apply (no such entity exists yet, per base-standards' explicit deferral).

## 6. Seed strategy

Two-tier seed, split by sensitivity, both living under `supabase/seed/` (not `supabase/migrations/`, so they can be run independently and re-run idempotently without being tangled into the migration history):

### 6.1 Public-safe seed (can be committed while repo is public)

`supabase/seed/001_reference_data.sql` — districts (Lima Metropolitana + Callao district list, public geographic data) and the 6 PMV sports (already shown verbatim in `docs/database-schema.md`, so no confidentiality concern). This can actually live inside the migrations themselves (step 3 and step 4 per §2's table) rather than a separate seed file, since it's non-sensitive schema-adjacent reference data — recommend folding it into migrations 3/4 directly rather than a separate seed step, simplifying the "16-step order."

### 6.2 Contact-bearing organization seed (gated — repo-private prerequisite)

`supabase/seed/002_organizations.sql` — the 10+ real Lima/Callao communities with real WhatsApp numbers / Instagram handles, per FR-002/FR-012. **This file must not be committed until the repo is made private** (the hard sequencing prerequisite from `/speckit-clarify`, restated in FR-012). Concrete sequencing recommendation for the runbook and for whoever executes this milestone:

1. Build and land everything else first (schema migrations 1-16 minus the org-seed step, the data-access layer, its tests, the runbook) while the repo is still public — none of that contains real contact info.
2. Curate the 10+ organizations' public info (name, sport(s), district/venue, WhatsApp/Instagram, schedule notes, level, environment, short description — per BR-016, sourced only from what's actually publicly posted, never fabricated) into `002_organizations.sql`, but hold it uncommitted (local file, or a separate branch not yet pushed) until the repo-visibility change happens.
3. Repo owner flips the GitHub repo to private.
4. **Only then** commit `002_organizations.sql` (and any commit that references it) and run it against the Supabase project.
5. Residual-risk note already correctly captured in FR-012's own text: if the repo is ever made public again later, this seed's git history is exposed retroactively — that's an accepted tradeoff per the locked clarification, not something this plan needs to re-solve, but it's worth restating in the runbook as a one-line warning so a future "let's open-source this" decision doesn't silently forget it.

**Coverage requirement to satisfy while authoring `002_organizations.sql`:** at least 10 organizations; all 6 sports represented (at least 1 org each — an org can count toward multiple sports via multiple `organization_sports` rows, e.g. a triathlon club counting for `triatlon`, `natacion`, `ciclismo`, `running`); multiple districts; at least 1 org with a venue in Callao. Recommend building a simple coverage checklist (sport × count, district × count) as a sanity check before considering the seed file done — this can be a throwaway SQL `select sport_id, count(*) ...` query run manually, not a permanent artifact.

**Minimum launch dataset per FR-005:** every seeded org must have all of: name, ≥1 sport, ≥1 venue (hence district), a contact method (WhatsApp or Instagram or booking URL — at least one non-null), ≥1 schedule row, and an `organization_adn` row (for level/environment signal), plus `short_description`. An org missing any of these should either be completed before seeding or left out — do not seed a partial org and rely on the query layer to hide it silently; FR-005 is about eligibility, but a cleaner seed avoids ever creating ineligible rows in the first place.

## 7. Runbook

New file: `docs/runbooks/data-foundation-setup.md` (new `docs/runbooks/` directory — none exists yet). Outline (concrete enough for SC-004's <30-minute bar):

1. **Create the Supabase project** (~5 min) — sign up/log in at supabase.com, create a new project, choose a region, wait for provisioning.
2. **Collect credentials** (~2 min) — copy Project URL, anon key (Settings → API), and DB connection string (Settings → Database).
3. **Set environment variables** (~3 min) — copy `app/.env.example` to `app/.env.local`, fill in `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; copy a root `supabase/.env.example` to `supabase/.env` for the DB URL used by the CLI. Explicit warning line: never put the service_role key in `app/`.
4. **Install the Supabase CLI** (~3 min) — link it to the project (`supabase link`).
5. **Run migrations** (~5 min) — `supabase db push` (or `psql` against the connection string, running each file in `supabase/migrations/` in order) — applies all 16 steps including RLS.
6. **Run the reference seed** (~2 min) — districts + sports (public-safe, §6.1) — either bundled in migrations or a separate `supabase/seed/001_reference_data.sql` run.
7. **Run the organization seed** (~2 min) — **only if the repo is already private**; otherwise stop here and use a local-only uncommitted seed file for personal testing, per §6.2's sequencing.
8. **Verify** (~5 min) — run the integration test from §5 point 4 (or the manual SQL equivalent) confirming sport/district coverage and RLS behavior; run `getOrganizations()` from the app (a quick script or a temporary console call) and confirm shape parity with the mock.

Total: comfortably under 30 minutes for someone following the steps in order, satisfying SC-004.

## 8. File/module layout — concrete list

**New files:**
- `supabase/migrations/*.sql` — 15 files per §2's table (steps 1-15; step 16/seed handled separately)
- `supabase/seed/001_reference_data.sql` (or folded into migrations 3/4 — implementer's call, document whichever is chosen)
- `supabase/seed/002_organizations.sql` (gated, §6.2 — not committed until repo is private)
- `supabase/.env.example` (placeholder `SUPABASE_DB_URL`)
- `app/.env.example` (placeholder `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- `app/src/lib/data/supabaseClient.ts`
- `app/src/lib/data/organizations.ts` (the `getOrganizations()` function, FR-011)
- `app/src/lib/data/mappers.ts` (pure mapping functions, §4.4)
- `app/src/lib/data/types.ts` (Supabase row-shape TS interfaces, snake_case, mirroring `docs/database-schema.md` tables)
- `app/src/lib/data/mappers.test.ts` (or `.spec.ts`, depending on Vitest convention chosen) — unit tests, §5 point 1-3
- `app/src/lib/data/organizations.integration.test.ts` — integration test against seeded DB, §5 point 4-5 (may need a naming/tag convention so it's excluded from a fast unit-only CI run if no live DB is available in CI — flag this as a decision for whoever sets up CI, not solved here)
- `docs/runbooks/data-foundation-setup.md`
- `vitest.config.ts` (or reuse `vite.config.ts` with a `test` block) at `app/` root

**Changed files:**
- `app/package.json` — add `@supabase/supabase-js` dependency; add `vitest` devDependency; add `"test": "vitest run"` script.
- Root `.gitignore` — add explicit `supabase/.env` line (defensive, §1.2).
- `app/.gitignore` — no change needed (`*.local` already covers `.env.local`), but worth a one-line comment confirming this if it reduces ambiguity for a future contributor — optional.
- `CLAUDE.md` — no change needed this milestone (already references `docs/database-schema.md` etc.); if a test runner gets added, consider a one-line mention in the "Recommended stack" section so it's not re-litigated per feature (flag as an optional follow-up, not required for this milestone).

**Not changed (explicitly out of scope, confirm no accidental edits):**
- `app/src/data/organizations.ts` — stays as the mock, per the locked clarification that the UI keeps reading mock this milestone.
- `app/src/pages/*.tsx`, `app/src/context/MatchSessionContext.tsx`, `app/src/lib/matching.ts` — no rewiring to the new data layer; that's Milestone 3.
- `app/src/types.ts` — **unless** the `organization_type` gap in §4.4 forces a considered, explicit addition of new `OrgType` values (`"federation"`, `"gym"`) — flagged as an open question, not a silent edit.

## 9. Open questions to resolve before/during implementation (do not silently decide)

1. **`organization_type` enum mismatch** (§4.4) — DB has 13 values, app's `OrgType` has 9, and they don't cleanly cover each other (no equivalent for `federation`, `gym`, `sports_community` in the app type; app's `"community"` has no obviously equivalent DB value beyond a stretch-mapping to `sports_community`). Needs a decision: extend `OrgType`, or accept lossy collapsing for now.
2. **Should `profile_status = 'rejected'` also be excluded from public reads?** (§4.4) — `docs/data-model.md`/`docs/database-schema.md` say suspended/archived are excluded (BR-008), but don't explicitly address `rejected`. Recommend excluding it too, but flag for confirmation since it's not literally in FR-004's text.
3. **Day-of-week convention** (§4.4) — confirm `day_of_week = 1` means Monday (ISO 8601) before writing the seed and the mapper, since this is silently load-bearing for every schedule-fit calculation in `matching.ts` once Milestone 3 wires it up.
4. **Test runner choice** (§5) — recommending Vitest since nothing is currently decided; flagged rather than assumed, per this task's stack-lock-in caution.
5. **Whether the public-safe reference seed (districts/sports) lives inside migrations or a separate `supabase/seed/001_...sql`** (§6.1) — either works; implementer should pick one and note it in the runbook so step 6 of §7 is unambiguous.
6. **CI wiring for the integration test** (§5, §8) — this plan recommends the test exist and be runnable manually/locally; whether it also runs in a CI pipeline against an ephemeral Supabase instance is a separate infra decision not resolved here (no CI config exists in the repo today to extend).

## 10. Traceability to spec requirements

| Spec item | Where addressed |
|---|---|
| FR-001 (persist catalog matching data-model/schema) | §2 migrations |
| FR-002 (10+ orgs, 6 sports, multi-district incl. Callao) | §6.2 |
| FR-003 (anonymous read by sport/district) | §4.2, §4.3, RLS §3 |
| FR-004 (exclude suspended/archived) | §3 RLS, §4.4 open question on `rejected` |
| FR-005 (minimum launch dataset eligibility) | §3 note (query-layer concern, not RLS), §6.2 |
| FR-006 (schema matches exactly, all tables created) | §2 |
| FR-007 (leads has no status column) | §0, §2 step 13 |
| FR-008 (RLS: public read + authenticated lead insert) | §3 |
| FR-009 (secrets never committed) | §1.2 |
| FR-010 (documented runbook) | §7 |
| FR-011 (tested data-access layer, shape parity) | §4, §5 |
| FR-012 (contact info gated behind repo-private) | §6.2 |
| SC-001…SC-006 | §5 integration tests map directly to each SC |
