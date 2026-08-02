# Feature Specification: Sport Match™ Engine (real sessions & matching)

**Feature Branch**: `002-sport-match-engine`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Combine Milestone 2's remaining backend work with Milestone 3 (Matching engine) from docs/roadmap.md into one feature, since they're technically coupled: creating a real match_session row requires the matching engine to exist, and the matching engine's output is what gets persisted. Objective: replace the Sport Match™ flow's current mock-data-only behavior with the real thing — user completes the already-built questionnaire UI, a match_session is created in Supabase (anonymous, no login per ADR-0003), matching runs against the real seeded organizations (via the getOrganizations() data-access layer built in 001-data-foundation, replacing the mock organizations list matching.ts currently reads), results are scored/ranked/persisted to match_results, and the sport_match_completed analytics event fires (BR-027). Problem: the questionnaire, matching logic, and results screen are all already built as a navigable UI shell, but they operate entirely on mock client-side data with zero persistence and zero analytics — none of it proves the PMV's core funnel (contacts generated) yet. Known technical constraint to resolve in the spec/plan: migration 0007_rls_policies.sql currently leaves match_sessions and match_results with RLS enabled and zero policies (deny-all, including for the anon role) — this feature needs new RLS policies permitting anonymous users to create their own match_session/match_results rows, consistent with ADR-0003 (no login before value). Explicitly out of scope: auth gate and Lead creation (Milestone 5), any rework of the organization profile page beyond what's needed to show real orgs in results (Milestone 4), and any UI redesign — the existing Sport Match™ UI/UX stays as-is, only its data source and persistence change."

## Clarifications

### Session 2026-07-28

- Q: Does the "Sport Match™ completed" event (FR-007) count only successfully-saved sessions, or every completed questionnaire regardless of save outcome? → A: Only successfully-saved sessions (the completion-rate metric also reflects data-capture quality, not just user behavior).
- Q: Does the "no strong match" screen count as a results view (FR-008), or should it be measured separately? → A: Measured separately, via a distinct event — undercounting the no-match case would hide how often the real catalog fails to produce a match, which is a direct, actionable signal for whether more organizations need to be sourced.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get real, trustworthy match results (Priority: P1)

A user completes the Sport Match™ questionnaire and receives ranked community recommendations generated from real, currently-active Lima/Callao sports organizations — not a fixed demo dataset — so the results are something they could actually act on.

**Why this priority**: This is the entire point of the PMV. Everything built so far (questionnaire UI, matching UI, real organization data) is worthless to validate if the two are never connected. Without this, MatchPoint cannot generate a single real lead.

**Independent Test**: Complete the questionnaire with answers that should reasonably match at least one real seeded organization (e.g., running in San Isidro); confirm the results screen shows that organization, ranked, with a score/label/reasons, and that a corresponding session record now exists in the database.

**Acceptance Scenarios**:

1. **Given** a user with no account, **When** they complete all Sport Match™ questions, **Then** a match session is created without requiring login, and matching runs against the organizations currently discoverable in the catalog (per the eligibility rules already enforced for the public organization catalog).
2. **Given** matching has completed, **When** the results screen renders, **Then** it shows up to 5 ranked organizations with the same visual presentation as today (score/label/reasons/CTA), sourced from real data.
3. **Given** a completed match, **When** the session finishes, **Then** the ranked results are saved so they exist independent of the browser tab that generated them.

---

### User Story 2 - Graceful "no match yet" for real gaps (Priority: P2)

A user whose specific combination of answers doesn't have a strong real match sees a clear, honest "no results" state instead of a broken or empty screen — because the real catalog, unlike a curated mock, will sometimes genuinely have gaps.

**Why this priority**: The mock dataset was hand-picked to always have "good enough" answers; the real 9-organization catalog will not cover every combination. This must degrade honestly, not silently (BR-016 spirit: don't hide the truth, don't fabricate a match that isn't there).

**Independent Test**: Complete the questionnaire with a combination unlikely to match any real seeded organization (e.g., a sport/district pairing far from all seeded venues); confirm the existing "no strong results" screen appears rather than an empty or broken results list.

**Acceptance Scenarios**:

1. **Given** no real organization clears the minimum relevance bar for a user's answers, **When** results are computed, **Then** the existing no-results experience is shown.
2. **Given** the no-results state is shown, **When** it renders, **Then** no partial or zero-score result cards are displayed instead.

---

### User Story 3 - Funnel is measurable (Priority: P3)

The product team can see how many users complete Sport Match™ and reach the results screen, so the PMV's validation targets (in `docs/roadmap.md`'s "PMV launch" section) can actually be measured.

**Why this priority**: Lower priority than making the match itself real, but without it the team is flying blind on whether the PMV funnel works at all — and every subsequent milestone (auth, contact, leads) depends on the same tracking mechanism existing.

