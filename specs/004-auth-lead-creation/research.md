# Research & Decisions: Real Auth & Lead Creation (Phase 0)

Resolves the technical unknowns surfaced by the `backend-architect` plan (`.claude/doc/auth-lead-creation/backend.md`). One decision (R1) is product-facing and was resolved directly with the owner via chat before this document was finalized.

## R1 — OWNER DECISION (resolved 2026-08-02): Google only for this milestone

**Decision**: Only Google OAuth is configured and enabled this milestone. Apple Sign In is deferred — the code stays provider-agnostic (`login(provider: "google" | "apple")` unchanged in shape), but the Apple button is hidden from `Login.tsx`'s UI until Apple credentials exist, rather than shipping a button that errors when clicked.

**Rationale**: the owner chose this over building both now — Apple Sign In requires a paid ($99/year) Apple Developer account and materially more setup (Services ID, private key, domain verification) than Google's free, simpler OAuth app registration. Per PMV Scope Discipline (constitution Principle V), paying for and configuring Apple before validating demand isn't justified yet. Re-enabling Apple later is a one-line UI change plus the owner completing Apple's setup — no code rework needed, since the underlying `login()`/`signInWithOAuth` call already takes `provider` as a parameter.

**Consequence**: `docs/microcopy.md`/FR-022's "Continue with Google, Continue with Apple" copy is satisfied structurally but only Google is live-testable this milestone. Flagged as a documented, deliberate gap — not an oversight.

## R2 — `users.id` must equal `auth.uid()` (load-bearing constraint, not a free choice)

**Decision**: every `users` row insert/upsert sets `id = auth.uid()` explicitly — never lets the column's `gen_random_uuid()` default fire.

**Rationale**: 001-data-foundation's already-shipped, already-merged `leads` RLS policy (`authenticated_insert_leads`, migration 0007) checks `user_id = auth.uid()`. That policy only works if `public.users.id` is literally the Supabase Auth user's own id. This isn't a new design choice this feature is free to make differently — it's a constraint inherited from already-merged code.

## R3 — New RLS migration `0010_users_rls_policies.sql`

**Decision**: insert/update/select policies on `users`, all scoped `to authenticated using/with check (id = auth.uid())`. No `anon` policy — `users` rows are only ever created after login (constitution Principle I; docs/data-model.md).

**Rationale**: `users` has had RLS enabled with zero policies since 0007 (deny-all) — nothing wrote to it because nothing needed to until this feature. Insert and update are both needed because provisioning is an idempotent upsert (called on every login and every session restore, not just "first ever" login).

## R4 — Required side-fix: `0011_authenticated_match_write.sql`

**Decision**: add `authenticated`-role insert policies for `match_sessions`/`match_results`, mirroring 002's existing `anon` policies from migration 0009.

**Rationale**: migration 0009's own comment already flagged this as deferred to Milestone 5. Before this feature, `isLoggedIn` was pure in-memory state that could never be `true` at the start of a fresh page load — every Sport Match™ session was necessarily anonymous. Once login persists across reloads (User Story 3), a returning logged-in user can land on `/match` already authenticated, and today's hardcoded `user_id: null` insert would hit `match_sessions`/`match_results` as role `authenticated` — deny-all, since no policy exists for that role. Without this fix, Sport Match™ would silently stop persisting for exactly the users this feature keeps logged in — a real regression of 002's shipped functionality, not optional scope. `buildMatchSessionRow` gains an optional `userId` parameter to attribute the session correctly when the user is already logged in at creation time (not retroactive linking of old anonymous sessions — that stays out of scope, per spec.md).

## R5 — `users` row provisioning: client-side upsert, not a Postgres trigger

**Decision**: `ensureUserRow(authUser)` in `app/src/lib/data/users.ts`, called from an `onAuthStateChange` listener (idempotent upsert, safe to call on every sign-in/session-restore).

