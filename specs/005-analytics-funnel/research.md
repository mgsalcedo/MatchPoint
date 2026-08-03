# Research: Analytics & Funnel Measurement

Phase 0 output for `/speckit-plan`. Consolidates the `backend-architect` agent's findings (`.claude/doc/analytics-funnel/backend.md`) into the numbered-decision format established by `004-auth-lead-creation/research.md`.

## R1 — Corrected gap count: 4 missing events, not 3

The feature description's Problem statement said 2 events were entirely missing and 1 needed splitting off from `lead_created`. Cross-checking BR-027's literal 9-step list against actual `track({` call sites in `app/src` found a fourth gap the description didn't name: **`profile_opened`** has no call site anywhere in `OrganizationProfile.tsx`. Corrected mapping:

| BR-027 step | Tracked today? |
|---|---|
| app opened | ❌ missing → `app_opened` |
| match started | ❌ missing → `match_started` |
| complete match | ✅ `sport_match_completed` |
| view results | ✅ `results_viewed` |
| open profile | ❌ missing → `profile_opened` |
| click contact | ❌ missing → `contact_clicked` |
| login complete | ✅ `login_completed` |
| lead created | ✅ `lead_created` |
| external contact opened | ✅ `external_contact_opened` |

**Decision**: add all 4 missing events, not 3. This does not change the spec's scope (FR-001 already requires all 9 steps) — it only corrects an undercount in the feature description that would have shipped an incomplete FR-001 if taken literally.

## R2 — No pre-existing visitor-correlation identifier exists; spec.md's Assumption is incorrect

`specs/005-analytics-funnel/spec.md`'s Assumptions section states visit correlation "reuses the identifier approach already established for anonymous Sport Match™ sessions." This does not hold up: `match_sessions.anonymous_id` (migration `0006`) is confirmed dead code — `sessionMappers.ts` never writes it (`buildMatchSessionRow`'s own comment: "anonymous_id is deliberately omitted (stays DB-null) — nothing reads it yet") and nothing reads it either.

**Decision**: introduce a new client-generated `visit_id` (`crypto.randomUUID()`), not a retrofit of `anonymous_id`. See R3 for why `anonymous_id` itself isn't touched.

**Correction for the record**: `spec.md`'s Assumptions section is superseded on this one point by this research entry, per this project's convention that Phase 0 research is where a spec-time assumption gets corrected once implementation-level investigation contradicts it — this does not change the spec's scope, requirements, or success criteria, only which existing mechanism (if any) the correlation identifier builds on.

## R3 — `visit_id`: sessionStorage, generated on first `track()` call, not `localStorage` and not a retrofit of `anonymous_id`

**Decision**: new `app/src/lib/visitId.ts`, `getOrCreateVisitId()` — reads/writes a single `sessionStorage` key (`matchpoint:visitId`), same shape as `pendingContact.ts`.