**Independent Test**: Complete the questionnaire end to end; confirm a "match completed" event and a "results viewed" event are each recorded exactly once for that session.

**Acceptance Scenarios**:

1. **Given** a user completes the questionnaire, **When** the match session is successfully created, **Then** a completion event is recorded for that session.
2. **Given** the results screen renders with a valid session's results, **When** the page loads, **Then** a results-viewed event is recorded once (not once per re-render).

---

### Edge Cases

- What happens when an organization's schedule has no confirmed level or end time (both are legitimately optional, per `docs/data-model.md`'s no-fabrication rule)? Matching must still score that organization sensibly — never crash, never silently produce a nonsensical (e.g. `NaN`) score.
- What happens if saving the session/results fails (e.g. a transient network error) after matching has already been computed in the user's browser? The user must still see their results — persistence is a side effect, not a precondition, of showing value.
- What happens if a user abandons the questionnaire partway through? No session should be created — only a genuinely completed questionnaire produces a session (matches today's behavior).
- What happens if two different anonymous users, at the same time, complete Sport Match™? Each must get their own independent session and results, with no mixing or overwriting.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST create a match session record when a user completes the Sport Match™ questionnaire, without requiring login, storing the answers that were captured.
- **FR-002**: The system MUST compute match results using the real, currently-discoverable organization catalog — the same eligibility rules already enforced for public organization discovery (active, not suspended/archived/rejected, meets the minimum published-data bar) — instead of a fixed mock dataset.
- **FR-003**: The system MUST persist the ranked results (up to 5 organizations, each with its score, match label, and reasons) for a completed session.
- **FR-004**: Matching MUST produce a valid, sensible score for every real organization even when that organization's schedule data has no confirmed skill level or end time — it MUST NOT crash or silently produce an invalid score in that case.
- **FR-005**: The system MUST show the existing "no strong results" experience when no real organization clears the relevance bar for a user's answers, and MUST NOT show partial or invalid result cards instead.
- **FR-006**: An anonymous user MUST be able to create their own match session and its results; the system MUST NOT allow anyone to read another session's stored answers or results.
- **FR-007**: The system MUST record a "Sport Match™ completed" event when a session is successfully created.
- **FR-008**: The system MUST record a "results viewed" event when the results screen renders with matched results, exactly once per view (not once per re-render). When the results screen instead shows the "no strong match" state, the system MUST record a separate, distinctly-named event instead, also exactly once per view.
- **FR-009**: If saving the session or results fails, the user MUST still see the results that were already computed — a save failure must not block or blank the results screen.
- **FR-010**: The existing Sport Match™ questionnaire, loading, results, and no-results screens MUST look and behave the same as today — only the data source (real vs. mock) and the addition of persistence/tracking change.

### Key Entities *(include if feature involves data)*

- **Match Session**: One completed run of the Sport Match™ questionnaire by a user (anonymous or logged in later). Holds the answers that were captured and is the anchor that results and, eventually, leads (a later milestone) attach to.
- **Match Result**: One organization's ranked outcome within a specific match session — its score, match label, and the reasons it was recommended. Up to 5 per session.
- **Organization** *(existing, from 001-data-foundation)*: The real, discoverable community/club/gym being matched against — no change to this entity here, only how it's consumed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user completing Sport Match™ sees results generated from the organizations that are actually live in the catalog at that moment, not a fixed demo set.
- **SC-002**: 100% of completed Sport Match™ questionnaires produce exactly one corresponding stored session record.
- **SC-003**: The "no results" experience displays correctly (zero broken/blank screens) for answer combinations that have no strong real match.
- **SC-004**: Every completed session emits exactly one completion event and one results-viewed event, enabling accurate funnel counting per the PMV's validation targets.
- **SC-005**: One anonymous user's session data is never readable by a different anonymous session or user.

## Assumptions

- A lightweight, pluggable event-tracking mechanism is introduced as part of this feature (the project has none yet); wiring a specific third-party analytics provider is out of scope — a simple, swappable tracking call is sufficient for the PMV.
- "Anonymous" sessions are identified the way `docs/data-model.md` already models them (a session not linked to a logged-in user); no additional device/browser fingerprinting is introduced.
- Refreshing or revisiting the results page does not need to "resume" a prior session for this milestone — each completed questionnaire run produces one new session, matching today's mock behavior.
- The exact database-level access rule that lets an anonymous user create (and only create) their own session/results — without exposing other users' data — is a technical decision for the planning phase, not this spec; it must be consistent with the no-login-before-value principle (`docs/adrs/0003-no-login-before-value.md`).
- This feature does not change the Sport Match™ questionnaire's questions, the matching algorithm's scoring logic/weights (`docs/matching-engine.md`), or the results screen's visual design — only where the data comes from and what gets remembered.
