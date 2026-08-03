# Feature Specification: Analytics & Funnel Measurement

**Feature Branch**: `005-analytics-funnel`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Milestone 6 from docs/roadmap.md: Analytics and PMV dashboard — measuring the funnel. Every event required by BR-027 must be tracked and durably stored (not just console-logged), so weekly funnel metrics can actually be computed. Owner-confirmed decisions: event storage is a new Supabase table (not a third-party tool); no dashboard UI, deliverable is documented SQL queries an owner runs manually."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every funnel step is captured, not just some of them (Priority: P1)

As the product owner, I need every step of the PMV funnel — from a visitor opening the app through generating a Lead — to be recorded as a durable event, so that no step of the funnel is a blind spot when I look at the numbers later.

**Why this priority**: The whole point of this milestone is to close the two real gaps (missing events, nothing stored). Without complete event coverage, every downstream metric (completion rate, CTRs, drop-off) is wrong or impossible to compute. This is the foundation everything else in this feature depends on.

**Independent Test**: Walk through the full funnel once (open app → start Sport Match™ → complete it → view results → open a profile → click contact → log in → Lead created → external contact opened) and confirm, via the Supabase Table Editor, that one event row exists for each of the 9 BR-027 steps, in the right order, all tied to the same visitor.

**Acceptance Scenarios**:

1. **Given** a first-time, logged-out visitor, **When** they open the app, **Then** an "app opened" event is recorded.
2. **Given** a visitor on the welcome screen, **When** they begin the Sport Match™ questionnaire, **Then** a "match started" event is recorded, distinct from "match completed."
3. **Given** a visitor who completes the questionnaire, **When** results are calculated, **Then** a "match completed" event and a "results viewed" event are both recorded (already implemented — this story confirms they remain intact).
4. **Given** a visitor viewing results, **When** they open an organization's profile, **Then** an "open profile" event is recorded.
5. **Given** a visitor on an organization profile, **When** they click the contact button — regardless of whether they end up logged in already, redirected to log in, or the Lead creation later fails — **Then** a "click contact" event is recorded at the moment of the click, independent of the outcome.
6. **Given** the same visitor later logs in, creates a Lead, and opens the external contact destination, **Then** "login complete," "lead created," and "external contact opened" events are all recorded (already implemented — this story confirms they remain intact and are now durably stored, not just console-logged).

---

### User Story 2 - Events survive so they can be analyzed later (Priority: P1)

As the product owner, I need every tracked event to be written to permanent storage, so that I can compute funnel metrics at any point after the fact instead of only being able to watch them scroll by in a browser console during a live session.

**Why this priority**: Equally foundational to User Story 1 — tracking an event that vanishes the moment the tab closes provides zero measurement value. Storage is what turns "we technically call track()" into "we can actually answer product questions."

**Independent Test**: Perform any tracked action (e.g., open the app) as an anonymous visitor with no account, then confirm a corresponding row appears in the analytics events table when queried directly in the Supabase Table Editor — without needing to be logged in for the write to succeed, and without the app being aware of or blocked by the write's outcome.

**Acceptance Scenarios**:

1. **Given** a visitor who has never logged in, **When** any funnel event fires, **Then** the event is written to durable storage successfully (anonymous writes are allowed).
2. **Given** a temporary storage failure (e.g., network issue), **When** an event fails to write, **Then** the user's experience is completely unaffected — no error shown, no action blocked, no crash.
3. **Given** events recorded across an anonymous visit and a later login by the same visitor, **When** the events are queried, **Then** they can be correlated as belonging to the same visit/session (not necessarily the same permanent identity, since anonymous visitors have none until they log in).

---

### User Story 3 - Weekly funnel metrics can actually be computed (Priority: P2)

As the product owner, I need a documented, ready-to-run way to compute the PMV's core funnel metrics for any given week, so I can track progress toward the PMV validation targets (60%+ Sport Match™ completion, 25%+ result-to-profile click-through, 10%+ profile-to-contact click-through, 100+ contacts) without needing anyone to build a reporting tool first.

**Why this priority**: This is the actual payoff of Stories 1 and 2 — turning raw stored events into the numbers the business actually needs. Lower priority than the first two only because it has no value at all until events exist and are stored; it is not lower in importance to the milestone's overall goal.

**Independent Test**: With at least one full funnel walkthrough's worth of events stored, run the documented queries and confirm they return correct counts/rates matching what was actually done during the walkthrough (e.g., 1 app open, 1 match started, 1 match completed → 100% completion rate for that sample).

**Acceptance Scenarios**:

1. **Given** stored events spanning a date range, **When** the documented Sport Match™ completion rate query is run, **Then** it returns the percentage of "match started" events that have a corresponding "match completed" event.
2. **Given** stored events spanning a date range, **When** the documented result→profile and profile→contact click-through queries are run, **Then** they return the correct percentages.
3. **Given** stored events spanning a date range, **When** the documented weekly contacts/leads-generated query is run, **Then** it returns the correct count.
4. **Given** stored events spanning a date range, **When** the documented drop-off query is run, **Then** it shows, step by step, how many visitors reached each funnel stage.

### Edge Cases

- What happens when an event's underlying action never completes (e.g., visitor abandons the questionnaire midway)? The "started" event still exists; the absence of a later "completed" event for that same visit is itself the signal (drop-off), not an error condition.
- How does the system handle a visitor who opens the app multiple times in one sitting (e.g., reloads)? Each distinct "app opened" trigger is recorded as its own event; this feature does not attempt to deduplicate repeat visits within a session — the SQL queries operate on funnel steps within a correlated visit, not unique-visitor counts.
- What happens if the analytics write fails while everything else in the same user action succeeds (e.g., a Lead is created but its "lead created" event fails to store)? The user-facing action is entirely unaffected — analytics failures are silent and never surface to the user or block a North Star action (Lead creation).
- What happens to events belonging to an anonymous visit that later logs in? They remain correlated by the existing visit/session identifier; this feature does not retroactively attach the visitor's now-known identity to their pre-login events (that would duplicate the explicitly out-of-scope "retroactive linking" decision already made for match sessions in a prior milestone).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST record a distinct, durable event for each of the 9 BR-027 funnel steps: app opened, match started, match completed, results viewed, profile opened, contact clicked, login completed, lead created, external contact opened.
- **FR-002**: System MUST record a "contact clicked" event at the moment a contact CTA is clicked, independent of and prior to knowing whether that click will result in an immediate Lead, a login redirect, or a failure.
- **FR-003**: System MUST persist every recorded event to durable storage such that it remains queryable after the originating browser session ends.
- **FR-004**: System MUST accept event writes from visitors who are not logged in (anonymous), without requiring authentication.
- **FR-005**: System MUST NOT block, delay, or visibly fail any user-facing action because an event failed to record.
- **FR-006**: System MUST NOT store raw free-text, precise location, or any other data excluded by the project's existing PII/location handling rules in any event payload — only identifiers, enumerated values (e.g., sport, contact type), and counts, matching the discipline already applied to existing events.
- **FR-007**: System MUST correlate events belonging to the same visit (e.g., one visitor's full funnel walkthrough) using an identifier consistent with the identifier scheme already used elsewhere for anonymous, pre-login activity.
- **FR-008**: System MUST provide a documented way to compute, for any given date range: Sport Match™ completion rate, results→profile click-through rate, profile→contact click-through rate, count of contacts/Leads generated, and a step-by-step drop-off count across the funnel.
- **FR-009**: The documented metric computations MUST be runnable directly against stored data by the product owner without requiring a new in-app screen or a third-party analytics tool.

### Key Entities

- **Funnel Event**: A single recorded occurrence of one of the 9 BR-027 funnel steps. Carries: which step it represents, when it happened, a visit-correlation identifier, and a small set of non-identifying contextual fields relevant to that step (e.g., which sport, which contact type) — never raw personal or precise-location data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 9 BR-027 funnel steps produce a queryable, durably stored event — verified by performing one full funnel walkthrough and finding exactly one event per step in storage.
- **SC-002**: 100% of a sample of 20 consecutive real user actions (across anonymous and logged-in visitors) result in a successfully stored event, measured by comparing actions taken against rows found in storage.
- **SC-003**: The product owner can determine the current week's Sport Match™ completion rate, both click-through rates, and total contacts generated within 5 minutes, using only the documented queries — with no new tooling built.
- **SC-004**: Zero user-facing errors or blocked actions are attributable to analytics recording, verified across the same full funnel walkthrough used for SC-001.

## Assumptions

- The existing `track()`/`setTracker()` pluggable mechanism (introduced in earlier milestones) is the right extension point; this feature swaps its default sink from console-only to a durable one and adds the two missing event types, rather than building a new tracking mechanism from scratch.
- "Durable storage" means a table in the project's existing Supabase database, per the owner's explicit decision — no third-party analytics service is introduced.
- The deliverable for computing metrics is a set of documented SQL queries run manually by the product owner in the Supabase SQL Editor — no dashboard screen, no new in-app admin surface, and no new access-control system are built as part of this feature.
- Visit correlation for anonymous (pre-login) visitors reuses the identifier approach already established for anonymous Sport Match™ sessions, rather than introducing a new identity scheme.
- User-level consent/opt-out controls for analytics collection are explicitly out of scope for this feature — a pre-existing, separately tracked gap (flagged during the prior milestone's security review), not something this milestone is responsible for closing.
- Retroactively attaching a now-known logged-in identity to a visitor's earlier anonymous events is out of scope, consistent with the same decision already made for anonymous match sessions in a prior milestone.