**Rationale**:
- **Not `localStorage`**: the spec's own Edge Cases section says repeat visits within a sitting are each recorded as their own event, not deduplicated, and the SQL queries operate on "funnel steps within a correlated visit, not unique-visitor counts." A durable, forever-lived id would blur "visit" into "device identity" — a heavier privacy posture than asked for, especially with no consent/opt-out mechanism yet (a separately tracked, explicitly out-of-scope gap).
- **`sessionStorage`, specifically**: mirrors `pendingContact.ts`'s already-proven behavior — it survives a same-tab reload *and* the full-page OAuth redirect round-trip (`signInWithOAuth`'s navigation away from the SPA and back), which is exactly what's needed so a visitor's pre-login events (`app_opened`, `match_started`, ..., `contact_clicked`) and post-login events (`login_completed`, `lead_created`, `external_contact_opened`) share the same `visit_id` with zero extra plumbing.
- **Not derived from `matchSessionId`**: `matchSessionId` (`crypto.randomUUID()`, generated in `MatchSessionContext.tsx`'s `finalizeMatch`) does not exist until the questionnaire's last question is answered — too late for `app_opened`/`match_started`, which is the entire first half of the funnel.
- **Not a retrofit of `match_sessions.anonymous_id`**: would require threading a new parameter through three already-shipped functions (`buildMatchSessionRow` → `createMatchSession` → `finalizeMatch`) across two prior features, for a join path the new `analytics_events.match_session_id` column already provides directly. `anonymous_id` stays unused; flagged as a candidate for a future cleanup note, not actioned here.

## R4 — One migration file, not split

**Decision**: `supabase/migrations/0012_analytics_events.sql` — table DDL, enum, indexes, and both `anon`/`authenticated` INSERT policies in one file.

**Rationale**: `004`'s two-migration split (`0010`/`0011`) existed because it touched two structurally separate, already-existing tables with two distinct rationales. Here there is exactly one brand-new table needing both roles' insert access for the same reason (a visitor can go from anonymous to logged-in mid-funnel) — no reason to fragment one table's own DDL from its own RLS.

## R5 — No foreign keys on any correlation column

**Decision**: `user_id`, `organization_id`, `match_session_id`, `lead_id` are plain `uuid` columns, not `references`. `contact_type` is the one exception — it reuses the existing `contact_type` enum type (no FK failure mode, so no reliability cost).

**Rationale**:
1. **Reliability**: this table's job is best-effort telemetry (FR-005 — must never block/fail visibly). A concrete race exists: `MatchSessionContext.tsx`'s `onAuthStateChange` listener calls `ensureUserRow(session.user)` fire-and-forget (not awaited) before setting `userId` in state — an analytics event carrying that `userId` could reach the DB before the `users` row commits. With an FK this becomes an intermittent silent write failure for exactly the freshly-logged-in-user events the funnel most wants; with a plain column it's a harmless orphaned value.
2. **Future-proofing against user deletion**: `docs/security-standards.md` requires an eventual account-deletion path. An FK to `users(id)` would force an `ON DELETE` decision now (cascade silently erases funnel history; set-null needs adding everywhere) for a table that, by nature, should keep historical rows regardless of whether the underlying identity still exists — the normal, accepted behavior for analytics/log tables.

## R6 — No `jsonb` payload column; narrow typed columns instead

**Decision**: one column per field actually used by some event (`sport`, `district`, `match_session_id`, `result_count`, `organization_id`, `contact_type`, `result_rank`, `lead_id`, `login_provider`), all nullable, most `null` for most rows depending on `event_name`.

**Rationale**: matches `docs/security-standards.md`'s allow-list posture and the discipline already applied to the 7 existing event payloads (ids, enums, counts only). A `jsonb` blob would invite a future author to stuff an arbitrary key into it, silently reintroducing the PII/precision risk this discipline exists to prevent, and would make every column non-greppable/self-documenting.

## R7 — Write path: fire-and-forget, matches `createMatchSession`'s pattern, not `createLead`'s

**Decision**: `installSupabaseAnalyticsSink()` (new `app/src/lib/data/analyticsEvents.ts`) replaces `analytics.ts`'s default console sink. `track()`'s synchronous signature is preserved — the actual Supabase write happens in a detached `void writeEvent(event)` call; any failure is caught and only `console.error`'d (message-only, per the logging-hygiene fix already applied in `004`), never re-thrown, never surfaced to the user.

**Rationale**: task principle — an analytics write failure must never block or visibly fail any user-facing action, including the North Star Lead-creation flow. This is `createMatchSession`'s "never throws, degrades silently" pattern (research.md R9, `002-sport-match-engine`), explicitly not `createLead`'s "must throw, must block" pattern (that guarantee is specific to BR-003's Lead-before-redirect ordering and does not apply here).

## R8 — `user_id` resolved centrally inside the sink, not threaded through every `track()` call site

**Decision**: `writeEvent()` calls `supabase.auth.getSession()` (a locally-cached read, no network round trip in the common case) to resolve `user_id` at write time, rather than requiring every caller of `track()` to pass it.

**Rationale**: only 4 new call sites are added this feature; resolving `user_id` in one place means the 7 existing call sites need zero changes, and call sites with no natural access to session state (e.g. `App.tsx`'s mount-time `app_opened`) don't need it wired in just to satisfy analytics.

## R9 — New event call-site placement

- **`app_opened`** — `App.tsx`, mount-time `useEffect`. Fires on every mount, including the real document-navigation remount after the OAuth redirect lands on `/auth/callback` — intentional, not deduplicated, per spec Edge Cases.
- **`match_started`** — `SportMatch.tsx`, mount-time `useEffect` (mirrors `Results.tsx`'s existing `results_viewed`/`no_match_viewed` pattern). Chosen over `Welcome.tsx`'s button click because a visitor can land on `/match` directly (browser back/forward, refresh) without going through the click handler — mount is the more reliable "started" signal, consistent with how "completed" is already keyed to `finalizeMatch` running rather than a button.
- **`profile_opened`** — `OrganizationProfile.tsx`, mount-time `useEffect`, guarded on `organization` actually resolving (skips the "no longer available" branch — that's a failed lookup, not a successful open).
- **`contact_clicked`** — `OrganizationProfile.tsx`'s `handleContact()`, as the first statement, before `setContactState("sending")` and before `requestContact(...)` — satisfies FR-002's "recorded independent of and prior to knowing the outcome" literally.

No changes needed at the 7 existing call sites — only where their output goes (R7/R8) changes, not when they fire.

## R10 — SQL queries doc: schema-level requirements, not written by this plan

Table design must support all 5 of Story 3's metrics; the one correctness nuance to flag for whoever writes the SQL doc (`docs/analytics-queries.md`): **profile→contact CTR must join on `(visit_id, organization_id)` together**, not `visit_id` alone — a visitor who opens two different profiles in one visit and contacts only one of them would be overcounted by a `visit_id`-only join. Both columns are present in every row that needs them.

Drop-off-by-step requires hardcoding BR-027's canonical 9-step order in the query itself (deliberately not adding an `order` column to the table — that would just duplicate BR-027's own list and risk drifting from it).

## R11 — Doc updates required

- `docs/data-model.md`: new `AnalyticsEvent` prose section (no ER-diagram entry — it has no enforced relationships to draw, unlike `Lead`/`MatchResult`; excluded for that reason, not because it's deferred like `Event`/`Coach`).
- `docs/database-schema.md`: new `### analytics_events` table section, RLS-notes bullet, migration-order entry.
- `docs/api-contracts.md`: short implementation note (direct Supabase insert, RLS-gated, no REST endpoint) — same style as `004`'s user-provisioning note, not a fabricated `POST /api/analytics-events`.

## R12 — Risks flagged, not solved this milestone

- No rate limiting on inserts (same known, already-deferred gap as `match_sessions`/`match_results` since `0009`) — an anonymous flood wouldn't leak data (no SELECT policy for any client role) but would pollute the very metrics this feature exists to produce. Monitor post-launch, not solved here.
- No retention/archival policy — fine at PMV/Lima-only scale, named so it isn't rediscovered as a surprise later.
- `StrictMode` double-invokes the 3 new mount effects in dev (pre-existing, accepted characteristic already true of `Results.tsx`'s effect — production builds don't double-invoke).
- Volume: `app_opened` fires on every reload and every post-OAuth remount, not just true first visits — negligible at PMV scale, named because it's an uncapped multiplier worth knowing about.
- **`trust-safety-review` recommended before merge**, even though this doesn't cleanly hit the letter of `docs/security-standards.md`'s auto-trigger list (no new contact-info exposure, no new auth mechanism) — it does newly aggregate `user_id` + district + organization at a durability/volume the project hasn't had before, which is exactly the kind of judgment call that trigger exists for.

## R13 — Testing strategy

TDD (constitution Principle III doesn't strictly gate this — it's not matching/ranking/lead-eligibility logic — but the project's established pattern of testing pure mapper modules applies): `analyticsEventMappers.ts` (exhaustive-switch, TypeScript enforces every `AnalyticsEvent` variant is handled) and `visitId.ts` (pure, mocked-`Storage` testable, same shape as `pendingContact.test.ts`) both get unit tests before implementation.

Unlike `004`'s `createLead`/`ensureUserRow` (which needed manual/E2E verification only, per `004/research.md` R13, to avoid ever touching `service_role`), this feature's `anon`-role write path (`app_opened`/`match_started`/`profile_opened`/`contact_clicked`, all fired before login) **can** get a live-DB integration test using the existing `anon`-only pattern already established in `002` (an anonymous Supabase client, no elevated credentials needed) — only the `authenticated`-role half of the RLS policy needs manual/E2E verification, matching R13's already-accepted precedent for that specific gap.
