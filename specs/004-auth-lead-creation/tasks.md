# Tasks: Real Auth & Lead Creation (North Star)

**Input**: Design documents from `specs/004-auth-lead-creation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/lead-creation.md, quickstart.md

**Tests**: INCLUDED for pure logic — the constitution (Principle III) mandates test-first for `pendingContact.ts` and `leadMappers.ts` (incl. the FR-013 contactability decision logic). `createLead`/`ensureUserRow` themselves are RLS-gated I/O verified manually/E2E instead (research.md R13 — no `service_role`-backed integration test). UI wiring tasks are not test-gated beyond that.

**Organization**: by user story (US1 P1, US2 P2, US3 P3 from spec.md), so each is independently testable where the underlying auth mechanism allows.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete-task dependency)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish have no story label)

---

## Phase 1: Setup (shared infrastructure)

- [X] T001 Owner action: configure Google OAuth — create an OAuth 2.0 Client ID in Google Cloud Console, enable the Google provider in the Supabase dashboard with that Client ID/Secret, and add `<origin>/auth/callback` (dev + prod) to Supabase Auth's Redirect URLs allow-list. Nothing in this feature is end-to-end testable without this (research.md R1; quickstart.md)
- [X] T002 [P] Add `DbContactType`, `DbLeadSource` types to `app/src/lib/data/types.ts` (data-model.md)

---

## Phase 2: Foundational (blocking prerequisites)

**⚠️ CRITICAL**: no user story can be verified until the RLS gaps are closed and the write/read plumbing exists.

- [X] T003 Write migration `supabase/migrations/0010_users_rls_policies.sql` — `authenticated`-only insert/update/select on `users`, scoped to `id = auth.uid()`, no `anon` policy (research.md R2, R3)
- [X] T004 Write migration `supabase/migrations/0011_authenticated_match_write.sql` — `authenticated`-role insert policies for `match_sessions`/`match_results`, mirroring 002's `anon` policies (research.md R4 — closes a real regression risk in 002's shipped Sport Match™ persistence once login survives reload)
- [X] T005 Owner action: apply migrations from T003 and T004 to the Supabase project via the SQL Editor
- [X] T006 [P] Trim `ContactType` to `"whatsapp" | "instagram" | "booking" | "call" | "form"` in `app/src/types.ts`; update `OrganizationProfile.tsx`'s `{ type: "booking_link", ... }` → `{ type: "booking", ... }` (research.md R6 — confirmed via grep that `call`/`contact_form`/`trial_class_request` are otherwise unused)
- [X] T007 [P] Add `LeadSource = "result_card" | "organization_profile" | "event_profile" | "direct_search" | "admin_test"` to `app/src/types.ts`; retype `requestContact`'s `source` param, `PendingContact.source`, and `buildLead`'s `source` param from `string` → `LeadSource` (research.md R7)
- [X] T008 [P] Export `GOAL_MAP` (currently module-private) from `app/src/lib/data/sessionMappers.ts` — reused by `leadMappers.ts` (T016) instead of a second copy of the goal vocabulary (research.md §6.1)
- [X] T009 Add `id: string` to `MatchResultInsertRow` in `sessionMappers.ts`; `buildMatchResultRows` generates a client-side `crypto.randomUUID()` per row instead of relying on the DB default (research.md R8 — `match_results` has no SELECT policy, so a DB-generated id can never be read back) (depends on T002)
- [X] T010 Update `createMatchSession` in `app/src/lib/data/matchSessions.ts`: accept an optional `userId` param (passed through to `buildMatchSessionRow`), return `matchResultIds: Record<organizationId, string>` alongside the existing `matchSessionId`/`persisted` fields (research.md R8, R4) (depends on T009)
- [X] T011 [P] Update `buildMatchSessionRow` in `sessionMappers.ts` to accept an optional `userId`, setting `user_id` to it (or `null` if absent) instead of the current hardcoded `null` (research.md R4)
- [X] T012 [P] Add optional `id?: string` to `MatchResult` in `app/src/types.ts`; simplify the `Lead` type to only its actually-displayed fields (`id`, `organizationId`, `contactType`, `createdAt`) — a separate DB-shaped `LeadInsertRow` (T016) now serves the write path (backend.md §7.4)
- [X] T013 Write failing tests in `app/src/lib/pendingContact.test.ts` — `savePendingContact`/`readPendingContact`/`clearPendingContact` round-trip against a mocked `sessionStorage`, plus a corrupt-JSON-value case that clears itself rather than looping forever
- [X] T014 Implement `app/src/lib/pendingContact.ts` — makes T013 pass (depends on T006, T007, T012, T013)
- [X] T015 Write failing tests in `app/src/lib/data/leadMappers.test.ts` — every `ContactType`/`LeadSource` value maps correctly in `buildLeadInsertRow`; `resolveContactValue`'s decision logic for each contact type including a "channel no longer exists on this org" case (FR-013's contactability check, extracted as pure/testable per plan.md's Constitution Check note)
- [X] T016 Implement `app/src/lib/data/leadMappers.ts` (`buildLeadInsertRow`, `resolveContactValue`) — makes T015 pass (depends on T006, T007, T008, T015)
- [X] T017 [P] Create `app/src/lib/data/users.ts` — `ensureUserRow(authUser)`, idempotent upsert, `id` always `authUser.id` (research.md R2, R5)
- [X] T018 [P] Add `getOrganizationContactSnapshot(id)` to `app/src/lib/data/organizations.ts` — single-row re-check of `is_active`/`profile_status` immediately before a Lead insert (FR-013, research.md R12)
- [X] T019 Implement `createLead(input)` in `app/src/lib/data/leads.ts` — throws on failure (never swallows, unlike `createMatchSession`), client-generated `id` (contracts/lead-creation.md) (depends on T016)
- [X] T020 Add an `onAuthStateChange` listener to `MatchSessionProvider` in `MatchSessionContext.tsx` — restores `isLoggedIn`/`userName` from a real Supabase session on mount and on every auth event, calls `ensureUserRow` (research.md R5, §8; serves both US2's post-redirect moment and US3's page-reload moment with one listener) (depends on T017)
- [X] T021 [P] Add 4 new analytics events (`login_started`, `login_completed`, `lead_created`, `external_contact_opened`) to `app/src/lib/analytics.ts`'s `AnalyticsEvent` union (FR-012, BR-027)

**Checkpoint**: RLS gaps closed; all pure logic implemented and test-covered; real session restore wired — user story work can begin.

---

## Phase 3: User Story 1 — A contact click reliably creates a real Lead (Priority: P1) 🎯 MVP-of-this-feature

**Goal**: a logged-in user's contact click produces a real, permanent `leads` row before the external destination opens.

**Independent Test**: this story's *logic* is independently verified by Foundational's unit tests (T015/T016 — every enum mapping and the contactability decision). A full click-through requires a real logged-in session, which User Story 2 provides — end-to-end verification happens together with US2's quickstart flow (this is the same kind of necessary coupling 002-sport-match-engine had between its own P1/P2 stories).

### Implementation for User Story 1

- [X] T022 [US1] Add `performContact(pending, currentUserId)` orchestration to `MatchSessionContext.tsx` — `getOrganizationContactSnapshot` → `resolveContactValue` → `createLead` → `track("lead_created")`, returning a `success`/`org_unavailable`/`lead_failed` outcome (contracts/lead-creation.md) (depends on T018, T016, T019, T010, T011)
- [X] T023 [US1] Update `requestContact`'s already-logged-in branch to call `performContact()` (now async) instead of building and only `console.log`-ing a Lead locally
- [X] T024 [US1] Update `OrganizationProfile.tsx`'s `handleContact()` to be async, `await requestContact()`, and branch on the new outcome shape (success → navigate to contact success; `org_unavailable` → inline unavailable message; `lead_failed` → visible retry affordance, FR-010) instead of a boolean
- [X] T025 [US1] Add `lastContactedOrganization` to session state, set from `performContact`'s organization snapshot on a `success` outcome (backend.md §7.4) (depends on T022)
- [X] T026 [US1] Update `ContactSuccess.tsx` to prefer `lastContactedOrganization` over the in-memory `getOrganization()` lookup when present, falling back to the existing lookup for the same-session (no redirect happened) case (depends on T025)

**Checkpoint**: Lead-creation mechanics complete, unit-tested, and code-reviewable; full click-through verification pending US2's real login.

---

## Phase 4: User Story 2 — Login is real, and doesn't lose the user's place (Priority: P2)

**Goal**: an unauthenticated user's contact click survives a real Google OAuth round-trip and completes automatically on return.

**Independent Test**: as a logged-out visitor, click any contact button; a real Google account chooser appears (not a fake button); after choosing an account, the app lands back on a completed contact — Lead created, external destination opened — without the user re-clicking anything (quickstart.md).

### Implementation for User Story 2

- [X] T027 [US2] Update `requestContact`'s not-logged-in branch to call `savePendingContact()` (sessionStorage, T014) with the full context needed to complete the contact later, instead of only in-memory `pendingContact` state, then navigate to `/login`
- [X] T028 [US2] Replace `Login.tsx`'s fake `login()` with a real `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } })` call; hide the Apple button (research.md R1 — Google only this milestone)
- [X] T029 [US2] Add the `/auth/callback` route to `App.tsx`
- [X] T030 [US2] Create `app/src/pages/AuthCallback.tsx` — loading state on mount, calls `completePendingContact()`, branches on the outcome (`success` → contact-success UI; `no_pending` → navigate home, not a blank screen (Edge Cases); `org_unavailable` → inline unavailable message; `lead_failed` → visible retry that re-calls `completePendingContact()`)
- [X] T031 [US2] Implement `completePendingContact()` in `MatchSessionContext.tsx` — reads the current session, calls `ensureUserRow`, reads the stored `pendingContact`, calls `performContact`, clears the stored pending contact on `success`/`org_unavailable` only (never on `lead_failed`, so a retry can re-run against the same data) (depends on T022, T017, T014)
- [X] T032 [US2] Manual end-to-end verification per quickstart.md: logged-out contact click → real Google login → automatic completion; confirm a `leads` row exists (Table Editor) and the external destination opened only after it did

**Checkpoint**: the full logged-out → OAuth → Lead → external-redirect flow works end to end against real Google OAuth.

---

## Phase 5: User Story 3 — Being logged in actually means something (Priority: P3)

**Goal**: a logged-in user stays logged in across a page reload within the same visit.

**Independent Test**: log in, reload the page, confirm still recognized as logged in with no login prompt shown (quickstart.md). The mechanism itself already landed in Foundational (T020's `onAuthStateChange` listener, which Supabase's default `persistSession: true` config backs) — this phase is verification-only, not new code.

### Implementation for User Story 3

- [X] T033 [US3] Manual verification per quickstart.md: log in (via US2's real flow), reload the page, confirm `isLoggedIn` remains `true` and no login screen appears

**Checkpoint**: all three user stories independently functional; the North Star flow is complete end to end.

---

## Phase 6: Polish & cross-cutting

- [X] T034 [P] Doc-sync: add 2 RLS bullets to `docs/database-schema.md` (users, and the authenticated match-write policies — research.md R3/R4), an implementation note under `POST /api/leads` in `docs/api-contracts.md` plus a note that user provisioning has no dedicated REST-shaped contract (client-side upsert), and one clarifying sentence on `docs/data-model.md`'s `User` section (`id` is always `auth.uid()`, never independently generated — research.md R2)
- [X] T035 Run the `data-model-review` skill against the diff (two new migrations touch `database-schema.md`-adjacent code)
- [X] T036 Run the `trust-safety-review` skill against the diff — **mandatory, not conditional**, for this feature (constitution Principle VI: touches auth, real user PII, contact-info visibility)
- [X] T037 Invoke the `security-privacy-auditor` agent for a dedicated pre-release audit of the actual implemented code (constitution Principle VI; `docs/security-standards.md`'s explicit instruction) — confirm the auth → Lead → external-redirect ordering is atomic and matches `docs/ux-flows.md` Flow 5 in real code, not just this plan
- [X] T038 Run `specs/004-auth-lead-creation/quickstart.md` validation end-to-end

---

## Dependencies & Execution Order

- **Setup** → **Foundational** → **Stories (US1 → US2 → US3)** → **Polish**.
- **US1 (P1)** needs Setup + Foundational only for its *code*; a full manual click-through additionally needs US2's real login to exist.
- **US2 (P2)** needs Foundational (T014's `pendingContact.ts`, T020's session-restore listener, T022's `performContact` from US1 — since `completePendingContact` calls it).
- **US3 (P3)** needs only Foundational (T020) — no new code, verification only.
- Within Foundational: T002 before T009; T009 before T010; T006+T007+T008 before T015/T016; T013 (test) before T014; T015 (test) before T016; T016 before T019; T017 before T020.

### Parallel opportunities

- Setup: T002 alone (T001 is an owner action, not parallelizable code).
- Foundational: T006, T007, T008, T011, T012 in parallel (different files/regions); T017, T018 in parallel; T021 in parallel with anything.
- US1's T022-T026 are largely sequential (same file, `MatchSessionContext.tsx`, then its consumers) — limited parallelism within this story.
- US3's T033 can run any time after T020 lands, in parallel with US1/US2 work.

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1 + US2.** US1 alone isn't demoable without US2 (no real way to be "logged in" otherwise) — together they deliver the complete North Star flow. US3 hardens the experience (no repeated logins) but the funnel technically works without it (a user would just need to log in again each visit, not ideal but not broken).

## Notes

- `leads` remains fully immutable throughout — no task in this list ever adds an `UPDATE`/`DELETE` call or an RLS policy enabling one. Confirm at T035/T036/T037.
- Apple Sign In is deferred (research.md R1) — do not build it as part of this feature; the code stays structurally ready (`provider: "google" | "apple"` type unchanged) for a fast, low-risk follow-up once the owner completes Apple's setup.
- T036/T037 (trust-safety-review, security-privacy-auditor) are **mandatory** for this feature per constitution Principle VI — do not skip them as "optional polish."
