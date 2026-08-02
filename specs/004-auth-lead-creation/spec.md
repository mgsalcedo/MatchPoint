# Feature Specification: Real Auth & Lead Creation (North Star)

**Feature Branch**: `004-auth-lead-creation`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Milestone 5 from docs/roadmap.md: real Google/Apple authentication via Supabase Auth, and real Lead creation — the PMV's North Star event (constitution Principle IV, BR-003). Replaces the current fully-mocked login/contact flow in MatchSessionContext.tsx (login() just sets isLoggedIn=true locally with a fake name; requestContact()/confirmPendingContact() build a Lead object and only console.log it, no persistence) with the real thing. Objective: a user who reaches a contact CTA (WhatsApp/Instagram/booking on an organization profile) without being logged in is sent through a real Google or Apple OAuth flow (Supabase Auth); on return, a real Lead row is created in Supabase (not console-logged) before the external contact destination opens, exactly as BR-003 requires; a logged-in user's identity persists across page reloads (real session, not in-memory React state that resets on refresh). Problem: nothing in the current auth/contact flow is real — there's no actual OAuth integration, no persisted User record, and every 'Lead' is thrown away on page refresh. This is the literal North Star metric of the whole product (contacts generated) and right now it doesn't exist. Known technical facts: leads RLS already correct from 001; users table RLS is deny-all and needs a new policy; real OAuth needs owner-configured Google/Apple credentials in Supabase Auth; signInWithOAuth is a full-page redirect that will lose in-memory pendingContact state unless deliberately persisted; ContactType/contact_type enum mismatch needs resolving; lead_source needs to be properly typed. Explicitly out of scope: linking an anonymous match_session to the user post-login; the profile-claim flow; admin/moderation UI; lead de-duplication (BR-021)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A contact click reliably creates a real Lead (Priority: P1)

A logged-in user clicks a contact button (WhatsApp, Instagram, or booking) on an organization's profile, and a real, permanent record of that contact intent is saved before the external app/site opens — because this one action is the entire point of the product.

**Why this priority**: This is the North Star metric (constitution Principle IV). Everything else in the product — the questionnaire, the matching, the profiles — exists only to produce this moment. If this doesn't work, nothing else matters yet.

**Independent Test**: As a logged-in user, click a contact button on a real organization's profile; confirm a Lead record now exists in the database with the correct organization, contact type, and match context, and that the external destination (WhatsApp/Instagram/booking URL) opens only after that record is confirmed saved.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing an organization with a WhatsApp number, **When** they tap "Contactar por WhatsApp", **Then** a Lead is saved before WhatsApp opens, and WhatsApp opens to the correct number.
2. **Given** the same user, **When** they contact a second organization from the same match session, **Then** a second, independent Lead is created (one user may generate multiple leads from one session).
3. **Given** a Lead has been created, **When** anyone inspects it later, **Then** it is exactly as it was created — nothing about it can be edited or given a status after the fact.

---

### User Story 2 - Login is real, and doesn't lose the user's place (Priority: P2)

A user who isn't logged in yet, and clicks a contact button, is asked to continue with their real Google or Apple account. After they do, they land back exactly where they were trying to go — the contact they originally clicked completes automatically, without them having to find and click it again.

**Why this priority**: Second most critical — User Story 1 can't happen for a first-time visitor without this. Ranked below US1 because a returning, already-logged-in user (who this milestone also serves) doesn't need it every time.

**Independent Test**: As a brand-new (never-logged-in) visitor, click a contact button; confirm real Google/Apple account selection appears (not a fake button); after choosing an account, confirm the app returns to a completed state for the exact contact that was originally requested, without the user needing to click it again.

**Acceptance Scenarios**:

1. **Given** a user who isn't logged in, **When** they click any contact button, **Then** they see only two options — continue with Google, continue with Apple — no password field, no long signup form.
2. **Given** the user completes real account selection, **When** they land back in the app, **Then** the original contact action they clicked before logging in completes automatically (Lead created, external destination opens) — they are not dropped on a generic screen and asked to start over.
3. **Given** a user closes the account-selection screen without completing it, **When** they return to the app, **Then** no Lead was created and no external destination opened — nothing happens silently on their behalf.

---

### User Story 3 - Being logged in actually means something (Priority: P3)

A user who logged in earlier in their visit doesn't have to log in again if they reload the page or come back a few minutes later within the same visit.

**Why this priority**: Lower priority than the two above — a user only needs to log in once per contact attempt for the PMV to prove its core value, and re-prompting on every reload, while not ideal, wouldn't stop User Story 1/2 from working. But a session that vanishes on refresh looks broken and undermines trust in the "we saved your match" promise.

**Independent Test**: Log in, then reload the page; confirm the user is still recognized as logged in without seeing the login screen again.

**Acceptance Scenarios**:

1. **Given** a user has completed login, **When** they reload the page, **Then** they remain logged in.
2. **Given** a user explicitly logs out (if a logout action exists) or their session naturally expires, **When** they next click contact, **Then** they are correctly asked to log in again.

---

### Edge Cases

- What happens if the Lead fails to save (network error) after login succeeds? The external destination must NOT open — per BR-003, the Lead must exist before the external redirect happens; the user should see a clear failure state and be able to retry the same contact action, not silently lose their intent.
- What happens if a user's OAuth login succeeds but they had no pending contact action (e.g., they logged in some other way, or their pending action expired)? They should land somewhere sensible (e.g., their match results), not on a broken or blank screen.
- What happens if the user contacts the same organization twice in a row (e.g., double-click, or clicking WhatsApp then Instagram for the same org)? Each distinct contact action creates its own Lead (per BR-020); no attempt is made here to detect or block near-duplicate leads (BR-021 is explicitly future scope).
- What happens if login is attempted for an organization that has since become unavailable (e.g., suspended) between when the user clicked contact and when they finish logging in? The contact action should not silently succeed against stale data — recheck the organization is still contactable before creating the Lead.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show only two authentication options — continue with Google, continue with Apple — with no password field and no signup form of any kind.
- **FR-002**: The system MUST NOT require login at any point before a user attempts to contact an organization (preserving every prior milestone's no-login-before-value behavior).
- **FR-003**: When an unauthenticated user attempts to contact an organization, the system MUST present the login options before proceeding, and MUST remember which contact action was requested.
- **FR-004**: After a user successfully authenticates, the system MUST automatically complete the contact action that was originally requested, without requiring the user to repeat it.
- **FR-005**: If a user does not complete authentication (cancels or abandons it), the system MUST NOT create a Lead or open any external destination.
- **FR-006**: The system MUST create a permanent Lead record for every completed contact action, containing at minimum: who took the action, which organization, which contact method, and the match context (session/result) it came from, if any.
- **FR-007**: The system MUST create the Lead record before opening the external contact destination (WhatsApp, Instagram, or booking link) — never after, never in parallel.
- **FR-008**: A Lead, once created, MUST NOT be editable or assigned any status/lifecycle state — it is a single permanent record of an event, not a record that changes over time.
- **FR-009**: A user MUST be able to create more than one Lead across different organizations (or different contact methods on the same organization) within the same visit.
- **FR-010**: If saving a Lead fails, the system MUST NOT open the external destination, and MUST give the user a clear way to know the action didn't complete and try again.
- **FR-011**: The system MUST remember that a user is logged in across a page reload within the same visit, without asking them to log in again.
- **FR-012**: The system MUST record analytics events for the login and contact funnel steps (login started, login completed, lead created, external contact opened), consistent with the events already tracked earlier in the funnel.
- **FR-013**: Before creating a Lead, the system MUST re-verify the organization is still publicly contactable (not suspended/archived/rejected since the user started), and MUST NOT create a Lead against an organization that no longer qualifies.

### Key Entities *(include if feature involves data)*

- **User** *(existing entity, first real use)*: A person who has authenticated at least once. Created the first time someone completes login — this feature is what actually populates this entity for the first time.
- **Lead** *(existing entity, first real use)*: One permanent record of one contact attempt by one user toward one organization. This feature is what actually populates this entity for the first time; its shape and immutability rule are already decided (`docs/data-model.md`) and are not renegotiated here.
- **Match Session** / **Match Result** *(existing, from 002-sport-match-engine)*: Referenced by a Lead when the contact came from a match (as opposed to, say, a direct organization search) — not modified by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed contact actions produce exactly one corresponding Lead record, verifiable by count.
- **SC-002**: A first-time visitor can go from clicking "contact" to the external destination opening (via real login) in a single continuous flow, without being asked to repeat the contact action they originally clicked.
- **SC-003**: A logged-in user remains recognized as logged in after a page reload, 100% of the time within the same visit.
- **SC-004**: Zero external destinations open without a corresponding saved Lead existing first.
- **SC-005**: The full login-to-contact funnel (login started → login completed → lead created → external contact opened) is measurable end to end from recorded events.

## Assumptions

- Real Google and Apple OAuth credentials will be configured by the project owner directly in the Supabase Auth dashboard before this feature can be tested end-to-end against real providers; this feature's engineering work does not include obtaining those credentials, only integrating with them once available.
- "Within the same visit" for session persistence (User Story 3) means the standard behavior of a normal browser session; this feature does not need to specify an exact expiry duration — whatever Supabase Auth's default session handling provides is acceptable for the PMV.
- Linking a previously-anonymous match session to a user after they log in is out of scope — a Lead created after login stands on its own and does not require retroactively updating the match session that led to it.
- A user's Google/Apple display name and profile info (already partially modeled in `docs/data-model.md`'s User entity) are captured as returned by the provider, without asking the user to fill in or edit anything.
- No logout affordance currently exists in the app; if the PMV wants one, that's a small, separate addition, not assumed as required here.
