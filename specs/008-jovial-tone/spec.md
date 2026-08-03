# Feature Specification: Match™ Jovial Tone Recalibration

**Feature Branch**: `008-jovial-tone`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Recalibrate Match™'s voice across the app to 'Nivel 2 — Jovial y directo' — the tone calibration the product owner already approved by comparing 3 intensity options against real app copy. docs/match-character.md and docs/microcopy.md are already rewritten with the new voice; this feature implements those already-approved strings across the app's hardcoded JSX, it does not create new copy."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every screen sounds like the same jovial guide (Priority: P1)

As a user moving through the app — from opening it, through Sport Match™, to seeing results, logging in, and confirming contact — I hear a consistent, warm, witty voice throughout, not a mix of the old plain tone on some screens and a new playful one on others.

**Why this priority**: this is the entire point of the feature — a tone recalibration that only lands on some screens reads as inconsistent and undermines the character rather than strengthening it. Partial rollout is worse than no rollout.

**Independent Test**: walk the full funnel (Welcome → Sport Match™ questions → matching transition → Results → Community profile contact → Login → Contact success) and confirm every Match™-voiced string matches `docs/microcopy.md`'s current text exactly, with no screen still showing the pre-recalibration copy.

**Acceptance Scenarios**:

1. **Given** a user opens the app, **When** the Welcome screen renders, **Then** it shows the recalibrated greeting exactly as documented in `docs/microcopy.md`, not the prior plain version.
2. **Given** a user progresses through each Sport Match™ question, **When** each screen renders, **Then** both the question title and the accompanying Match™ guide line match the recalibrated versions.
3. **Given** a user reaches the matching-in-progress transition, **When** it displays, **Then** its message matches the recalibrated loading copy.
4. **Given** a user views their results, **When** the results screen renders, **Then** its headline and the persistent "change answers" action match the recalibrated copy.
5. **Given** a user is asked to log in or reaches the contact-confirmation screen, **When** either screen renders, **Then** their copy matches the recalibrated versions.

---

### User Story 2 - The playful tone never lands on the user (Priority: P1)

As a user who hits an error, a dead end, or picks the "never practiced" option, I still feel respected and supported — the jovial tone shows up in how the app talks about the situation, never in a way that makes light of my choices or my problem.

**Why this priority**: equal priority to Story 1 because this is the failure mode that makes a tone change backfire — a joke landing on the wrong moment (an error, an empty result, a beginner's answer) does more damage to trust than a flat tone ever would. This is a guardrail on Story 1, not optional polish.

**Independent Test**: trigger every error state, the true-empty-catalog result, and a lead-save failure, and confirm each message stays light-touch and blame-free — never mocking, never implying the situation is the user's fault, and never joking about a real shortfall (an empty result, a failed save).

**Acceptance Scenarios**:

1. **Given** a network or login error occurs, **When** the error message displays, **Then** its tone stays light and reassuring without minimizing or joking about the user's situation.
2. **Given** the true-empty-catalog case (no organizations offer the selected sport), **When** its message displays, **Then** the copy remains straightforward and honest rather than jokey, per the product's own documented exception for this specific moment.
3. **Given** a Lead fails to save and a retry is offered, **When** that message displays, **Then** it reassures the user the failure isn't on them, without deflecting with humor.
4. **Given** any match explanation reason is shown, **When** it displays, **Then** its wording stays factual and literal, per the product's documented exception for match-reason text.

### Edge Cases

- What happens to strings that exist in the app but aren't yet documented in `docs/microcopy.md`'s recalibrated sections (if any are found during implementation)? They are rewritten in the same jovial register, consistent with the documented examples, and the newly-decided wording is added back to `docs/microcopy.md` so the doc stays the single source of truth — no string is left inconsistent with its neighbors.
- What happens to option labels a user selects from (sport, goal, level, budget, environment, day, time)? They are explicitly unchanged — these are factual category labels, not Match™'s spoken voice, and must stay quick to scan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every Match™-voiced string currently hardcoded in the app (Welcome, Sport Match™ question titles and guide lines, the matching-in-progress message, Results headline and persistent secondary action, Login, Contact success) MUST be updated to match `docs/microcopy.md`'s recalibrated text.
- **FR-002**: Error-state and failure-state messages (network, login, contact, Lead-save-failure) MUST remain light-touch and reassuring, and MUST NOT imply the error is the user's fault or joke about the failure itself.
- **FR-003**: The true-empty-catalog message and match-explanation "reason" text MUST remain factual and literal, per their documented exception — these are not rewritten into jokes.
- **FR-004**: Selectable option labels (sport, goal, level, budget, environment, day, time) MUST remain unchanged by this feature.
- **FR-005**: No string may imply judgment of a user's chosen level, goal, or any other answer.
- **FR-006**: This feature MUST NOT change matching/business logic, visual design, Match™'s documented behavioral rules (never pressures, never shames, never invents data, never gives medical advice, never claims a perfect result), or add any new screen, route, or UI element, except where Requirement FR-007 below explicitly allows one.
- **FR-007**: Whether Sport Match™ question helper text (documented per-question in `docs/microcopy.md` but not currently rendered anywhere in the app) is added as new UI in this feature, or explicitly deferred, MUST be a deliberate decision recorded during planning — not silently skipped or silently built.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the identified Match™-voiced strings across the full funnel match `docs/microcopy.md`'s recalibrated text when checked screen-by-screen.
- **SC-002**: Zero error, empty-result, or failure-state messages read as mocking, dismissive, or blaming the user, verified by triggering every such state and reviewing its copy.
- **SC-003**: A user completing the full funnel start-to-finish perceives one consistent voice throughout — no screen reads as noticeably flatter or more formal than its neighbors.
- **SC-004**: Zero regressions to any existing functional behavior — the full funnel (including the `006-no-empty-results` and `004`/`005` flows) completes exactly as before this feature, since only copy changed.

## Assumptions

- `docs/match-character.md` and `docs/microcopy.md` are the source of truth for the exact recalibrated wording — this feature implements what they already specify, it does not invent new copy during implementation except for any gap found per the Edge Cases note above, which gets added back to the docs.
- No new dependency, copy-management library, or i18n system is introduced — strings continue to live inline in their respective components, consistent with the app's existing approach, unless planning finds a concrete reason specific to this change that requires otherwise.
- Match™'s documented behavioral rules and the product's trust/safety posture are unaffected — this is a tone change within existing boundaries, not a boundary change.