**Rationale**: the standard Supabase pattern (a `SECURITY DEFINER` trigger on `auth.users` reading `raw_user_meta_data`) requires precise knowledge of Supabase Auth's internal jsonb key shape, which differs between Google/Apple payloads and hasn't been verified against a live payload. A wrong key name in a trigger fails inside a function that fires on every signup — high blast radius. `@supabase/supabase-js`'s public, documented `User` object (`user.id`, `user.email`, `user.user_metadata`, `user.identities`) is a stable contract we can rely on with real confidence; a bug in client-side upsert code only affects one already-authenticated user's own profile row.

**Consequence flagged to implementer**: `name`/`avatarUrl` extraction uses a defensive fallback chain (`user_metadata.full_name ?? user_metadata.name`, etc.) that has not been verified against a real Google OAuth payload — must be checked against a real `session.user` object (browser devtools) once R1's Google credentials are configured, before considering this field-complete.

## R6 — `ContactType` trimmed to the DB's 5 values, no translation table

**Decision**: `ContactType = "whatsapp" | "instagram" | "booking" | "call" | "form"` (was: `"whatsapp" | "instagram" | "booking_link" | "call" | "contact_form" | "trial_class_request"`).

**Rationale**: grepped every use across `app/src` — `"call"`, `"contact_form"`, and `"trial_class_request"` are never referenced anywhere outside the type declaration itself; only `whatsapp`/`instagram`/`booking_link` are actually produced (from `OrganizationProfile.tsx`). Since the real, used values map 1:1 to DB values with one rename (`booking_link` → `booking`), there's no real Spanish-app-facing / English-DB-facing translation need here (unlike `Sport`/`Level`/`Goal`, which do) — one shared vocabulary, zero mapping code. `call`/`form` are kept (real BR-003 contact actions with DB backing) even though unused today, so they don't need re-adding later.

## R7 — New `LeadSource` type, DB-aligned

**Decision**: `LeadSource = "result_card" | "organization_profile" | "event_profile" | "direct_search" | "admin_test"`, replacing today's untyped `string` for `source` everywhere it flows (`requestContact`, `PendingContact.source`, `buildLead`).

**Rationale**: prevents the compiler from accepting an arbitrary string that could silently mismatch the DB enum at insert time. Only `"organization_profile"` is produced today — typing against the full union is forward-compatible, not new functionality.

## R8 — `match_results.id` becomes client-generated

**Decision**: `match_results.id` is generated client-side (`crypto.randomUUID()`), mirroring the existing `match_sessions.id` pattern from 002. `MatchResult` (app type) gains an optional `id` field, populated only when `persisted === true`.

