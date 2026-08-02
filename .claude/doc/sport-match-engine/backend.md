# Backend Plan — Sport Match™ Engine (real sessions & matching)

Feature: `002-sport-match-engine` · Branch: `002-sport-match-engine` (off `001-data-foundation`, not yet merged) · Spec: `specs/002-sport-match-engine/spec.md`

Status: PLAN ONLY, no code changes made. This feeds `/speckit-plan`'s Phase 0 research.md + Phase 1 data-model.md.

---

## 0. Scope confirmation and what this plan does NOT touch

- **Does not touch `leads`, auth, or the login gate.** Lead creation is Milestone 5 (`docs/roadmap.md`), explicitly out of scope per the spec's own "Explicitly out of scope" list. Nothing in this plan adds, reads, or references the `leads` table, and nothing adds a `status`/mutable field to anything (constitution Principle IV, `docs/data-model.md`'s divergence note). Confirmed: zero Lead-adjacent code paths are touched.
- **Does not redesign `match_sessions`/`match_results` schema.** Both tables already exist (migration `0006_match_and_leads.sql`) and match `docs/database-schema.md` column-for-column — verified by direct comparison, no drift found (see §1).
- **Does not redesign the matching algorithm's weights/formula.** Only `levelFit()`'s NaN bug is fixed (§4); the 7-factor weighted model, label thresholds, and reason-generation logic in `app/src/lib/matching.ts` are otherwise untouched.
- **Does not rework the organization profile page**, beyond one required plumbing fix so it keeps working once real (not mock) organizations flow through match results (§6.4).

## 1. Data model / schema cross-check (`docs/data-model.md`, `docs/database-schema.md`)

Compared migration `0006_match_and_leads.sql`'s `match_sessions`/`match_results` table definitions line-by-line against `docs/database-schema.md`'s versions: **identical**, no drift. `docs/data-model.md`'s `MatchSession`/`MatchResult` sections (open question #4, already resolved: "yes, persisted") also match. No entity/field changes needed anywhere in this feature — this plan only adds RLS policies (new migration) and a data-access/write layer that *uses* the existing schema.

The one real, already-known gap (confirmed by reading `0007_rls_policies.sql` directly, line 90-91):

```sql
-- users / match_sessions / match_results / profile_claims: RLS enabled, no policy = deny-all.
-- Nothing reads/writes them this milestone. Do NOT add a public policy — that is scope creep.
```

`match_sessions` and `match_results` have RLS enabled with **zero policies for any role**, including `anon`. This feature is the first thing that needs to write to them, so it needs a new migration adding exactly the anon-insert policies required — no more.

## 2. RLS design — new migration `0009_match_session_results_anon_insert.sql`

### 2.1 Design decision: insert-only, no SELECT policy, client-generated UUIDs

The task brief asks explicitly: "does the client even need a SELECT policy back?" — **No.** Reasoning:

- Supabase/PostgREST's `.insert(row).select()` (used to get the DB-generated id back via `RETURNING`) is itself subject to the table's **SELECT** RLS policy, not just INSERT. Granting SELECT would be needed only if the client relied on the database to generate `id` via `gen_random_uuid()`.
- Instead: the client generates `match_sessions.id` and each `match_results.id` itself via `crypto.randomUUID()` (Web Crypto API, available in all evergreen browsers and Node ≥19 — no new dependency) **before** inserting, and keeps those ids in local React state (they're already there, since `MatchResult` objects live in memory from `calculateMatches()`). It never needs to read a row back.
- With **no SELECT policy at all**, an anonymous client cannot read its own or anyone else's `match_sessions`/`match_results` rows. This is a strict superset of FR-006 ("MUST NOT allow anyone to read another session's stored answers or results") and SC-005 — trivially satisfied because nothing is readable via the anon key, period.
- If a future milestone needs to read a session back (e.g. "resume my match"), add a narrowly-scoped SELECT policy *then* — do not add one speculatively now (constitution Principle V, PMV Scope Discipline).

### 2.2 Impersonation guard on `match_sessions`

`match_sessions.user_id` is nullable and, at this milestone, must **always** be null on anon-role inserts — an anonymous request has no verified identity, so it must not be able to write an arbitrary real user's UUID into `user_id` (that would fabricate session attribution to a user who never ran it). Enforce with `with check (user_id is null)`.

### 2.3 Migration content

```sql
-- MatchPoint — migration 0009: anonymous insert access for match_sessions / match_results.
--
-- 0007_rls_policies.sql intentionally left match_sessions/match_results with RLS enabled and
-- zero policies (deny-all for every role, including anon) — nothing wrote to them yet. Feature
-- 002-sport-match-engine needs an anonymous (unauthenticated) client to create its own
-- match_session + match_results rows without login, per ADR-0003 / constitution Principle I
-- (no login before value) and FR-001/FR-006.
--
-- Design: INSERT-only, no SELECT policy. The client computes matching results in-browser
-- (lib/matching.ts) and generates its own row ids via crypto.randomUUID() before inserting, so
-- it never needs Supabase to RETURNING a row back (which would itself require a SELECT policy).
-- With no SELECT policy, an anon client cannot read its own OR anyone else's match_sessions/
-- match_results rows — a strict superset of FR-006/SC-005, not just a minimal satisfaction of it.
--
-- `with check (user_id is null)` on match_sessions closes an impersonation gap: without it, an
-- anonymous request could insert a match_session claiming an arbitrary real user's id in
-- user_id, fabricating attribution. Anonymous requests have no verified identity, so user_id
-- must be null when written by the anon role; linking a session to a real user happens later
-- (Milestone 5, post-login) via a path that does not exist yet and is out of scope here.
--
-- Known gaps, explicitly deferred (do not solve in this migration):
--  1. No rate limiting. docs/security-standards.md calls for rate-limiting the match-scoring
--     path; RLS has no concept of request-rate limiting — that needs an edge function / gateway
--     layer if/when abuse is observed, not a schema change.
--  2. No `authenticated`-role insert policy yet. Once Milestone 5 ships real login, a logged-in
--     user completing Sport Match™ will hit these same tables as role `authenticated`, which
--     still resolves to deny-all until an analogous authenticated policy is added (mirroring
--     leads' authenticated_insert_leads pattern). Flag for Milestone 5, not built here.

create policy "anon_insert_match_sessions" on match_sessions
  for insert
  to anon
  with check (user_id is null);

create policy "anon_insert_match_results" on match_results
  for insert
  to anon
  with check (true);
```

No `with check` beyond `true` is added to `match_results` beyond what the table's own FK constraints already enforce (`match_session_id references match_sessions(id)`, `organization_id references organizations(id)`) — Postgres already rejects a `match_results` row pointing at a nonexistent session or organization regardless of RLS.

### 2.4 Doc sync required

`docs/database-schema.md`'s "RLS notes" section currently only says "Only authenticated users can create leads" / "Public can read active organizations..." with no mention of `match_sessions`/`match_results`. Add one bullet:

> - Anonymous (`anon` role) clients may INSERT their own `match_sessions`/`match_results` rows (`user_id` must be null); there is no SELECT policy for either table — the client never reads a row back after writing it (migration `0009`).

## 3. Data-access layer additions (`app/src/lib/data/`)

Following the established 001-data-foundation pattern (pure functions, `supabase` client from `supabaseClient.ts`, anon key only, mapper files with zero Supabase imports so they're independently unit-testable). All new files below are additive; `organizations.ts` is untouched.

### 3.1 `app/src/lib/data/sports.ts` (new)

```ts
export async function getSportId(slug: string): Promise<string> { ... }
```
Looks up `sports.id` by `slug` (`eq("slug", slug).eq("is_active", true).single()`), throws a descriptive error if not found. Reads under the existing `public_read_sports` policy (no `to` clause → applies to `anon` already, confirmed in `0007_rls_policies.sql`) — no RLS change needed for this table.

### 3.2 `app/src/lib/data/districts.ts` (new)

```ts
export async function getDistrictId(name: string): Promise<string> { ... }
```
Same shape, looks up `districts.id` by `name` (exact match — the questionnaire's district picker already uses exact district names from `app/src/data/organizations.ts`'s `DISTRICTS` constant, which must match seeded `districts.name` values 1:1; this function will throw loudly if that assumption ever drifts, rather than silently fabricating a district). Reads under `public_read_districts` (already anon-readable).

### 3.3 `mappers.ts` — three additions, no existing lines changed

`mappers.ts` already owns the organization-discovery vocabulary tables (`SPORT_SLUG_MAP`, `LEVEL_MAP`, `DAY_OF_WEEK_MAP`) but only the DB→app direction (needed for reading organizations). This feature needs the **reverse** direction for three of those same vocabularies (app answer → DB value), to resolve `sport_id`/`level`/`available_days` for the session-insert payload. To avoid a second, driftable copy of the same table living in a different file, derive the reverse from the existing tables in the same file:

```ts
export function mapSportToSlug(sport: Sport): string | null {
  return Object.entries(SPORT_SLUG_MAP).find(([, s]) => s === sport)?.[0] ?? null;
}
export function mapLevelToDb(level: Level): DbUserLevel {
  const found = Object.entries(LEVEL_MAP).find(([, l]) => l === level)?.[0];
  if (!found) throw new Error(`No DB user_level mapping for app Level "${level}"`);
  return found as DbUserLevel;
}
export function mapWeekdayToDayOfWeek(day: Weekday): number {
  const found = Object.entries(DAY_OF_WEEK_MAP).find(([, w]) => w === day)?.[0];
  if (!found) throw new Error(`No day_of_week mapping for app Weekday "${day}"`);
  return Number(found);
}
```

These stay in `mappers.ts` specifically because that's where `SPORT_SLUG_MAP`/`LEVEL_MAP`/`DAY_OF_WEEK_MAP` are defined and not currently exported — one source of truth per vocabulary table, per `docs/base-standards.md`'s no-duplicate-domain-logic rule.

### 3.4 `app/src/lib/data/sessionMappers.ts` (new)

Owns the vocabulary translations that are genuinely new to this feature (never touched by the organization-read path): `Goal → match_goal`, `Budget → budget_range`, `Environment → match_environment`, `MatchLabel → match_label`, `TimeOfDay → text`. Same "pure, no Supabase import, unit-testable" discipline as `mappers.ts` (constitution Principle III).

```ts
import type { Budget, Environment, Goal, MatchLabel, MatchResult, SportMatchAnswers, TimeOfDay } from "../../types";
import { mapLevelToDb, mapSportToSlug, mapWeekdayToDayOfWeek } from "./mappers";
import type { DbBudgetRange, DbMatchEnvironment, DbMatchGoal, DbMatchLabel } from "./types";

const GOAL_MAP: Record<Goal, DbMatchGoal> = {
  empezar: "start_sport",
  preparar_carrera: "prepare_race",
  mejorar_rendimiento: "improve_performance",
  mantenerme_activo: "stay_active",
  bajar_peso: "lose_weight",
  conocer_gente: "meet_people",
  otro: "other",
};

const BUDGET_MAP: Record<Budget, DbBudgetRange> = {
  gratis: "free",
  hasta_100: "up_to_100",
  "100_200": "100_200",
  "200_300": "200_300",
  mas_300: "more_than_300",
  no_seguro: "not_sure",
};

const ENVIRONMENT_MAP: Record<Environment, DbMatchEnvironment> = {
  competitivo: "competitive",
  social: "social",
  recreativo: "recreational",
  familiar: "family",
  alto_rendimiento: "high_performance",
  inclusivo: "inclusive",
};

const LABEL_MAP: Record<MatchLabel, DbMatchLabel> = {
  "Excellent Match": "excellent_match",
  "Very Good Match": "very_good_match",
  "Good Match": "good_match",
  "Possible Match": "possible_match",
  "Weak Match": "weak_match",
};

// preferred_times is a free-form text[] column (no DB enum), but translated to English tokens
// anyway for consistency with every other stored vocabulary and future admin/analytics queries.
const TIME_OF_DAY_MAP: Record<TimeOfDay, string> = { manana: "morning", tarde: "afternoon", noche: "night" };

export interface MatchSessionInsertRow {
  id: string;
  user_id: null;
  goal: DbMatchGoal;
  sport_id: string;
  district_id: string;
  available_days: number[];
  preferred_times: string[];
  level: ReturnType<typeof mapLevelToDb>;
  budget: DbBudgetRange;
  environment: DbMatchEnvironment;
}

export function buildMatchSessionRow(
  id: string,
  answers: SportMatchAnswers,
  sportId: string,
  districtId: string
): MatchSessionInsertRow {
  return {
    id,
    user_id: null, // anon-only this milestone; see migration 0009's impersonation-guard note
    goal: GOAL_MAP[answers.goal],
    sport_id: sportId,
    district_id: districtId,
    available_days: [...answers.days].map(mapWeekdayToDayOfWeek).sort((a, b) => a - b),
    preferred_times: [TIME_OF_DAY_MAP[answers.time]],
    level: mapLevelToDb(answers.level),
    budget: BUDGET_MAP[answers.budget],
    environment: ENVIRONMENT_MAP[answers.environment],
  };
}

export interface MatchResultInsertRow {
  match_session_id: string;
  organization_id: string;
  score: number;
  label: DbMatchLabel;
  rank: number;
  reasons: string[];
}

export function buildMatchResultRows(matchSessionId: string, results: MatchResult[]): MatchResultInsertRow[] {
  return results.map((r, i) => ({
    match_session_id: matchSessionId,
    organization_id: r.organization.id,
    score: r.score,
    label: LABEL_MAP[r.label],
    rank: i + 1,
    reasons: r.reasons,
  }));
}
```

Note `mapSportToSlug` from §3.3 is used by the caller (`matchSessions.ts`), not here — resolving `sport_id` requires a DB round-trip (`getSportId`), which doesn't belong in a pure mapper file.

Also add to `app/src/lib/data/types.ts` (mirroring the existing `DbOrganizationType`/`DbProfileStatus`/`DbUserLevel` convention):

```ts
export type DbMatchGoal = "start_sport" | "prepare_race" | "improve_performance" | "stay_active" | "lose_weight" | "meet_people" | "other";
export type DbBudgetRange = "free" | "up_to_100" | "100_200" | "200_300" | "more_than_300" | "not_sure";
export type DbMatchEnvironment = "competitive" | "social" | "recreational" | "family" | "high_performance" | "inclusive";
export type DbMatchLabel = "excellent_match" | "very_good_match" | "good_match" | "possible_match" | "weak_match";
```

### 3.5 `app/src/lib/data/matchSessions.ts` (new) — the write layer

```ts
import { supabase } from "./supabaseClient";
import { getSportId } from "./sports";
import { getDistrictId } from "./districts";
import { mapSportToSlug } from "./mappers";
import { buildMatchSessionRow, buildMatchResultRows } from "./sessionMappers";
import type { MatchResult, SportMatchAnswers } from "../../types";

export interface PersistMatchOutcome {
  matchSessionId: string;
  persisted: boolean; // false = write failed; results are still valid, per FR-009
}

export async function createMatchSession(
  answers: SportMatchAnswers,
  results: MatchResult[]
): Promise<PersistMatchOutcome> {
  const matchSessionId = crypto.randomUUID();
  try {
    const sportSlug = mapSportToSlug(answers.sport);
    if (!sportSlug) throw new Error(`No DB sport slug for app Sport "${answers.sport}"`);

    const [sportId, districtId] = await Promise.all([
      getSportId(sportSlug),
      getDistrictId(answers.district),
    ]);

    const sessionRow = buildMatchSessionRow(matchSessionId, answers, sportId, districtId);
    const { error: sessionError } = await supabase.from("match_sessions").insert(sessionRow);
    if (sessionError) throw sessionError;

    if (results.length > 0) {
      const resultRows = buildMatchResultRows(matchSessionId, results);
      const { error: resultsError } = await supabase.from("match_results").insert(resultRows);
      if (resultsError) throw resultsError;
    }

    return { matchSessionId, persisted: true };
  } catch (err) {
    // FR-009: a save failure must never block or blank the results screen. Log for
    // observability (no PII beyond what's already in `answers`/`results`, which contain no
    // contact/location-precision data — district/sport are the coarse fields already shown
    // in the UI) and let the caller keep showing the already-computed results.
    console.error("[MatchPoint] Failed to persist match session", err);
    return { matchSessionId, persisted: false };
  }
}
```

Key properties:
- **Never throws.** All failure modes (sport/district lookup miss, network error, insert error) collapse to `{ matchSessionId, persisted: false }`, matching FR-009's "must still see results" guarantee at the layer responsible for persistence.
- **Session-first, results-second.** If the session insert fails, `match_results` is never attempted (its FK would fail anyway). If session succeeds but results insert fails, `persisted` is still reported `false` (simple binary signal — deliberately not split into `sessionPersisted`/`resultsPersisted` per PMV Scope Discipline; log output has the detail if needed).
- **Zero-result sessions are still attempted.** Per SC-002 ("100% of completed questionnaires produce exactly one stored session record"), the session insert happens even when `results.length === 0` (the "no strong match" case) — only the `match_results` insert is skipped when there's nothing to insert.
- `sportId`/`districtId` lookups and no other read run in parallel via `Promise.all` (both independent of each other and of the org catalog fetch, which happens earlier in the caller — see §6.2).

### 3.6 New test files

- `app/src/lib/data/sessionMappers.test.ts` — exhaustively covers every entry in `GOAL_MAP`/`BUDGET_MAP`/`ENVIRONMENT_MAP`/`LABEL_MAP`/`TIME_OF_DAY_MAP` (they're small, fully enumerable, and a single wrong DB enum string here fails silently at insert time — caught only by `createMatchSession`'s catch-all — unless a test pins it down explicitly). Also covers `buildMatchResultRows`' rank assignment (1-based, array order) and the `mapSportToSlug`/`mapLevelToDb`/`mapWeekdayToDayOfWeek` reverse-lookups added to `mappers.ts` (round-trip test: DB→app→DB should be the identity for every enum value).
- `app/src/lib/data/matchSessions.integration.test.ts` — live-DB integration test (`.integration.test.ts` suffix, excluded from default `npm test` per `vite.config.ts`'s existing exclude pattern, run explicitly like `organizations.integration.test.ts`). Proves against a real (seeded, migrated) Supabase project that: (a) an anon insert of a `match_session` + `match_results` succeeds; (b) attempting to `select()` from either table with the same anon client afterward returns zero rows (proves SC-005/FR-006 concretely, not just by policy inspection); (c) inserting a `match_session` with a non-null `user_id` is rejected by RLS (proves the impersonation guard). Requires migration `0009` applied to the target project before running.

## 4. `matching.ts` bug fix — `levelFit()` NaN

### 4.1 The bug

```ts
function levelFit(answers: SportMatchAnswers, org: Organization): number {
  if (org.schedules.length === 0) return 0.5;
  const ranks = org.schedules.map((s) => LEVEL_RANK[s.level]);   // s.level can be undefined
  const userRank = LEVEL_RANK[answers.level];
  const minDistance = Math.min(...ranks.map((r) => Math.abs(r - userRank)));  // NaN if any rank is undefined
  ...
}
```

`app/src/types.ts`'s `Schedule.level` is `level?: Level` (made optional in the 001-data-foundation code-review pass, because real seeded schedules legitimately have no confirmed level, per BR-016's no-fabrication rule — confirmed in `app/src/lib/data/mappers.ts`'s `mapSchedule()`: `level: s.level_min ? mapUserLevel(s.level_min) : undefined`, explicitly not defaulted). `LEVEL_RANK[undefined]` is `undefined`; `Math.abs(undefined - userRank)` is `NaN`; `Math.min(...[..., NaN, ...])` is `NaN`. This poisons `fits.level`, which poisons the entire weighted `score` (any term added to `NaN` is `NaN`), which poisons `labelFor(NaN)` — every comparison against `NaN` is `false`, so it silently falls through to the final `return "Weak Match"`. **User-visible symptom**: any organization with even one schedule lacking a confirmed level always shows as "Weak Match" regardless of true fit, with no crash and no visible error — exactly the "silently produce a nonsensical score" failure mode FR-004 and Edge Cases §1 call out.

### 4.2 The fix

Filter out schedules with no confirmed level before computing ranks; treat "zero schedules with a confirmed level" the same way the function already treats "zero schedules at all" — the existing neutral fallback (`0.5`), not a fabricated value (BR-016 stays satisfied: no level is invented, the function just has no signal to use and says so via the existing neutral score).

```ts
function levelFit(answers: SportMatchAnswers, org: Organization): number {
  const ranks = org.schedules
    .map((s) => s.level)
    .filter((level): level is Level => level !== undefined)
    .map((level) => LEVEL_RANK[level]);
  if (ranks.length === 0) return 0.5; // no confirmed-level schedule signal — neutral, not fabricated (BR-016)
  const userRank = LEVEL_RANK[answers.level];
  const minDistance = Math.min(...ranks.map((r) => Math.abs(r - userRank)));
  if (minDistance === 0) return 1;
  if (minDistance === 1) return 0.5;
  return 0.15;
}
```

Only this function changes. No new imports, no IO — `matching.ts` keeps its zero-Supabase-imports property (constitution Principle III's "unit-testable without a database or network").

### 4.3 Test-first requirement (constitution Principle III, NON-NEGOTIABLE)

`matching.ts` currently has **no test file at all** (confirmed: no `app/src/lib/*.test.ts` exists). The mock-data UI-shell milestone was allowed to skip TDD per `CLAUDE.md`'s "throwaway/shell-only pass" exception; this feature moves matching.ts into real engineering, so that exception no longer applies. Create `app/src/lib/matching.test.ts` with, in this order (write failing tests first, per TDD):

1. **Regression test for the exact bug**: an `Organization` fixture whose schedules all have `level: undefined` (mirroring real mapper output for an unconfirmed-level org), answers chosen so other fit dimensions are strong. Assert `Number.isFinite(result.score)` and `result.score > 0` — this test must fail against the current code (score is `NaN`, `Number.isFinite(NaN)` is `false`) and pass after the fix.
2. **Mixed-schedule case**: some schedules with a level, some without — assert only the leveled ones are considered (result should match what you'd get if the undefined-level schedules were removed entirely).
3. **Baseline/no-regression case**: all schedules have a confirmed level, exact match to `answers.level` — assert `levelFit`-driven behavior is unchanged from before the fix (e.g. via the resulting score/label for a controlled fixture).
4. **Shape-integration smoke test**: run `calculateMatches` against 2-3 `Organization` fixtures shaped like real `mapOrganizationRow()` output (same `app/src/types.ts` `Organization` type — no adapter needed, they're already the same type) to catch any future drift between the mapper's output shape and what `matching.ts` expects, since this feature is the first time real DB-sourced organizations flow into this function.

## 5. Geo/matching correctness checklist (per `geo-matching-review`)

Applied deliberately to this plan's design choices, not just the code fix:

1. **No radius/haversine introduced.** This plan adds no distance math — `locationFit()`'s existing district-equality/adjacency model (`ADJACENT_DISTRICTS`) is untouched, consistent with `docs/matching-engine.md`'s "V1 uses district matching, not distance radius."
2. **Missing-district handling unaffected.** `docs/matching-engine.md`'s rule ("Missing district → exclude from location-based recommendations") is already encoded in the seeded-organization eligibility check (`meetsMinimumDataset()` in `organizations.ts` requires `org.districts.length > 0`) — organizations with no venue/district never reach `getOrganizations()`'s result set at all, so `matching.ts` never sees one. Nothing in this plan changes that gate.
3. **Do not pre-filter the catalog by district or sport when fetching for matching** (see §6.2 below) — pre-filtering would silently break the adjacent-district scoring (0.6) and the existing sport-fit-is-soft-not-hard-exclude behavior that's already baked into `matching.ts`. This is the single most important design decision in this plan; get it wrong and you change matching behavior while believing you only changed the data source.
4. **Ranking transparency preserved.** No change to `reasonsFor()` or the weighted-scoring formula; every persisted `match_results.reasons` value is the exact array `matching.ts` already generates — nothing is reimplemented outside the centralized module.
5. **Performance**: fetching the full active/eligible catalog (no server-side filter) is fine at PMV scale (9-50 seeded organizations, per the 001-data-foundation integration test's `toBeGreaterThanOrEqual(9)`) — revisit (e.g. add a genuine server-side pre-filter, or move scoring server-side) only once the catalog grows enough that shipping the full set client-side becomes a real cost. Document this as a known, deliberate scale assumption, not an oversight.

## 6. Wiring: questionnaire completion → matching → persistence → results

### 6.1 Current flow (mock, to be replaced)

`SportMatch.tsx`'s last-question handler calls `updateAnswers(...)`, then `setTimeout(1500, () => { finalizeMatch(); navigate("/match/results") })`. `MatchSessionContext.finalizeMatch()` is synchronous: it reads `organizations` (the hardcoded mock array from `app/src/data/organizations.ts`) inside a `setState` updater, calls `calculateMatches()`, and returns.

### 6.2 New flow

`getOrganizations()` (no scoping params — see §5.3) fires as early as possible, in parallel with the sport/district id lookups needed for persistence, then matching runs, then persistence is attempted, then UI state updates:

```ts
// MatchSessionContext.tsx
const finalizeMatch = useCallback(async (): Promise<MatchResult[]> => {
  const answers = state.answers as SportMatchAnswers;
  let computed: MatchResult[] = [];
  try {
    const orgs = await getOrganizations(); // broad fetch — see §5.3, no sportSlug/districtName params
    computed = calculateMatches(answers, orgs);
  } catch (err) {
    console.error("[MatchPoint] Failed to load organization catalog for matching", err);
    computed = []; // degrade to the existing no-results screen, not a crash
  }

  const { matchSessionId, persisted } = await createMatchSession(answers, computed);
  if (persisted) {
    track({ name: "sport_match_completed", matchSessionId, sport: answers.sport, district: answers.district });
  }

  setState((s) => ({ ...s, matchSessionId, matchSessionPersisted: persisted, results: computed }));
  return computed;
}, [state.answers]); // NOTE: dependency array must include state.answers — see §6.3
```

`SportMatch.tsx`'s handler simplifies to:

```ts
if (isLast) {
  setMatching(true);
  void finalizeMatch().finally(() => navigate("/match/results"));
  return;
}
```

The "Estoy buscando comunidades..." loading screen JSX is unchanged. Optionally wrap with a minimum-duration guard (`Promise.all([finalizeMatch(), delay(1200)])`) purely for UX pacing so a very fast response doesn't flash the loading screen — cosmetic, not required for correctness.

### 6.3 A real correctness trap for the implementer: `useCallback` dependencies

The current mock `finalizeMatch` has `[]` as its dependency array and gets away with it because all its work happens **inside** the `setState(updater)` callback, which React guarantees receives the latest pending state (including the just-flushed final answer from `updateAnswers`) regardless of when the callback itself was created. Once `finalizeMatch` becomes `async` and needs to call `getOrganizations()`/`createMatchSession()` — which must happen **outside** any `setState` updater, since updater functions must be synchronous and side-effect-free — it can no longer rely on that trick. **`state.answers` must be read directly in the callback body, and `state.answers` must be added to the `useCallback` dependency array**, or the callback will close over a stale (possibly incomplete) answers object. This is not a style nit; without it, the last-answered question can be silently dropped from matching.

### 6.4 `getOrganization()` and `confirmPendingContact()` — required plumbing fix

`MatchSessionContext.tsx` currently has two other call sites reading the mock `organizations` array by id: `getOrganization(id)` (used by `OrganizationProfile.tsx`) and `confirmPendingContact()` (used by the post-login contact flow). Once real organizations replace the mock array as the matching data source, these must be repointed at the session's own results — **not** at a new "fetch one organization by id" data-access call, which would be scope creep beyond "minimally needed to pass real results through":

```ts
const getOrganization = useCallback(
  (id: string) => state.results.find((r) => r.organization.id === id)?.organization,
  [state.results]
);
```

Same swap for `confirmPendingContact`'s `organizations.find(...)` → `state.results.find(...)`. This is sufficient because `OrganizationProfile.tsx` is only ever reached by clicking a result card from the current session's results (route `/organizations/:id`) — there is no independent "browse all organizations" surface in PMV scope. **Do not delete `app/src/data/organizations.ts`** — its `DISTRICTS` constant is still imported by `SportMatch.tsx` for the district-picker question UI (a separate, legitimate use unrelated to matching data), and the questionnaire UI is explicitly out of scope for this feature.

One consequence worth flagging explicitly, not silently accepting: if a user refreshes or deep-links directly to `/match/results` or `/organizations/:id` (losing in-memory React state), `getOrganization` now returns `undefined` for every id — but this is not a regression, because `OrganizationProfile.tsx` already has a graceful fallback for `!organization` ("Esta comunidad ya no está disponible..."), and the spec's own Assumptions section says resuming a prior session on refresh is explicitly not required this milestone.

### 6.5 A forward-compatibility flag for whoever builds Milestone 5 (Lead creation)

`SessionState` should track **both** `matchSessionId` and a new `matchSessionPersisted: boolean` (default `false`, reset in `resetMatch`). Reason: if `createMatchSession` fails (network blip), `matchSessionId` still holds a client-generated UUID that was **never actually written** to the database. A future Lead-creation flow that blindly sets `Lead.match_session_id = state.matchSessionId` would violate `leads.match_session_id`'s FK constraint (references `match_sessions(id)`) whenever that flag is `false`, since the referenced row doesn't exist. Milestone 5's implementer must either omit the FK reference (`null`) or retry session persistence first when `matchSessionPersisted` is `false`. This plan does not implement Lead creation, but it must not leave a trap for it — hence surfacing `matchSessionPersisted` in state now, not inventing it later under time pressure.

## 7. Analytics utility (`app/src/lib/analytics.ts`, new)

Spec's Assumptions section: "a lightweight, pluggable event-tracking mechanism... no real provider needed, a simple swappable tracking call is sufficient." Minimal, per PMV Scope Discipline (constitution Principle V) — do not build a full analytics SDK for two events.

```ts
import type { Sport } from "../types";

export type AnalyticsEvent =
  | { name: "sport_match_completed"; matchSessionId: string; sport: Sport; district: string }
  | { name: "results_viewed"; matchSessionId: string; resultCount: number };

type Tracker = (event: AnalyticsEvent) => void;

let tracker: Tracker = (event) => {
  if (import.meta.env.DEV) console.info("[analytics]", event.name, event);
};

/** Swap the sink when a real provider (PostHog/GA4/etc.) is wired up — no call site changes. */
export function setTracker(fn: Tracker): void {
  tracker = fn;
}

export function track(event: AnalyticsEvent): void {
  tracker(event);
}
```

- The `AnalyticsEvent` union is intentionally the extension point for the rest of BR-027's event list (open, start match, open profile, click contact, login complete, lead created, external contact opened) — those get added as new union members by whichever future feature implements them, reusing this same `track()`/`setTracker()` pair, not a new mechanism. Only the two events this feature's FR-007/FR-008 require are wired now.
- Payloads deliberately carry only coarse, already-user-visible fields (`sport`, `district` — same precision already shown in the UI) — no raw answers dump, no contact info, consistent with `docs/security-standards.md`'s "location and contact data are excluded from logs/analytics by default (allow-list, not deny-list)."

### 7.1 Call sites

- **`sport_match_completed`** (FR-007: "record... when a session is successfully created") — fired inside `finalizeMatch()` (§6.2), **conditioned on `persisted === true`**. This is a literal reading of FR-007's wording ("when the session is successfully created"), meaning a transient persistence failure also suppresses this event. Flagging this explicitly as a deliberate interpretation, not an oversight: an alternative reading ("the user did complete the questionnaire regardless of DB write success") would fire the event unconditionally. If the product owner wants funnel counting to reflect questionnaire completion independent of write success, that's a one-line change (move the `track()` call above the `persisted` check) — worth a quick confirmation since it directly affects PMV launch funnel numbers (`docs/roadmap.md`'s "60%+ Sport Match™ completion rate" target).
- **`results_viewed`** (FR-008: "exactly once per view, not once per re-render") — fired from `Results.tsx` in a mount-only effect:

```ts
useEffect(() => {
  if (results.length > 0 && matchSessionId) {
    track({ name: "results_viewed", matchSessionId, resultCount: results.length });
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally mount-only, not per FR-008
```

Empty dependency array is deliberate and satisfies "not once per re-render" by construction (re-renders within the same mount don't re-run a `[]`-effect); it does NOT fire for the zero-results ("no strong match") case, which arguably should still count as "viewed the results screen" for funnel purposes — flag for the same product-owner confirmation as above, or track it as a distinct outcome if the funnel needs to distinguish "viewed results with matches" from "viewed no-match screen."

## 8. `docs/api-contracts.md` — implementation note, no contract change

`POST /api/match-sessions`'s documented request/response JSON shape is unchanged and does not need rewriting — the contract doc's own preamble already allows "Next.js server actions, route handlers, **or Supabase queries**" as valid implementations, and this feature implements it as a direct Supabase client insert (mirroring how `GET /api/organizations`-equivalent reads are already implemented via `getOrganizations()`, with no literal HTTP route). Add one implementation note under that section per `docs/base-standards.md`'s "every PR touching an endpoint updates the contract doc in the same PR":

> Implementation note (`002-sport-match-engine`): implemented as a direct Supabase client insert from the browser (`anon` role, RLS-gated per migration `0009`), not a server route — see `app/src/lib/data/matchSessions.ts`. The JSON shapes above describe the logical contract; the app's in-memory `SportMatchAnswers`/`MatchResult` types carry the same information and are translated to DB rows by `app/src/lib/data/sessionMappers.ts`.

## 9. File change checklist

**New:**
- `supabase/migrations/0009_match_session_results_anon_insert.sql`
- `app/src/lib/data/sports.ts`
- `app/src/lib/data/districts.ts`
- `app/src/lib/data/sessionMappers.ts`
- `app/src/lib/data/sessionMappers.test.ts`
- `app/src/lib/data/matchSessions.ts`
- `app/src/lib/data/matchSessions.integration.test.ts`
- `app/src/lib/analytics.ts`
- `app/src/lib/matching.test.ts`

**Modified:**
- `app/src/lib/matching.ts` — `levelFit()` only (§4.2)
- `app/src/lib/data/mappers.ts` — add `mapSportToSlug`, `mapLevelToDb`, `mapWeekdayToDayOfWeek` (§3.3); no existing exports changed
- `app/src/lib/data/types.ts` — add `DbMatchGoal`, `DbBudgetRange`, `DbMatchEnvironment`, `DbMatchLabel` (§3.4)
- `app/src/context/MatchSessionContext.tsx` — async `finalizeMatch`, new `matchSessionPersisted` state field, `getOrganization`/`confirmPendingContact` repointed at `state.results` (§6.2-6.5)
- `app/src/pages/SportMatch.tsx` — last-question handler awaits `finalizeMatch()` instead of `setTimeout` (§6.2)
- `app/src/pages/Results.tsx` — mount-effect firing `results_viewed` (§7.1)
- `docs/database-schema.md` — RLS notes addition (§2.4)
- `docs/api-contracts.md` — implementation note under `POST /api/match-sessions` (§8)

**Explicitly not modified:** `app/src/data/organizations.ts` (its `DISTRICTS` export is still needed), `app/src/lib/data/organizations.ts`, `app/src/lib/labels.ts`, `app/src/pages/OrganizationProfile.tsx`, anything under Lead/auth.

## 10. Workflow gates for the implementer (per `docs/base-standards.md`)

- This touches `docs/database-schema.md`-adjacent code (new migration) → run the `data-model-review` skill before merging.
- This touches matching code → run the `geo-matching-review` skill against the actual diff (this plan pre-applied its checklist in §5, but the skill should re-run on real code, not just the plan).
- This does **not** touch auth, location precision, contact-info visibility, or moderation — `trust-safety-review`/`security-privacy-auditor` are not required gates for this specific feature (Lead/contact flow, where they *are* required, is Milestone 5).
- TDD is NON-NEGOTIABLE for §4 (matching bug fix) per constitution Principle III — the regression test must be written and observed failing before the fix lands, not after.
