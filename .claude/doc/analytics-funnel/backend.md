# Backend Plan — Analytics & Funnel Measurement (Milestone 6)

Feature: `005-analytics-funnel` · Branch: `005-analytics-funnel` (off `main`, which has 001–004 merged) · Spec: `specs/005-analytics-funnel/spec.md`

Status: PLAN ONLY, no code/migration changes made. Feeds `/speckit-plan`'s Phase 0 `research.md` + Phase 1 `data-model.md`/`contracts/` for this feature (`specs/005-analytics-funnel/plan.md` is still the unfilled template as of this writing). Depth/structure mirrors `.claude/doc/auth-lead-creation/backend.md` (004's equivalent plan), which is the precedent for RLS-migration style, client-generated-id rationale, and the mapper/write-layer split used throughout.

---

## 0. Correction to the task brief before designing anything

Two claims in the brief don't survive a check against the actual code — flagging both explicitly per this agent's own instruction not to design around a wrong premise silently.

**0.1 — Only 5 of the 9 BR-027 steps are currently tracked, not 7.** `docs/business-rules.md` BR-027 lists exactly: *open, start match, complete match, view results, open profile, click contact, login complete, lead created, external contact opened*. Grepping `track({` across `app/src` finds 7 total call sites, but two of them (`no_match_viewed`, `login_started`) are **not** among BR-027's 9 — they're separate, already-shipped events from 002/004 that happen to share the same mechanism. Mapping the real 7 against the real 9:

| BR-027 step | Tracked today? |
|---|---|
| app opened | ❌ missing |
| match started | ❌ missing |
| complete match | ✅ `sport_match_completed` (`MatchSessionContext.tsx`) |
| view results | ✅ `results_viewed` (`Results.tsx`) |
| open profile | ❌ **missing** — no call site anywhere in `OrganizationProfile.tsx` |
| click contact | ❌ missing (as its own event, distinct from `lead_created`) |
| login complete | ✅ `login_completed` (`MatchSessionContext.tsx`) |
| lead created | ✅ `lead_created` (`MatchSessionContext.tsx`) |
| external contact opened | ✅ `external_contact_opened` (`ContactSuccess.tsx`) |

So **4 events are missing, not 3**: `app_opened`, `match_started`, `profile_opened`, and `contact_clicked`. The brief's "profile opened" step was silently dropped from its own gap list even though it names `OrganizationProfile.tsx` in the very next sentence — this plan restores it as a fourth new event (§4).

**0.2 — The spec's Assumption about visit correlation is wrong, not just imprecise.** `specs/005-analytics-funnel/spec.md`'s Assumptions section states: *"Visit correlation for anonymous (pre-login) visitors reuses the identifier approach already established for anonymous Sport Match™ sessions, rather than introducing a new identity scheme."* There is no such established, working scheme. `match_sessions.anonymous_id` exists as a column (migration `0006`) but `sessionMappers.ts`'s own comment confirms it: *"anonymous_id is deliberately omitted (stays DB-null) — nothing reads it yet."* Nothing writes it either, per `buildMatchSessionRow`. **This assumption must be corrected when `specs/005-analytics-funnel/research.md` is authored** (Phase 0 of `/speckit-plan`) — record it there as: *"No pre-existing anonymous-visitor identifier scheme exists to reuse; this feature introduces a new one (`visit_id`), following the project's established client-generated-UUID pattern instead of a 'reuse' that was never actually built."* See §3 for the recommended design.

Neither correction changes the feature's scope or the owner's already-confirmed decisions (Supabase table, no dashboard, SQL-Editor queries) — they only change what "already exists" means for two of the plan's inputs.

---

## 1. What this plan does NOT touch

- **No change to `leads`, `match_sessions`, `match_results`, `users`, or `organizations` schemas.** No new columns anywhere except the one new table.
- **No retrofit of `match_sessions.anonymous_id`.** Considered and rejected — see §3.3.
- **No matching/ranking algorithm change.** `geo-matching-review` is not a required gate.
- **No dashboard UI, no new admin surface, no new in-app screen.** Confirmed PMV-scope by the spec's Assumptions; the deliverable is a separate SQL doc (not authored by this plan — see §7 for what it needs from the schema).
- **No consent/opt-out mechanism.** Explicitly out of scope per the spec's own Assumptions (a pre-existing gap flagged in a prior milestone's security review, not this milestone's to close).
- **No rename of existing `AnalyticsEvent` members.** `sport_match_completed` and `no_match_viewed` keep their historical code names rather than being renamed to BR-027's prose ("match completed") — renaming wasn't asked for and would touch existing call sites for no funnel-analysis benefit (the DB enum stores whatever string `track()` already emits, verbatim).

