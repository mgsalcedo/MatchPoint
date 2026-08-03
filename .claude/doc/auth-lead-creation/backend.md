# Backend Plan — Real Auth & Lead Creation (North Star)

Feature: `004-auth-lead-creation` · Branch: `004-auth-lead-creation` (off `main`, which already has 001/002/003 merged) · Spec: `specs/004-auth-lead-creation/spec.md`

Status: PLAN ONLY, no code changes made. Feeds `/speckit-plan`'s Phase 0 `research.md` + Phase 1 `data-model.md`/`contracts/` for this feature. `specs/004-auth-lead-creation/plan.md` currently still holds the unfilled template — this document is the input for filling it, not a replacement for running `/speckit-plan`.

---

## 0. What this plan does NOT touch

- **No new entities, no new columns on `leads`.** `leads` (migration `0006_match_and_leads.sql`) is unchanged — no `status`, no `external_url_opened`, nothing mutable added anywhere in this design (constitution Principle IV). Confirmed explicitly in §9.
- **No matching/ranking algorithm change.** `app/src/lib/matching.ts` is untouched. `geo-matching-review` is not a required gate for this feature.
- **No profile-claim flow, no admin/moderation UI, no logout flow, no anonymous→user match-session linking, no lead de-duplication (BR-021).** All explicitly out of scope per spec.md and left alone.
- **No booking state machine.** `Lead` stays a single immutable event that merely records a contact attempt and (per Flow 5) triggers an external redirect.

---

## 1. Data model / schema cross-check

Read `docs/data-model.md`, `docs/database-schema.md`, and all nine existing migrations (`0001`–`0009`) in full before writing this plan. Findings:

- `users` (migration `0004`) matches `docs/database-schema.md` column-for-column. RLS is enabled with **zero policies** for any role (confirmed in `0007_rls_policies.sql`'s closing comment, line 90-91: "users / match_sessions / match_results / profile_claims: RLS enabled, no policy = deny-all"). This is the gap this feature must close.
- `leads` (migration `0006`) already has correct RLS (`authenticated_insert_leads`, `users_read_own_leads`, migration `0007`) and needs **no RLS change**. It does, however, reveal a load-bearing fact the rest of this plan depends on — see §2.1.
- **`match_sessions`/`match_results` have a second, distinct gap** that this feature's own scope (making login persist, User Story 3) newly exposes. See §2.4 — this is a required side-fix, not scope creep, and is flagged prominently because skipping it silently breaks Sport Match™ for any returning logged-in user.
- No entity/field in `docs/data-model.md` needs to change. One clarifying sentence should be added to `docs/data-model.md`'s `User` section (§2.1) — not a structural change.

## 2. RLS design

### 2.1 Load-bearing fact: `users.id` MUST equal `auth.uid()`

Migration `0004` defines `users.id uuid primary key default gen_random_uuid()` — an independently generated id, not literally tied to Supabase Auth's own `auth.users.id`. But migration `0007`'s already-shipped, already-merged `leads` policy is:

```sql
create policy "authenticated_insert_leads" on leads
  for insert to authenticated
  with check (user_id = auth.uid());
```

This compares `leads.user_id` (which references `users(id)`) directly against `auth.uid()`. **This policy only works if `public.users.id` is literally the same value as the Supabase Auth user's own id.** This was an implicit design decision baked into 001-data-foundation, not something this feature is free to redecide — the `users` provisioning mechanism (§3) **must** set `id = auth.uid()` explicitly on every insert, never let the column's `gen_random_uuid()` default fire. This is not a schema change (the default only matters if `id` is omitted; both approaches below always supply it explicitly) — it's a hard constraint on the provisioning code.

### 2.2 New migration: `supabase/migrations/0010_users_rls_policies.sql`

```sql
-- MatchPoint — migration 0010: RLS policies for `users` (Milestone 5 / 004-auth-lead-creation).
--
-- users has been RLS-enabled with zero policies since 0007 (deny-all). This feature is the
-- first thing that writes to it — a user row is provisioned on first login (docs/data-model.md:
-- "User is created only after Google or Apple login"). `id` MUST equal auth.uid() for every row
-- (see backend plan .claude/doc/auth-lead-creation/backend.md §2.1) — this is what already-shipped
-- migration 0007's `authenticated_insert_leads` policy (`user_id = auth.uid()`) has assumed since
-- 001-data-foundation. Insert/update are both needed because the provisioning write is an upsert
-- (idempotent — re-runs harmlessly on every login/session-restore, see §3).

create policy "authenticated_upsert_own_user_insert" on users
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "authenticated_upsert_own_user_update" on users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Own-row read, mirroring the existing users_read_own_leads pattern (0007). Not exercised by any
-- UI this milestone (no "my profile" screen), but a user reading their own row is the correct
-- minimal-scope policy to ship alongside insert/update, not something to add later under
-- time pressure. No anon policy — users are created only after login (Product Principle 1).
create policy "users_read_own_profile" on users
  for select
  to authenticated
  using (id = auth.uid());
```

No `anon` policy on `users`, ever — matches `docs/data-model.md`'s rule and constitution Principle I (login only triggers at contact time; nothing writes to `users` before that).

### 2.3 Doc sync required

`docs/database-schema.md`'s "RLS notes" section needs a new bullet:

> - `users`: authenticated users may insert/update/select only their own row (`id = auth.uid()`); no anon access. `id` is always the Supabase Auth user's own id, never the column's `gen_random_uuid()` default (migration `0010`).

### 2.4 Required side-fix: `match_sessions`/`match_results` have no `authenticated`-role policy

Migration `0009`'s own comment flags this explicitly and defers it: *"No `authenticated`-role insert policy yet. Once Milestone 5 ships real login, a logged-in user completing Sport Match™ will hit these same tables as role `authenticated`, which still resolves to deny-all... Flag for Milestone 5, not built here."* This feature **is** Milestone 5.

Why this is now a real, not hypothetical, problem: before this feature, `isLoggedIn` was pure in-memory React state that could never be `true` at the start of a fresh page load — every Sport Match™ session was necessarily created as `anon`. Once login persists across reloads (User Story 3), a returning user can land on `/match` **already authenticated**, and `buildMatchSessionRow`'s current insert (`user_id: null`, hardcoded in `sessionMappers.ts`) hits `match_sessions`/`match_results` as role `authenticated` — which today has zero policies, i.e. deny-all. **Sport Match™ would silently stop persisting (and, depending on how a future change might set `user_id`, could break outright) for exactly the users this feature is designed to keep logged in.** This is not modifying the `MatchSession`/`MatchResult` *entity* (the spec's Key Entities section correctly says this feature doesn't touch that) — it's closing an access gap those entities already have, one this feature's own session-persistence work newly exposes.

New migration: `supabase/migrations/0011_authenticated_match_write.sql`

```sql
-- MatchPoint — migration 0011: authenticated-role insert access for match_sessions/match_results.
--
-- Mirrors 0009's anon policies. Required by 004-auth-lead-creation: once login persists across
-- reloads (User Story 3), a returning logged-in user can start a fresh Sport Match™ session
-- while already authenticated, hitting these tables as role `authenticated` — which has had zero
-- policies (deny-all) since 0007. Without this, Sport Match™ silently breaks for exactly the
-- users this feature keeps logged in. Flagged explicitly in 0009's own migration comment as
-- deferred to this milestone.
--
-- Unlike the anon policy (`user_id is null` — anon has no identity to attribute to), an
-- authenticated insert must be attributed to the caller's own id, never left null and never
-- spoofable to someone else's id.

create policy "authenticated_insert_match_sessions" on match_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "authenticated_insert_match_results" on match_results
  for insert
  to authenticated
  with check (true); -- unchanged rationale from 0009: FK constraints already enforce validity
```

Accompanying (small) app-code change, §5.6: `buildMatchSessionRow` must accept the current user id (when logged in) instead of hardcoding `user_id: null`.

This does **not** implement "retroactively link an anonymous match_session to a user post-login" (still explicitly out of scope) — it only makes a **newly-created** session correctly attributed when the user happens to already be logged in at creation time. Those are different things: one rewrites history, the other doesn't.

**Flag for the user**: if this side-fix is considered out of bounds for this feature's PR, it must ship as an immediate fast-follow before merge, not be silently dropped — leaving it undone is a P0 regression of the P1 Sport Match™ flow that 002-sport-match-engine just shipped.

## 3. `users` row provisioning: client-side upsert (recommended) vs. trigger

**Recommendation: client-side upsert, not a Postgres trigger on `auth.users`.**

### 3.1 Why not a trigger

The standard Supabase pattern is a `SECURITY DEFINER` trigger function on `auth.users` (`AFTER INSERT`) that reads OAuth identity fields from `auth.users`'s own columns/`raw_user_meta_data` jsonb and inserts into `public.users`. This is attractive (atomic, runs exactly once, no dependency on client code completing) but it requires **precise knowledge of `auth.users`'s internal column and jsonb-key shape** — e.g. exactly which key holds the display name or avatar URL inside `raw_user_meta_data`, which can also differ between the Google and Apple provider payloads. I do not have high confidence in those exact internal names, and per this task's own instruction ("if you're not certain of the exact Supabase-specific column/metadata names, say so explicitly and give the safest defensible design rather than guessing") — guessing SQL-side jsonb keys against a schema I haven't verified live is exactly the failure mode to avoid. A wrong key name in a trigger fails silently or throws inside a `SECURITY DEFINER` function that fires on every single auth signup — a bug there risks breaking login itself, which is much higher blast radius than a bug in a client-side upsert that only affects one already-authenticated user's profile row.

### 3.2 Why client-side upsert is the safer default

`@supabase/supabase-js`'s client-facing `User` object (returned by `supabase.auth.getSession()`/`getUser()`/`onAuthStateChange`) has a **stable, documented, public TypeScript shape** I can rely on with much higher confidence: `user.id`, `user.email`, `user.user_metadata` (a free-form object populated from the provider), `user.app_metadata.provider`, and `user.identities: Identity[]` (each with `.provider`, `.id`, `.identity_data`). This is the SDK's own public contract, not an internal Postgres schema detail.

`app/src/lib/data/users.ts` (new):

```ts
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

/**
 * Idempotent upsert — safe to call on every SIGNED_IN/session-restore event, not just "first
 * ever" login. `id` MUST be authUser.id (== auth.uid()) — see backend plan §2.1; leads' already-
 * shipped RLS depends on public.users.id equaling the Supabase Auth user's own id.
 */
export async function ensureUserRow(authUser: User): Promise<void> {
  const identity = authUser.identities?.[0];
  const provider = authUser.app_metadata?.provider ?? identity?.provider ?? "google";
  const providerId = identity?.id ?? authUser.id;

  // BEST-EFFORT field names from user_metadata — Google/Apple populate this object slightly
  // differently and I have not inspected a real payload. Verify against a real session.user
  // object (browser devtools, once OAuth credentials are configured per spec's Assumptions)
  // before shipping; the fallback chain below is defensive, not a guarantee of correctness.
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl =
    (authUser.user_metadata?.avatar_url as string | undefined) ??
    (authUser.user_metadata?.picture as string | undefined) ??
    null;

  const { error } = await supabase.from("users").upsert(
    {
      id: authUser.id,
      auth_provider: provider,
      auth_provider_id: providerId,
      name,
      email: authUser.email ?? null,
      avatar_url: avatarUrl,
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`Failed to provision user row: ${error.message}`);
}
```

Notes:
- `unique(email)` on `users` permits multiple `NULL`s under Postgres's standard unique-constraint semantics, so a `null` email (Apple's sparse-data cases) is not itself a conflict risk.
- A genuine edge case this does **not** solve: if the same person authenticates via Google and Apple as two *separate* Supabase Auth identities that happen to report the same real email, the second upsert could collide on `unique(email)`. This is an account-linking problem, explicitly out of this feature's scope (spec's Assumptions don't mention it) — flag it as a known gap for `security-privacy-auditor`, don't build dedup/merge logic here.
- Call it (a) once per `SIGNED_IN`/`INITIAL_SESSION` auth-state event at the `MatchSessionProvider` level, **and** (b) defensively again inside the Lead-creation path (§6) right before the Lead insert. Calling it twice is harmless (idempotent upsert) and removes a real async race: the provider-level listener and a mounting `/auth/callback` page fire off the same auth event roughly simultaneously, and Lead creation must not risk running before provisioning lands (the FK would fail).