**Rationale**: `leads.match_result_id` (nullable) can never be populated otherwise, since migration 0009 deliberately ships `match_results` with no SELECT policy (002's research.md R1) — the client can't read a DB-generated id back. Reopening that SELECT-policy decision just to serve this feature would cost more (a real least-privilege regression) than the alternative (a small, already-precedented client-id-generation change contained to 002's own files). A Lead pointing at a result that was never actually persisted would violate the FK — hence gating on `persisted === true`, matching how `matchSessionId`/`matchSessionPersisted` already communicate "was this actually written."

## R9 — Redirect-state persistence: `sessionStorage`, not `localStorage` or a redirect-URL payload

**Decision**: `pendingContact` (and the match-session/result context needed to complete it) is written to `sessionStorage` right when a contact is requested while logged out, read back on `/auth/callback`, and cleared only on success or a terminal "org unavailable" outcome (never on a retryable failure).

**Rationale**: `supabase.auth.signInWithOAuth()` is a full-page navigation away from the SPA — every in-memory `MatchSessionContext` field is lost across it, not just `pendingContact`. `sessionStorage` survives that same-tab round-trip and a same-tab reload, and clears on tab close — matching the spec's own Assumption ("within the same visit... standard browser session behavior"). `localStorage` was rejected as too long-lived (a days-old abandoned contact intent silently resurrecting later is a worse bug than losing it on tab close). Encoding state into the OAuth `redirectTo` URL was rejected — that URL must match Supabase's configured allow-list, and stuffing app state into it adds fragility for no benefit over sessionStorage.

## R10 — New route `/auth/callback`, not a global page-load heuristic

**Decision**: a dedicated `/auth/callback` page (set as `signInWithOAuth`'s `redirectTo`) is where the pending contact actually completes, calling a new `completePendingContact()` context method.

**Rationale**: `@supabase/supabase-js`'s default client config (confirmed in `app/src/lib/data/supabaseClient.ts` — no `auth` option overrides) already has `detectSessionInUrl: true`/`persistSession: true`, so the SDK auto-parses the auth tokens from the redirect URL and fires `onAuthStateChange` with no manual URL parsing needed. A dedicated route gives a clear, dedicated place to show a loading state and handle each outcome (success / org no longer available / lead save failed with retry) distinctly, rather than trying to detect "we just returned from OAuth" ambiguously on every route.

## R11 — `ContactSuccess.tsx` needs a small plumbing fix (real gap, not speculative)

**Decision**: add a `lastContactedOrganization` field to session state, set directly from the same organization snapshot already fetched for FR-013's re-verification, and have `ContactSuccess.tsx` prefer it over the existing in-memory `getOrganization()` lookup when present.

**Rationale**: `ContactSuccess.tsx` currently resolves the organization via `state.results`, which is empty after the OAuth full-page reload (the same class of gap 002's plan already flagged for a plain page refresh). Without this fix, the one screen this entire feature exists to reach would silently show "no organization" for every first-time-login contact. No extra query needed — the data was already fetched for the re-verification step.

## R12 — Pre-Lead-insert re-verification via a targeted single-row read (FR-013)

**Decision**: `getOrganizationContactSnapshot(id)`, added to the existing `app/src/lib/data/organizations.ts`, re-checks `is_active`/`profile_status` immediately before Lead creation — not a full `getOrganizations()` re-fetch.

**Rationale**: cheapest correct check; doubles as the data needed to rebuild the external redirect URL after the OAuth reload (R11), so it's one query serving two needs, not two separate ones.

**Flagged, not fixed here**: this is now the third place the "is this org publicly visible" predicate is expressed (SQL-side `is_organization_visible()` from migration 0008, `getOrganizations()`'s inline filter, and this) — a future cleanup should extract one shared TS helper. Not required to ship this feature; noted so it doesn't silently become a fourth copy later.

## R13 — Testing strategy for authenticated-role writes: manual/E2E, not a service_role-backed integration test

**Decision**: `createLead`/`ensureUserRow` (both require a real `authenticated` RLS session) are verified via manual end-to-end testing against real Google OAuth once R1's credentials are configured — the same way 001/002's live-DB integration tests are run, but through the actual browser OAuth flow rather than a scripted anon-role test. No test-only mechanism using the `service_role` key is introduced.

**Rationale**: this project's established security posture (reinforced repeatedly this session) never requests, handles, or stores the `service_role` key anywhere — including test setup. 002's existing integration-test pattern only exercises the `anon` role and can't be extended to cover authenticated writes without either that key or a real logged-in session, and only the latter is consistent with how every other Supabase credential in this project has been handled. Pure logic (`leadMappers.ts`, `pendingContact.ts`) still gets full TDD unit coverage (constitution Principle III) — only the RLS-gated write path itself is manually verified.

## Cross-check result

The `backend-architect` confirmed: no new columns anywhere, `leads` stays fully immutable (insert-only, no status field, no update/delete call anywhere in this design), and login is never triggered earlier in the funnel than a contact click — the one new auth-adjacent code path (`onAuthStateChange` restoring a pre-existing session on boot) only recognizes a session the user already created, it doesn't prompt a new login.