---

## 2. Data model / schema cross-check

Read `docs/data-model.md`, `docs/database-schema.md`, and all eleven existing migrations before writing this plan.

- No existing entity needs a field added. This is a genuinely new entity: **AnalyticsEvent** (the spec's Key Entities section calls it "Funnel Event" — same concept, different label; recommend `docs/data-model.md` use "AnalyticsEvent" to match the already-shipped `app/src/lib/analytics.ts` module name, and note the spec's synonym in one sentence so the two docs don't silently drift into two different names for one thing).
- It has no enforced FK relationship to any existing table (see §5.2 for why), so it doesn't belong in `docs/data-model.md`'s mermaid ER diagram the way `Lead`/`MatchResult` do — not because it's deferred/unbuilt like `Event`/`Coach`, but because it has no relationships to draw. `docs/data-model.md` needs a new prose section instead (see §8 for the exact addition).
- `docs/database-schema.md` needs a new `### analytics_events` table section, a new RLS-notes bullet, and a new migration-order entry (steps currently end at 16; this is effectively step 17, added incrementally the same way `0009`–`0011` were).

---

## 3. The visit-correlation identifier — decision

### 3.1 Options considered

1. **Durable per-browser visitor id** (localStorage, generated once, survives forever). Rejected: this project has no consent/opt-out mechanism (explicitly out of scope, §0.2/spec Assumptions) and no stated need for cross-session identity — a persistent id that outlives the browsing session is a heavier privacy posture than this feature asks for, and the spec's own Edge Cases section explicitly says the SQL queries operate on "funnel steps within a correlated **visit**, not unique-visitor counts" — i.e., the product need is per-visit, not per-person-over-time.
2. **Reuse/derive from `matchSessionId`** (`crypto.randomUUID()`, generated in `MatchSessionContext.tsx`'s `finalizeMatch`). Rejected outright by the brief itself and confirmed by reading the code: `matchSessionId` is `null` until the questionnaire's *last* question is answered — it does not exist yet when `app_opened` or `match_started` need to fire, which is the whole first half of the funnel.
3. **Per-visit id, generated on app load, stored in `sessionStorage`.** **Recommended.**

### 3.2 Why sessionStorage, not localStorage, and why this is the right lifetime

This mirrors `app/src/lib/pendingContact.ts`'s already-shipped rationale (research.md R9, `004-auth-lead-creation`) almost exactly: `sessionStorage` survives a same-tab reload **and** the full-page OAuth redirect round-trip (confirmed working today — `pendingContact` already relies on exactly this to survive `signInWithOAuth`'s navigation away from the SPA), which is precisely what's needed to satisfy the spec's Edge Case: *"events belonging to an anonymous visit that later logs in... remain correlated by the existing visit/session identifier"* — the same `visit_id` a visitor got on `app_opened` is still present in `sessionStorage` when they land back on `/auth/callback` after Google login, so `login_completed`/`lead_created`/`external_contact_opened` naturally carry the same value with zero extra plumbing. It clears on tab close, which is also correct: the spec explicitly says repeat visits are **not** deduplicated and a reload fires its own fresh `app_opened` — `sessionStorage`'s clear-on-close boundary is what makes a *new tab* a new visit, matching that stated semantics, whereas `localStorage` would blur "visit" into "device" and contradict the spec's own framing.

### 3.3 Explicitly rejected: retrofitting `match_sessions.anonymous_id`

The brief highlights that this column is unused and asks for a decision. Considered writing the new `visit_id` into it (would require threading a new parameter through `buildMatchSessionRow` → `createMatchSession` → `finalizeMatch`, all three already-shipped from `002`/`004`). **Rejected**: the new `analytics_events` table already carries `match_session_id` directly (a real, already-resolved uuid, populated on the `sport_match_completed`/`results_viewed`/`no_match_viewed` events) — any query that would have joined through `anonymous_id` can join through `analytics_events.match_session_id` instead, with no schema change to `match_sessions` at all. Retrofitting `anonymous_id` would add scope (three modified files in an already-shipped feature) for a join path this plan doesn't need. `anonymous_id` stays unused; flag this as a candidate for a future cleanup note in `docs/database-schema.md` (not actioned here — out of scope).

### 3.4 Where it's generated/stored/read

New module `app/src/lib/visitId.ts` — pure, no Supabase import, unit-testable with a mocked `Storage`, same shape as `pendingContact.ts`:

```ts
const KEY = "matchpoint:visitId";

export function getOrCreateVisitId(): string {
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}
```

Called from the new Supabase-writing tracker sink (§6.2) on every event — cheap `sessionStorage` read, no separate app-boot "start a visit" step needed. First call (triggered by `app_opened`, §4) creates it; every subsequent call in the same tab reads the same value back.

---

## 4. New `AnalyticsEvent` union members and call sites

Add to `app/src/lib/analytics.ts`'s existing union (the documented extension point — no new mechanism, per the spec's own Assumptions):