## 4. `ContactType`/`contact_type` and `lead_source` enum reconciliation

Grepped every use of `ContactType`, `"trial_class_request"`, `"contact_form"`, `"booking_link"`, and `"call"` across `app/src`. Result: **`"call"`, `"contact_form"`, and `"trial_class_request"` are never referenced anywhere outside the type declaration itself.** Only `"whatsapp"`, `"instagram"`, and `"booking_link"` are actually produced, all from `OrganizationProfile.tsx`'s `primaryContact` object.

**Decision: trim `ContactType` to be exactly the DB's 5-value enum, verbatim — no translation table.**

```ts
// app/src/types.ts
export type ContactType = "whatsapp" | "instagram" | "booking" | "call" | "form";
```

Rationale: since the two unused literals (`contact_form`, `trial_class_request`) are genuinely dead and the three real ones (`whatsapp`, `instagram`, `booking_link`) map 1:1 to DB values with one rename, there's no reason to carry a second, parallel vocabulary with a mapping table (unlike `Sport`/`Level`/`Goal`, which have real Spanish-app-facing ⇄ English-DB-facing translation needs). One shared vocabulary, zero mapping code — the more literal reading of `docs/base-standards.md`'s "no ad-hoc duplicate shapes per layer."

Call sites requiring updates:
- `app/src/pages/OrganizationProfile.tsx` line 51: `{ type: "booking_link", ... }` → `{ type: "booking", ... }`.
- `app/src/types.ts`: `Lead.contactType` and the `requestContact`/`buildLead` signatures already type against `ContactType`, so they pick up the narrower type automatically — no separate edit needed beyond the union itself.
- `app/src/pages/ContactSuccess.tsx`'s `externalLink()` compares string literals `"whatsapp"`/`"instagram"` directly (not against the old `"booking_link"`) and falls through to `organization.bookingLink` for anything else — this file needs **no change** for the rename itself, but does need a change for the reload-state gap (§7).

`call` and `form` are kept in the union even though nothing wires them up yet — they're real BR-003-listed contact actions ("WhatsApp, Instagram, booking, call, form") with real DB backing; dropping them would just mean re-adding them later for no benefit.

### 4.1 `lead_source`

New DB-aligned type, currently missing entirely (today `source` is untyped `string` everywhere):

```ts
// app/src/types.ts
export type LeadSource = "result_card" | "organization_profile" | "event_profile" | "direct_search" | "admin_test";
```

`requestContact`, `PendingContact.source`, and `buildLead`'s `source` parameter all change from `string` → `LeadSource`. Today only `"organization_profile"` is ever actually passed (from `OrganizationProfile.tsx`'s `handleContact`) — typing against the full 5-value union is forward-compatible, not new functionality; it just stops the compiler from accepting an arbitrary string.

## 5. `match_result_id`: client-generated `match_results.id` (recommended)

### 5.1 The gap

`app/src/types.ts`'s `MatchResult` has no `id` field, and `sessionMappers.ts`'s `buildMatchResultRows` never sets one — it relies on the DB's `gen_random_uuid()` default. Because migration `0009` deliberately ships `match_results` with **no SELECT policy at all** (by design — see `002-sport-match-engine`'s research.md R1: the client never needs to read a row back), the client can never learn that generated id after the fact. `leads.match_result_id` is nullable, so leaving it permanently `null` is a *valid* schema state — but `docs/api-contracts.md`'s `POST /api/leads` request shape explicitly lists `matchResultId` as part of a Lead's data, and `docs/data-model.md`'s Lead rule says a Lead should preserve "the match context (session/result) it came from."

### 5.2 Decision and why it's worth the small cost