```ts
| { name: "app_opened" }
| { name: "match_started" }
| { name: "profile_opened"; organizationId: string; resultRank: number | null }
| { name: "contact_clicked"; organizationId: string; contactType: ContactType; resultRank: number | null }
```

`app_opened`/`match_started` carry no extra fields — nothing domain-specific is known yet at either point (no sport/goal answered, no org chosen). Keep them minimal rather than inventing speculative payload fields.

**Call sites:**

- **`app_opened`** — `app/src/App.tsx`, a new mount-time `useEffect(() => { track({ name: "app_opened" }); }, [])` inside the `App()` component (currently has no hooks at all — needs the `useEffect`/`track` imports added). Fires on every mount, including a same-tab reload **and** the remount that happens when the browser lands back on `/auth/callback` after the OAuth full-page redirect (that's a real document navigation, not an SPA route change — `App.tsx` genuinely remounts). This is intentional, not a bug: the spec's own Edge Cases section says repeat "app opened" triggers within one sitting are each recorded as their own event, not deduplicated.
- **`match_started`** — `app/src/pages/SportMatch.tsx`, a new mount-time `useEffect` (empty deps), mirroring `Results.tsx`'s existing `results_viewed`/`no_match_viewed` pattern exactly (line 15–23 there). Recommended over firing on `Welcome.tsx`'s "Comenzar Sport Match™" button click because a user can land on `/match` directly (browser back/forward, refresh) without going through `Welcome.tsx`'s click handler — the mount is the more reliable "started" signal, matching how "completed" is already keyed to `finalizeMatch` running, not to any particular button.
- **`profile_opened`** — `app/src/pages/OrganizationProfile.tsx`, a new mount-time `useEffect`, guarded on `organization` actually resolving (i.e. skip the branch that renders "Esta comunidad ya no está disponible..." — that's a failed lookup, not a successful profile open, and BR-027's "open profile" step is about the successful case). Payload: `{ organizationId: organization.id, resultRank }` (the `resultRank` already read from `location.state` at the top of the component, line 32).
- **`contact_clicked`** — `app/src/pages/OrganizationProfile.tsx`'s `handleContact()`, as the **very first line**, before `setContactState("sending")` and before the `requestContact(...)` call. This is what FR-002 requires literally: recorded "independent of and prior to knowing" the outcome (login-redirect, immediate success, org-unavailable, or lead-save failure all follow this line). Payload: `{ organizationId: organization.id, contactType: primaryContact.type, resultRank }`.

No changes needed to the 7 existing call sites — they already fire correctly; this feature only changes where their output *goes* (§6).

---

## 5. New migration: `supabase/migrations/0012_analytics_events.sql`

### 5.1 One file, not split like `004`'s `0010`/`0011`

`004` split its RLS work into two migrations because it touched two structurally separate, already-existing tables (`users`, then `match_sessions`/`match_results`) with two distinct rationales. Here there is one brand-new table needing both an `anon` and an `authenticated` insert policy for the *same* reason (a visitor can go from anonymous to logged-in mid-funnel, per the task brief) — no reason to split table DDL from its own RLS across files when nothing else depends on the table existing first. Recommend a single `0012_analytics_events.sql` containing the enum, table, indexes, and both policies.

### 5.2 Deliberate design choice: no foreign keys on any correlation column

`user_id`, `organization_id`, `match_session_id`, `lead_id`, `sport_id`-equivalent, and `district`-equivalent columns are **plain `uuid`/`text`, not `references`**. This is a real divergence from the rest of the schema's FK-heavy style and needs to be flagged explicitly for `data-model-review`, not silently done:

- **Reliability**: this table's entire job is best-effort telemetry (FR-005: "MUST NOT block, delay, or visibly fail any user-facing action"). An FK violation would turn a *should-never-fail* write into one that fails deterministically. A concrete race exists today: `MatchSessionContext.tsx`'s boot-time `onAuthStateChange` listener calls `ensureUserRow(session.user)` **fire-and-forget** (`void ensureUserRow(...).catch(...)`, not awaited) before setting `isLoggedIn`/`userId` in state — so an analytics event carrying that `userId` could reach the DB before the corresponding `users` row commits. With no FK, that's harmless (an orphaned `user_id` value in a telemetry row). With an FK, it's an intermittent silent write failure for exactly the kind of event (a freshly-logged-in user's first action) the funnel most wants to capture.
- **Future-proofing against deletion**: `docs/security-standards.md` requires an eventual deletion path for User accounts (Peru's Ley 29733). An FK from a high-volume analytics table to `users(id)` would need explicit `ON DELETE` handling (cascade would silently erase funnel history; set-null would need to be added everywhere) the moment that path ships. Plain `uuid` sidesteps the whole problem — a deleted user's historical rows simply keep a now-meaningless id, which is the normal, accepted behavior for analytics/log tables industry-wide.

`contact_type` is the one exception: it reuses the **existing** `contact_type` enum type (already defined in `0001`) as its column type, not an FK — enums have no referential-integrity failure mode, so there's no reliability cost to reusing it, and it avoids inventing a second, parallel vocabulary for the same five values (same discipline as `ContactType`/`DbContactType` in `004`).

### 5.3 Deliberate design choice: no `jsonb` payload column

Per the task's "payload discipline" requirement and `docs/security-standards.md`'s allow-list posture: narrow, explicitly-typed, nullable columns per field actually used by *some* event, not a catch-all blob. This is a small, sparse table by design (most columns are `null` for most rows, depending on `event_name`) — acceptable at PMV volume and it keeps every column self-documenting and greppable, instead of inviting a future author to stuff an arbitrary key into a jsonb blob that quietly reintroduces the PII/precision risk this discipline exists to prevent.

### 5.4 Migration body

```sql
-- MatchPoint — migration 0012: analytics_events (Milestone 6 / 005-analytics-funnel).
--
-- Durable storage for BR-027's funnel events. app/src/lib/analytics.ts's track()/setTracker()
-- mechanism already exists (console-only default sink); this table is the new sink's
-- destination, wired up in app/src/main.tsx via installSupabaseAnalyticsSink()
-- (app/src/lib/data/analyticsEvents.ts). See backend plan
-- .claude/doc/analytics-funnel/backend.md for full rationale.
--
-- Design mirrors 0009/0011's match_sessions/match_results precedent: INSERT-only for BOTH anon
-- and authenticated roles, NO SELECT policy for any client role — the product owner queries this
-- table directly via the Supabase SQL Editor (dashboard/service-role context, bypasses RLS), per
-- this feature's explicit "no dashboard UI" decision. A visitor can go from anonymous to
-- logged-in mid-funnel, so both roles need insert access to this one new table (unlike 004's
-- two-migration split, which touched two structurally separate PRE-EXISTING tables).
--
-- Deliberately NO foreign keys on user_id/organization_id/match_session_id/lead_id. This table's
-- purpose is best-effort telemetry, not referential integrity: an FK violation (e.g. a race
-- between onAuthStateChange's fire-and-forget ensureUserRow() and an analytics write carrying
-- the same not-yet-committed user_id) must never cause event loss beyond what already happens
-- when Supabase itself is unreachable. Plain uuid columns also avoid needing ON DELETE handling
-- here once a User-deletion path (docs/security-standards.md, Peru Ley 29733) exists.
--
-- event_name's values match app/src/lib/analytics.ts's AnalyticsEvent["name"] union VERBATIM —
-- no translation table (same discipline as ContactType/LeadSource, 004-auth-lead-creation).
-- Includes all 11 currently-defined events (BR-027's required 9, plus the 2 pre-existing extras
-- no_match_viewed/login_started) — cheap to store and useful for diagnosing e.g. abandoned OAuth
-- (login_started with no matching login_completed), even though only 9 are FR-001's requirement.
-- sport_match_completed/no_match_viewed keep their historical code names rather than being
-- renamed to BR-027's prose — renaming wasn't asked for and would touch existing call sites.

create type analytics_event_name as enum (
  'app_opened',
  'match_started',
  'sport_match_completed',
  'results_viewed',
  'no_match_viewed',
  'profile_opened',
  'contact_clicked',
  'login_started',
  'login_completed',
  'lead_created',
  'external_contact_opened'
);

create table analytics_events (
  id uuid primary key default gen_random_uuid(), -- DB-generated is fine here: nothing ever reads
                                                    -- this id back (unlike match_results/leads,
                                                    -- which needed client ids for a downstream FK).
  visit_id uuid not null,        -- client-generated per browser-tab visit (lib/visitId.ts). NOT
                                  -- match_sessions.anonymous_id — that column stays unused by
                                  -- design (backend plan §3.3).
  user_id uuid,                  -- no FK (see migration comment above); null for anon-role writes
                                  -- and for any authenticated write that chooses not to attach it.
  event_name analytics_event_name not null,

  sport text,                    -- raw app-level Sport value (e.g. "running"), not a sport_id
                                  -- lookup — avoids an extra network round trip on a
                                  -- must-never-block write path. District-level only, per
                                  -- docs/security-standards.md.
  district text,                 -- raw district name, same rationale as `sport`.
  match_session_id uuid,         -- no FK.
  result_count integer,
  organization_id uuid,          -- no FK.
  contact_type contact_type,     -- reuses the existing enum type (0001) — shared vocabulary.
  result_rank integer,
  lead_id uuid,                  -- no FK.
  login_provider text,           -- "google" | "apple" — plain text, matching users.auth_provider's
                                  -- own convention (also plain text, not an enum).

  created_at timestamptz not null default now()
);

create index idx_analytics_events_visit on analytics_events(visit_id);
create index idx_analytics_events_name_created on analytics_events(event_name, created_at);
create index idx_analytics_events_user on analytics_events(user_id) where user_id is not null;

alter table analytics_events enable row level security;

-- Anon: no identity to attribute to; user_id must be null (mirrors 0009's match_sessions policy
-- — `with check (user_id is null)` closes the same impersonation gap 0009 already documented).
create policy "anon_insert_analytics_events" on analytics_events
  for insert
  to anon
  with check (user_id is null);

-- Authenticated: user_id, when set, must be the caller's own id — never spoofable to someone
-- else's (mirrors 0011's anti-spoofing pattern) — but may also be left null. Unlike
-- match_sessions (where user_id is the primary correlation key), this table's primary
-- correlation key is visit_id; user_id is a best-effort enrichment, not load-bearing, so
-- permitting null here (rather than forcing every authenticated write to resolve it) keeps the
-- write path simpler and avoids adding a hard dependency on session lookup succeeding.
create policy "authenticated_insert_analytics_events" on analytics_events
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

-- No SELECT policy for anon or authenticated — admin/SQL-Editor-only reads (mirrors 0009).
```

---

## 6. `setTracker()` wiring: new data-access module, mirroring `leads.ts`/`leadMappers.ts`

### 6.1 Pure mapper — `app/src/lib/data/analyticsEventMappers.ts` (new)

No Supabase import — unit-testable, same discipline as `leadMappers.ts`/`sessionMappers.ts`. One function, an exhaustive `switch` over `AnalyticsEvent["name"]` (TypeScript's exhaustiveness checking here is a real asset — it forces a compile error if a 12th event variant is ever added without updating this mapper):

```ts
import type { AnalyticsEvent } from "../analytics";

export interface AnalyticsEventInsertRow {
  visit_id: string;
  user_id: string | null;
  event_name: AnalyticsEvent["name"];
  sport: string | null;
  district: string | null;
  match_session_id: string | null;
  result_count: number | null;
  organization_id: string | null;
  contact_type: string | null;
  result_rank: number | null;
  lead_id: string | null;
  login_provider: string | null;
}

export function buildAnalyticsEventRow(
  event: AnalyticsEvent,
  visitId: string,
  userId: string | null
): AnalyticsEventInsertRow {
  const base: AnalyticsEventInsertRow = {
    visit_id: visitId,
    user_id: userId,
    event_name: event.name,
    sport: null,
    district: null,
    match_session_id: null,
    result_count: null,
    organization_id: null,
    contact_type: null,
    result_rank: null,
    lead_id: null,
    login_provider: null,
  };

  switch (event.name) {
    case "app_opened":
    case "match_started":
      return base;
    case "sport_match_completed":
      return { ...base, match_session_id: event.matchSessionId, sport: event.sport, district: event.district };
    case "results_viewed":
      return { ...base, match_session_id: event.matchSessionId, result_count: event.resultCount };
    case "no_match_viewed":
      return { ...base, match_session_id: event.matchSessionId };
    case "profile_opened":
      return { ...base, organization_id: event.organizationId, result_rank: event.resultRank };
    case "contact_clicked":
      return {
        ...base,
        organization_id: event.organizationId,
        contact_type: event.contactType,
        result_rank: event.resultRank,
      };
    case "login_started":
    case "login_completed":
      return { ...base, login_provider: event.provider };
    case "lead_created":
      return { ...base, organization_id: event.organizationId, contact_type: event.contactType, lead_id: event.leadId };
    case "external_contact_opened":
      return { ...base, contact_type: event.contactType, lead_id: event.leadId };
  }
}
```

### 6.2 Thin write layer — `app/src/lib/data/analyticsEvents.ts` (new)

Unlike `leads.ts`'s `createLead` (must throw), this **must never throw and must never reject visibly** — it matches `createMatchSession`'s degrade-silently pattern exactly (task principle #5). `setTracker`'s `Tracker` type is synchronous (`(event: AnalyticsEvent) => void`); the actual write happens in a detached async IIFE so `track()` itself never becomes awaitable/blocking at any call site:

```ts
import { supabase } from "./supabaseClient";
import { setTracker } from "../analytics";
import { getOrCreateVisitId } from "../visitId";
import { buildAnalyticsEventRow } from "./analyticsEventMappers";
import type { AnalyticsEvent } from "../analytics";

/**
 * Swaps analytics.ts's default console-only sink for a durable Supabase-backed one. Never
 * throws, never blocks the caller of track() — matches createMatchSession's "degrade silently"
 * pattern (never createLead's "must throw" pattern): an analytics write failure must not surface
 * to the user or block any action, including the North Star Lead-creation flow.
 */
export function installSupabaseAnalyticsSink(): void {
  setTracker((event: AnalyticsEvent) => {
    void writeEvent(event);
  });
}

async function writeEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const visitId = getOrCreateVisitId();
    const {
      data: { session },
    } = await supabase.auth.getSession(); // locally-cached read, no network round trip in the
                                            // common case — resolves user_id when known without
                                            // requiring every track() call site to thread it through.
    const row = buildAnalyticsEventRow(event, visitId, session?.user.id ?? null);
    const { error } = await supabase.from("analytics_events").insert(row);
    if (error) throw error;
  } catch (err) {
    console.error("[MatchPoint] Failed to record analytics event", event.name, err instanceof Error ? err.message : err);
  }
}
```

**Why `supabase.auth.getSession()` inside the sink, instead of passing `userId` through every event payload**: only 4 new call sites are being added this feature; resolving `user_id` centrally in the sink means the existing 7 call sites need zero changes, and no call site needs access to `MatchSessionContext`'s state just to satisfy analytics (several call sites, like `Results.tsx`, already read `useMatchSession()` for other reasons, but `App.tsx`'s `app_opened` and future non-React callers of `track()` should not need to).

### 6.3 Bootstrap wiring — `app/src/main.tsx`

```ts
import { installSupabaseAnalyticsSink } from "./lib/data/analyticsEvents";

installSupabaseAnalyticsSink();

createRoot(document.getElementById("root")!).render(/* ... unchanged ... */);
```

Called once, synchronously, before `render()` — so the sink is installed before `App.tsx`'s mount effect fires `app_opened`, guaranteeing the very first event goes to the real sink, not the console-only default. (In practice ordering wouldn't matter even if reversed, since React effects run after the commit phase, but doing it before `render()` is the more obviously-correct "bootstrap" placement and avoids relying on that timing detail.)

---

## 7. What the (separately-authored) SQL queries doc needs from this schema

Not this plan's job to write the final queries (owner-confirmed: a separate markdown doc with runnable SQL), but confirming the table design actually answers all five:

1. **Weekly Sport Match™ completion rate**: `count(distinct visit_id) filter (where event_name = 'sport_match_completed')` / `count(distinct visit_id) filter (where event_name = 'match_started')`, grouped by `date_trunc('week', created_at)`. Both columns needed (`visit_id`, `event_name`, `created_at`) are present.
2. **Results→profile CTR**: same shape, `results_viewed` → `profile_opened`, joined on `visit_id`.
3. **Profile→contact CTR**: same shape, `profile_opened` → `contact_clicked`. **Flag for whoever writes the SQL doc**: to be organization-specific (did the visitor contact the *same* org whose profile they opened, not just any org during the same visit), the join needs to match on `(visit_id, organization_id)` together, not `visit_id` alone — both columns are present, but this is a query-correctness nuance worth calling out explicitly since a `visit_id`-only join would silently overcount.
4. **Leads/contacts generated count**: `count(*) filter (where event_name = 'lead_created')` over the date range (or a plain `count(*) from leads where created_at between ...`, using the already-existing `leads` table directly — either source works; the SQL doc should pick one as canonical rather than risk the two drifting).
5. **Step-by-step drop-off**: a `case` expression mapping `event_name` → an ordinal step number (per BR-027's canonical order), then `count(distinct visit_id)` per step. All needed columns present. The SQL doc must hardcode BR-027's 9-step order explicitly (this schema doesn't encode step ordering itself — deliberately not adding an `order` column since it would just duplicate BR-027's own list and risk drifting from it).

---

## 8. Doc updates required

- **`docs/data-model.md`**: new prose section, placed after `ProfileClaim`, before "Minimum launch dataset":

  > ## AnalyticsEvent
  >
  > Represents a single occurrence of one of BR-027's funnel steps (the spec for `005-analytics-funnel` calls this "Funnel Event" — same entity). Carries: which step (`event_name`), when, a visit-correlation identifier (`visit_id`, client-generated per browser-tab visit — not `MatchSession.anonymous_id`, which stays unused), and a narrow set of typed, nullable contextual fields relevant to that step only (sport, district, organization, contact type, result count/rank, lead id, login provider) — never raw free text or precise location, per `docs/security-standards.md`.
  >
  > Rules: written on every tracked funnel action, from an anonymous OR logged-in client; never blocks or fails visibly to the user if the write fails. Deliberately has **no enforced foreign keys** to `User`/`Organization`/`MatchSession`/`Lead` (see `docs/database-schema.md`'s divergence note on this table) — it is best-effort telemetry, not a referentially-integral record, and is excluded from this doc's ER diagram for that reason (not because it's deferred, unlike `Event`/`Coach`).

- **`docs/database-schema.md`**: new `### analytics_events` section (the table SQL from §5.4), a new RLS-notes bullet (mirroring the existing `0009`/`0011` bullets' style), and append to "Migration order" as a new final step.
- **`docs/api-contracts.md`**: short note, matching how `004` documented user provisioning having no dedicated contract — analytics event writes are a direct Supabase insert from `app/src/lib/data/analyticsEvents.ts` (`anon`/`authenticated` roles, RLS-gated by migration `0012`), not a REST-shaped endpoint; add one sentence under the API principles or as a small new subsection, not a fabricated `POST /api/analytics-events` endpoint that was never asked for.
- **`docs/business-rules.md`**: no change required — BR-027's wording already matches; optionally add "(migration `0012`, feature `005-analytics-funnel`)" the way other BRs' satisfied-by notes are sometimes annotated elsewhere, but not required.
- **`specs/005-analytics-funnel/research.md`** (to be authored by `/speckit-plan`'s Phase 0, not by this plan): must record the §0.2 correction (no pre-existing anonymous-visitor id scheme to reuse) and the §3 decision (new `visit_id`, sessionStorage-backed) as its own numbered entry, following the `004/research.md` R1–R13 style this plan has been cross-checked against.

---

## 9. Risks and flags for the implementer

- **No rate limiting on inserts** (same known, explicitly-deferred gap `0009`'s own comment already flagged for `match_sessions`/`match_results` — applies identically here: an edge-function/gateway layer would be needed if abuse is observed, not a schema change). Because this table has no SELECT policy for any client role, an anonymous flood of fake rows wouldn't leak anything, but it *would* silently pollute the funnel metrics this whole feature exists to produce — worth monitoring row-growth rate after launch, not solved here.
- **No retention/archival policy.** The table has no TTL, no partitioning, and nothing here defines one — at PMV/Lima-only scale this is unlikely to matter for months, but flag it now so it isn't rediscovered as a surprise later.
- **`StrictMode` double-invokes mount effects in dev** (`app/src/main.tsx` already wraps the tree in `<StrictMode>`). `app_opened`/`match_started`/`profile_opened`'s new `useEffect`s will double-fire in local dev the same way `Results.tsx`'s existing `results_viewed` effect already does — this is a pre-existing, accepted characteristic of the codebase's effect-based tracking pattern (dev-only; React does not double-invoke effects in a production build), not a new problem this feature introduces. No action needed, just don't be surprised by doubled rows while testing locally.
- **Volume/cost**: every `app_opened` fires on every reload and every post-OAuth-redirect remount, not just true first-visits (§4) — at PMV scale (Peru-only, pre-launch) this is negligible, but it's a real, uncapped multiplier on row count that's worth naming explicitly since the brief asked for it to be flagged even if out of scope to fix.
- **Auth/location adjacency**: this table stores `user_id` and district-level location at volume for the first time (previously that association only existed transiently in `leads`/`match_sessions`, which are already RLS-protected and low-volume). Recommend running the `trust-safety-review` skill before merge as a precaution — it doesn't cleanly trigger the letter of `docs/security-standards.md`'s "auth, location, contact-info visibility, or moderation" list (no new contact-info exposure, no new auth mechanism), but it does newly aggregate `user_id` + district + organization at a durability/volume this project hasn't had before, which is the kind of judgment call that review trigger exists for.

---

## 10. File change checklist

**New:**
- `supabase/migrations/0012_analytics_events.sql`
- `app/src/lib/visitId.ts` (`getOrCreateVisitId`) + `visitId.test.ts`
- `app/src/lib/data/analyticsEventMappers.ts` (`buildAnalyticsEventRow`, pure) + `analyticsEventMappers.test.ts`
- `app/src/lib/data/analyticsEvents.ts` (`installSupabaseAnalyticsSink`)

**Modified:**
- `app/src/lib/analytics.ts` — 4 new `AnalyticsEvent` union members (§4).
- `app/src/App.tsx` — mount effect firing `app_opened`.
- `app/src/pages/SportMatch.tsx` — mount effect firing `match_started`.
- `app/src/pages/OrganizationProfile.tsx` — mount effect firing `profile_opened` (guarded on `organization` resolving); `handleContact()` fires `contact_clicked` as its first statement.
- `app/src/main.tsx` — calls `installSupabaseAnalyticsSink()` before `render()`.
- `docs/data-model.md` — new `AnalyticsEvent` section (§8).
- `docs/database-schema.md` — new table section, RLS-notes bullet, migration-order entry (§8).
- `docs/api-contracts.md` — short implementation note, no new endpoint (§8).

**Explicitly not modified:** `app/src/lib/matching.ts`, `app/src/lib/data/sessionMappers.ts`/`matchSessions.ts` (no `anonymous_id` retrofit, §3.3), `app/src/lib/data/leads.ts`/`leadMappers.ts`, any existing migration file, `leads`/`match_sessions`/`match_results`/`users`/`organizations` table DDL.

---

## 11. Workflow gates for the implementer

- Touches `docs/database-schema.md`-adjacent code (one new migration, one new table) → run `data-model-review` before merging.
- Does **not** touch matching/ranking logic → `geo-matching-review` is not required.
- Recommend `trust-safety-review` per §9's judgment-call flag, even though this doesn't cleanly hit the letter of the auto-trigger list.
- TDD (constitution Principle III) applies to the two new pure modules: `analyticsEventMappers.ts` (exhaustive-switch mapping, same failure mode as `leadMappers.ts`/`sessionMappers.ts` — a wrong field name fails silently) and `visitId.ts` (pure, trivially testable with a mocked `sessionStorage`, same pattern as `pendingContact.test.ts`).
- No new RLS-authenticated-write testing gap beyond what `004`'s research.md R13 already flagged and resolved (manual/E2E verification once real OAuth credentials exist) — this feature's `anon`-role path (`app_opened`/`match_started`/`profile_opened`/`contact_clicked` before login) **can** be covered by a live-DB integration test following `002`'s existing `anon`-only pattern (`matchSessions.integration.test.ts`), since it needs no authenticated session; only the `authenticated`-role half needs the same manual-E2E treatment R13 already established.