**Generate `match_results.id` client-side (`crypto.randomUUID()`), mirroring the pattern `match_sessions.id` already uses** (established in 002, not new to this feature). This is the *only* viable way to let a Lead reference the exact `MatchResult` row it came from, short of adding a SELECT policy to `match_results` — which migration `0009` deliberately avoided for good reason (least-privilege, no need to expose match scoring data for reads) and shouldn't be reopened just to serve this feature when a strictly smaller change (client-generated id, already-precedented) does the same job.

Cost, contained to already-002-owned files:
- `app/src/lib/data/sessionMappers.ts`: `MatchResultInsertRow` gains `id: string`; `buildMatchResultRows` generates one per row (or accepts pre-generated ids — generating inside is simpler, no caller change needed there).
- `app/src/lib/data/matchSessions.ts`: `createMatchSession` must return the generated ids so the caller can attach them back to the in-memory `MatchResult[]` (matching.ts itself produces results with no id — ids only exist once we're about to persist).
- `app/src/types.ts`: `MatchResult` gains `id?: string` (optional — undefined until/unless persistence succeeds, mirroring how `matchSessionId`/`matchSessionPersisted` already communicate "was this actually written" per 002's plan §6.5).
- `app/src/context/MatchSessionContext.tsx`'s `finalizeMatch`: after `createMatchSession` resolves, merge returned ids into `computed` before `setState`, and **only if `persisted === true`** (same FK-safety reasoning 002's plan already flagged for `matchSessionId`: a `match_result_id` pointing at a row that was never actually written would violate the FK on `leads.match_result_id` the moment a Lead tried to reference it).

```ts
// matchSessions.ts — updated shape
export interface PersistMatchOutcome {
  matchSessionId: string;
  matchResultIds: Record<string /* organizationId */, string>; // empty if not persisted
  persisted: boolean;
}
```

`OrganizationProfile.tsx`'s `matchResult` lookup (`results.find(r => r.organization.id === id)`) already has access to `matchResult.id` once this lands — passed through to `requestContact`/`PendingContact` as `matchResultId: matchResult?.id ?? null`.

## 6. Lead creation: data-access layer

Following the established 001/002 convention: pure mapper (no Supabase import, unit-testable) + thin write function (Supabase client only).

### 6.1 `app/src/lib/data/leadMappers.ts` (new, pure)

```ts
import type { ContactType, Goal, LeadSource } from "../../types";
import { GOAL_MAP } from "./sessionMappers"; // export this map from sessionMappers.ts — do not duplicate
import type { DbContactType, DbLeadSource } from "./types";

export interface LeadInsertRow {
  id: string;
  user_id: string;
  organization_id: string;
  match_session_id: string | null;
  match_result_id: string | null;
  contact_type: DbContactType;
  source: DbLeadSource;
  sport_id: string | null;
  goal: string | null;
  district_id: string | null;
  result_rank: number | null;
}

export interface BuildLeadInput {
  id: string;
  userId: string;
  organizationId: string;
  matchSessionId: string | null; // null if not persisted — never reference a non-existent row
  matchResultId: string | null;
  contactType: ContactType;      // already DB-aligned per §4, no translation
  source: LeadSource;             // already DB-aligned per §4.1, no translation
  sportId: string | null;         // resolved via getSportId() by the caller (leads.ts), not here
  goal: Goal | null;
  districtId: string | null;      // resolved via getDistrictId() by the caller, not here
  resultRank: number | null;
}

export function buildLeadInsertRow(input: BuildLeadInput): LeadInsertRow {
  return {
    id: input.id,
    user_id: input.userId,
    organization_id: input.organizationId,
    match_session_id: input.matchSessionId,
    match_result_id: input.matchResultId,
    contact_type: input.contactType,
    source: input.source,
    sport_id: input.sportId,
    // leads.goal is free text (no DB enum) — store the same translated English token already
    // used for match_sessions.goal (GOAL_MAP), so the two tables share one vocabulary instead of
    // leads.goal holding raw Spanish app values while match_sessions.goal holds English ones.
    goal: input.goal ? GOAL_MAP[input.goal] : null,
    district_id: input.districtId,
    result_rank: input.resultRank,
  };
}
```

`sessionMappers.ts` needs one change to support this: export its existing `GOAL_MAP` (currently module-private) instead of duplicating the Spanish→English goal vocabulary a second time — per `docs/base-standards.md`'s no-duplicate-domain-logic rule, same reasoning 002 already applied when it derived reverse sport/level/weekday lookups from existing maps instead of re-declaring them.

`app/src/lib/data/types.ts` additions:

```ts
export type DbContactType = "whatsapp" | "instagram" | "booking" | "call" | "form";
export type DbLeadSource = "result_card" | "organization_profile" | "event_profile" | "direct_search" | "admin_test";
```

### 6.2 `app/src/lib/data/leads.ts` (new, thin write layer)

Unlike `createMatchSession` (which **never throws** — a lost anonymous match session degrades gracefully to "still show results"), `createLead` **must** surface failure distinguishably, because BR-003/FR-007/FR-010 require the external redirect to never fire without a confirmed-saved Lead, and require a visible retry path on failure:

```ts
import { supabase } from "./supabaseClient";
import { buildLeadInsertRow, type BuildLeadInput } from "./leadMappers";

/** Throws on failure — callers MUST catch and must NOT open the external destination. */
export async function createLead(input: BuildLeadInput): Promise<string> {
  const row = buildLeadInsertRow(input);
  const { error } = await supabase.from("leads").insert(row);
  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return row.id;
}
```

`id` is client-generated (`crypto.randomUUID()`, supplied by the caller building `BuildLeadInput`) — same rationale as `match_sessions.id`/`match_results.id`: simpler than relying on `RETURNING` (which *would* work here, since `users_read_own_leads` does grant SELECT — but there's no reason to rely on a round-trip read when the established pattern already avoids it).

### 6.3 Pre-Lead-insert re-verification (FR-013)

New function, `app/src/lib/data/organizations.ts` (extends the existing file rather than adding a new one — same table, same visibility predicate):

```ts
export interface OrgContactSnapshot {
  id: string;
  whatsapp?: string;
  instagram?: string;
  bookingLink?: string;
  website?: string;
  name: string;
}

/** FR-013: single-row re-check that the org is still publicly contactable, immediately before
 * a Lead insert. Deliberately NOT a full getOrganizations() re-fetch (would re-run the whole
 * catalog query + eligibility filter for one row). */
export async function getOrganizationContactSnapshot(id: string): Promise<OrgContactSnapshot | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, whatsapp_number, instagram_url, booking_url, website_url, is_active, profile_status")
    .eq("id", id)
    .eq("is_active", true)
    .not("profile_status", "in", "(suspended,archived,rejected)")
    .maybeSingle();

  if (error || !data) return null; // RLS would already hide a suspended/archived row even
                                    // without these explicit filters — kept for self-documentation,
                                    // matching getOrganizations()'s existing style.
  return {
    id: data.id,
    name: data.name,
    whatsapp: data.whatsapp_number ?? undefined,
    instagram: data.instagram_url ?? undefined,
    bookingLink: data.booking_url ?? undefined,
    website: data.website_url ?? undefined,
  };
}
```

**Flag for the implementer**: this is now the *third* place the "is this org visible" predicate (`is_active = true and profile_status not in (suspended, archived, rejected)`) is expressed — the SQL-side `is_organization_visible()` function (migration `0008`), `getOrganizations()`'s inline filter, and now this. Migration `0008`'s own commit message is explicit about exactly this drift risk on the SQL side; the same risk now exists in TypeScript across two functions. Recommend extracting one shared constant/helper (e.g. `EXCLUDED_ORG_STATUSES` or a small `applyOrgVisibilityFilter(query)`) in `organizations.ts` and using it in both places — small, cheap, and prevents a future author from updating one and not the other. Not strictly required to ship this feature, but flagged explicitly rather than silently left as a third copy.

The returned snapshot doubles as what's needed to build the external redirect URL post-reload (§7) — one query serves both FR-013's re-check and the "we lost `state.results` across the OAuth redirect" problem.

### 6.4 Centralized orchestration: `performContact`

Both call paths — "already logged in, contact now" (User Story 1) and "just returned from OAuth, complete the pending contact" (User Story 2) — must run the *same* re-verify → create-Lead → resolve-external-URL sequence. Per constitution Principle II's "centralize... no reimplementing rules per endpoint" (stated for matching, but the same discipline applies here): one function, two callers.

```ts
// MatchSessionContext.tsx (sketch — see §8 for full wiring)
type ContactOutcome =
  | { status: "success"; leadId: string; externalUrl: string | null; organizationName: string }
  | { status: "org_unavailable" }
  | { status: "lead_failed" };

async function performContact(pending: PendingContact, currentUserId: string): Promise<ContactOutcome> {
  const org = await getOrganizationContactSnapshot(pending.organizationId);
  if (!org) return { status: "org_unavailable" };

  const contactValue =
    pending.contactType === "whatsapp" ? org.whatsapp :
    pending.contactType === "instagram" ? org.instagram :
    pending.contactType === "booking" ? org.bookingLink : undefined;
  if (pending.contactType !== "call" && pending.contactType !== "form" && !contactValue) {
    // the specific channel disappeared even though the org itself is still visible (BR-009)
    return { status: "org_unavailable" };
  }

  const [sportId, districtId] = await Promise.all([
    pending.sport ? getSportId(mapSportToSlug(pending.sport)!).catch(() => null) : Promise.resolve(null),
    pending.district ? getDistrictId(pending.district).catch(() => null) : Promise.resolve(null),
  ]);

  try {
    const leadId = await createLead({
      id: crypto.randomUUID(),
      userId: currentUserId,
      organizationId: pending.organizationId,
      matchSessionId: pending.matchSessionPersisted ? pending.matchSessionId : null,
      matchResultId: pending.matchResultId,
      contactType: pending.contactType,
      source: pending.source,
      sportId, districtId,
      goal: pending.goal,
      resultRank: pending.resultRank,
    });
    const externalUrl = buildExternalUrl(pending.contactType, org); // pure helper, whatsapp/instagram/booking URL
    track({ name: "lead_created", leadId, organizationId: pending.organizationId, contactType: pending.contactType });
    return { status: "success", leadId, externalUrl, organizationName: org.name };
  } catch {
    return { status: "lead_failed" };
  }
}
```

`sportId`/`districtId` lookups reuse `getSportId`/`getDistrictId` from 002 (no new lookup functions needed) — failures there degrade to `null` rather than blocking the Lead (a Lead with `sport_id: null` is valid per schema; the *primary* keys that matter — `user_id`, `organization_id`, `contact_type`, `source` — are never allowed to be null and always come from confirmed data).

## 7. Redirect-state persistence for `pendingContact`

### 7.1 Why sessionStorage, not localStorage or an encoded redirect URL

`supabase.auth.signInWithOAuth()` performs a full-page navigation away from the SPA. **Every** in-memory `MatchSessionContext` field is lost across that round-trip — not just `pendingContact`, but `state.answers`, `state.results`, `state.matchSessionId`. Only what's explicitly persisted survives.

- **sessionStorage** (recommended): survives the full-page OAuth round-trip (same tab, same navigation lineage) and a same-tab reload, clears on tab close. This matches the spec's own Assumptions section verbatim: *"'Within the same visit'... means the standard behavior of a normal browser session."* It's a better fit than `localStorage` specifically *because* it's shorter-lived and scoped to one tab — a stale, days-old pending-contact intent silently resurrecting in an unrelated future tab would be a worse UX bug than losing it on tab close.
- **Encoding into the OAuth `redirectTo` URL** (rejected): Supabase's redirect URL must match an entry in the project's configured allow-list; stuffing a variable payload into it (query params) works technically but couples the auth redirect URL's shape to app-specific state, is more fragile across providers, and offers no benefit over sessionStorage here since both are same-tab/browser-local anyway.
- **localStorage** (rejected): survives across tab closes and days — wrong lifetime for a one-shot, not-yet-committed action; risks a Lead firing for an intent the user may have abandoned entirely.

### 7.2 New module: `app/src/lib/pendingContact.ts`

Pure, no Supabase import (unit-testable with a mocked `sessionStorage`), mirrors the `lib/` top-level convention already used by `matching.ts`/`analytics.ts`/`labels.ts`:

```ts
import type { ContactType, Goal, LeadSource, Sport } from "../types";

const KEY = "matchpoint:pendingContact";

export interface PendingContact {
  organizationId: string;
  contactType: ContactType;
  resultRank: number | null;
  source: LeadSource;
  matchSessionId: string | null;
  matchSessionPersisted: boolean;
  matchResultId: string | null;
  sport: Sport | null;
  goal: Goal | null;
  district: string | null;
}

export function savePendingContact(pc: PendingContact): void {
  sessionStorage.setItem(KEY, JSON.stringify(pc));
}

export function readPendingContact(): PendingContact | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingContact;
  } catch {
    sessionStorage.removeItem(KEY); // corrupt value — don't loop on it forever
    return null;
  }
}

export function clearPendingContact(): void {
  sessionStorage.removeItem(KEY);
}
```

`requestContact()` (in `MatchSessionContext.tsx`) calls `savePendingContact(...)` at the exact point it currently does `setState({ pendingContact: {...} })` — centralized there, not in `Login.tsx`, so nothing depends on every future caller remembering to persist it. `clearPendingContact()` is called only on a **successful** Lead creation (§6.4's `"success"` outcome) or an explicit `"org_unavailable"` terminal state — **never** on `"lead_failed"`, so a retry button can re-run `performContact` against the same stored data (FR-010).

### 7.3 Detecting "we just came back from OAuth" — new route, not a global page-load heuristic

`@supabase/supabase-js` v2's client defaults already include `detectSessionInUrl: true` and `persistSession: true` (confirmed in `app/src/lib/data/supabaseClient.ts` — no explicit `auth` config overrides these, so the defaults apply). This means the SDK automatically parses the auth tokens out of the redirect URL on client init and fires `onAuthStateChange` with a `SIGNED_IN` event — no manual URL-parsing needed anywhere in app code.

Add a new route, **`/auth/callback`**, to `App.tsx`, and set `signInWithOAuth`'s `redirectTo` to `${window.location.origin}/auth/callback`. `Login.tsx`'s `handleLogin` becomes:

```ts
function handleLogin(provider: "google" | "apple") {
  void login(provider); // supabase.auth.signInWithOAuth — full-page navigation away, nothing after this line runs
}
```

New `app/src/pages/AuthCallback.tsx`: on mount, calls a new context method `completePendingContact()` (async), shows a loading state while pending, and reacts to the returned outcome:

```ts
const outcome = await completePendingContact();
switch (outcome.status) {
  case "success": /* render ContactSuccess-equivalent UI, or navigate("/contact/success") with lastLead/lastContactedOrganization already set in context state (see §7.4) */
  case "no_pending": navigate("/"); break; // logged in via some other path, or intent expired — land on Welcome, not a blank screen (Edge Cases)
  case "org_unavailable": /* inline "esta comunidad ya no está disponible" message, distinct from the generic in-memory fallback OrganizationProfile.tsx already has (§7.4 explains why) */
  case "lead_failed": /* inline retry button that re-calls completePendingContact() — pendingContact stays in sessionStorage */
}
```

`completePendingContact()` (in `MatchSessionContext.tsx`):

```ts
async function completePendingContact(): Promise<Outcome> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { status: "no_pending" }; // shouldn't normally happen on this route, but never assume

  await ensureUserRow(session.user); // idempotent — safe even if the provider-level listener already ran it
  setState((s) => ({ ...s, isLoggedIn: true, userName: deriveUserName(session.user) }));

  const pending = readPendingContact();
  if (!pending) return { status: "no_pending" };

  const outcome = await performContact(pending, session.user.id);
  if (outcome.status === "success" || outcome.status === "org_unavailable") clearPendingContact();
  if (outcome.status === "success") {
    setState((s) => ({
      ...s,
      lastLead: { id: outcome.leadId, organizationId: pending.organizationId, contactType: pending.contactType, createdAt: new Date().toISOString() },
      lastContactedOrganization: { id: pending.organizationId, name: outcome.organizationName, /* whatsapp/instagram/bookingLink from performContact's snapshot */ },
    }));
  }
  return outcome;
}
```

### 7.4 Why `ContactSuccess.tsx` needs a small, necessary plumbing fix

`ContactSuccess.tsx` currently builds its external link via `getOrganization(lastLead.organizationId)`, which reads from `state.results` — an in-memory array that is **empty** after the OAuth full-page reload (exactly the same gap 002's plan already flagged in its own §6.4 for the plain-refresh case). Reusing that path here would silently show "no organization" on the one screen this entire feature exists to reach. Fix: `completePendingContact()`'s success branch (above) sets a new, small `lastContactedOrganization` field directly from the fresh `getOrganizationContactSnapshot()` read it already had to do for FR-013 — no extra query. `ContactSuccess.tsx` prefers `lastContactedOrganization` when present, falling back to the existing `getOrganization(lastLead.organizationId)` lookup for the same-session (no redirect happened) case, where `state.results` is genuinely still populated. Both code paths converge on the same rendering logic; only the data source differs.

Also worth noting explicitly: **the current in-memory `Lead` interface carries `matchSessionId`/`sport`/`goal`/`district`/`resultRank` fields that no component actually reads** (`ContactSuccess.tsx` only reads `.organizationId` and `.contactType`). This plan simplifies the UI-facing `Lead` type to just what's displayed (`id`, `organizationId`, `contactType`, `createdAt`) and introduces a separate, DB-shaped `LeadInsertRow` (§6.1) for the write path — mirroring the existing `MatchSession`/`MatchSessionInsertRow` split from 002, rather than trying to make one shape serve both a UI display object and a DB insert row.

## 8. Session persistence (User Story 3)

**No custom persistence layer needed for the auth session itself.** `@supabase/supabase-js`'s default client config (`persistSession: true`, backed by `window.localStorage`, `autoRefreshToken: true`) already gives "logged in survives reload" for free — `app/src/lib/data/supabaseClient.ts` needs no code change, just a comment confirming these defaults are relied upon (so a future edit doesn't "helpfully" disable them without realizing this feature depends on them).

What the app currently does **not** do: read that persisted session back into `isLoggedIn`/`userName` state on boot — `MatchSessionProvider`'s initial state hardcodes `isLoggedIn: false` and never asks Supabase. Fix: a mount-time effect in `MatchSessionProvider` that subscribes to `supabase.auth.onAuthStateChange`:

```ts
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      void ensureUserRow(session.user); // idempotent; fire-and-log-on-failure at this layer
      setState((s) => ({ ...s, isLoggedIn: true, userName: deriveUserName(session.user) }));
    } else {
      setState((s) => ({ ...s, isLoggedIn: false, userName: null }));
    }
  });
  return () => subscription.unsubscribe();
}, []);
```

This single listener covers three distinct moments with the same code: (a) normal page-load session restore (US3), (b) the `SIGNED_IN` event firing right after the OAuth redirect lands (before `/auth/callback`'s own `completePendingContact()` even runs — harmless, both paths idempotently converge on the same state), and (c) any future token refresh. No separate "restore session" function is needed.

`deriveUserName` is a small pure helper: `user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Usuario"` — same "best-effort, verify against a real payload" caveat as §3.2.

## 9. Constitution / immutability confirmations

- **Lead stays fully immutable.** No field added to `leads` anywhere in this plan (§0, §6). No endpoint or function in this design ever calls `.update()` or `.delete()` on `leads`. `createLead` is insert-only. The `ContactOutcome` union (`success`/`org_unavailable`/`lead_failed`) is app-side UI state, not a persisted status on the row.
- **No login earlier in the funnel.** `login()`/`signInWithOAuth` is only ever invoked from inside the "not logged in" branch of `requestContact`/`performContact`'s caller (via `/login`) — Sport Match™, Results, and Organization Profile browsing remain fully reachable with zero auth calls, unchanged from today. The one new auth-adjacent touch — `onAuthStateChange` restoring a *pre-existing* session on boot (§8) — does not prompt login; it only recognizes a session the user already created earlier, which is exactly what User Story 3 asks for, not a new login trigger.

## 10. Analytics (FR-012, BR-027)

Extend `app/src/lib/analytics.ts`'s `AnalyticsEvent` union (already the documented extension point — no new mechanism):

```ts
| { name: "login_started"; provider: "google" | "apple" }
| { name: "login_completed"; provider: "google" | "apple" }
| { name: "lead_created"; leadId: string; organizationId: string; contactType: ContactType }
| { name: "external_contact_opened"; leadId: string; contactType: ContactType }
```

Matches `docs/ux-flows.md`'s canonical event name list verbatim (`login_started`, `login_completed`, `lead_created`, `external_contact_opened`). Payloads carry no contact-value/location precision (only ids/enums already visible in the UI), consistent with `docs/security-standards.md`'s allow-list posture — same discipline 002 already established for `sport_match_completed`/`results_viewed`.

## 11. File change checklist

**New:**
- `supabase/migrations/0010_users_rls_policies.sql`
- `supabase/migrations/0011_authenticated_match_write.sql`
- `app/src/lib/data/users.ts` (`ensureUserRow`)
- `app/src/lib/data/leadMappers.ts` (`buildLeadInsertRow`, pure) + `leadMappers.test.ts`
- `app/src/lib/data/leads.ts` (`createLead`)
- `app/src/lib/pendingContact.ts` (sessionStorage read/save/clear, pure) + `pendingContact.test.ts`
- `app/src/pages/AuthCallback.tsx`
- Optional: `app/src/lib/data/leads.integration.test.ts` — see §12's testing-gap note before assuming this is straightforward to write

**Modified:**
- `app/src/types.ts` — `ContactType` trimmed to 5 DB-aligned values (§4); new `LeadSource` type (§4.1); `Lead` simplified to its actually-displayed fields (§7.4); `MatchResult` gains optional `id` (§5.2).
- `app/src/lib/data/types.ts` — add `DbContactType`, `DbLeadSource` (§6.1).
- `app/src/lib/data/sessionMappers.ts` — export `GOAL_MAP` (§6.1); `buildMatchResultRows` generates/returns `id` per row (§5.2); `buildMatchSessionRow` accepts an optional `userId` (§2.4).
- `app/src/lib/data/matchSessions.ts` — `createMatchSession` accepts optional `userId`, returns `matchResultIds` (§5.2, §2.4).
- `app/src/lib/data/organizations.ts` — add `getOrganizationContactSnapshot` (§6.3); flag the shared-visibility-predicate extraction (§6.3).
- `app/src/lib/data/supabaseClient.ts` — comment only, no behavior change (§8).
- `app/src/lib/analytics.ts` — four new event variants (§10).
- `app/src/context/MatchSessionContext.tsx` — real `login()` (calls `signInWithOAuth`), `requestContact` becomes async and persists `pendingContact` via `lib/pendingContact.ts` when not logged in, new `performContact`/`completePendingContact` (§6.4, §7.3), `onAuthStateChange` listener (§8), new `lastContactedOrganization` state field (§7.4).
- `app/src/pages/Login.tsx` — `handleLogin` simplifies to just triggering real OAuth (§7.3); the old synchronous `confirmPendingContact()`-on-click logic is removed (that work now happens on `/auth/callback` after the real redirect completes).
- `app/src/pages/OrganizationProfile.tsx` — `handleContact()` becomes async, awaits `requestContact()`, branches on the new outcome shape instead of a boolean; `"booking_link"` → `"booking"` literal (§4).
- `app/src/pages/ContactSuccess.tsx` — prefers `lastContactedOrganization` over the in-memory `getOrganization()` lookup when present (§7.4).
- `app/src/App.tsx` — add `/auth/callback` route.
- `docs/database-schema.md` — RLS notes additions (§2.3, and one for §2.4's migration).
- `docs/api-contracts.md` — implementation note under `POST /api/leads` (direct Supabase insert, client-generated id, RLS-gated by already-shipped `authenticated_insert_leads`; note `matchResultId`/`matchSessionId` may be `null` when the underlying session/result was never actually persisted); a short note that user provisioning has no dedicated REST-shaped contract (client-side upsert, §3), since `api-contracts.md` currently doesn't mention user creation at all and shouldn't gain a fabricated endpoint that was never asked for.
- `docs/data-model.md` — one clarifying sentence on `User`: `id` is always the Supabase Auth user's own id (`auth.uid()`), never independently generated (§2.1).

**Explicitly not modified:** `app/src/lib/matching.ts`, anything under `profile_claims`/claim flow, no new columns on `leads`/`organizations`/`match_sessions`/`match_results`.

## 12. Workflow gates and open flags for the implementer

- Touches `docs/database-schema.md`-adjacent code (two new migrations) → run `data-model-review` before merging.
- Touches auth, contact-info visibility, and real user PII → run `trust-safety-review` **and**, per `docs/security-standards.md`'s explicit instruction, a dedicated `security-privacy-auditor` pass on this specific implementation before release — confirm in actual code (not just this plan) that the auth → lead → redirect ordering is atomic, matching `docs/ux-flows.md` Flow 5.
- Does **not** touch matching/ranking logic → `geo-matching-review` is not required.
- TDD is NON-NEGOTIABLE (constitution Principle III) for `leadMappers.ts` (pure, small, and a wrong DB enum string here fails silently the same way `sessionMappers.ts`'s maps do) and `pendingContact.ts` (pure, easy to unit-test with a mocked `sessionStorage`).
- **Real testing gap, flagged not solved here**: `createLead`/`ensureUserRow` require an `authenticated` role session under RLS. 002's existing integration-test pattern (`matchSessions.integration.test.ts`) only exercises the `anon` role and can't be extended as-is to cover this feature's writes without either (a) a test-only mechanism to mint a real authenticated session (e.g. Supabase's admin/service-role key, used strictly in test setup, never in shipped app code) or (b) relying on manual/E2E verification via the `/verify` skill against real Google/Apple OAuth once the project owner configures credentials (per spec's Assumptions — this feature's engineering work explicitly does not include obtaining those credentials). Decide which before writing `tasks.md`; don't discover this gap mid-implementation.
- Owner-configured, outside code: Supabase Auth's Redirect URLs allow-list must include `<dev-origin>/auth/callback` and `<prod-origin>/auth/callback` before end-to-end testing is possible — flag this as an environment/config dependency in `tasks.md`, not something this plan's code changes can satisfy.
