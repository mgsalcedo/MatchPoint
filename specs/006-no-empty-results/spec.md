# Feature Specification: No Empty Sport Match™ Results

**Feature Branch**: `006-no-empty-results`

**Created**: 2026-08-02

**Status**: Draft

**Input**: User description: "Fix BR-015 violation: Sport Match™ results must never be a dead end. `calculateMatches()` silently drops any organization that produces zero human-readable reasons, and `reasonsFor()` never produces a reason from the sport-match dimension even though it's scored — so an organization offering exactly the requested sport can vanish from results entirely if every other dimension scores weakly. When this happens for the whole catalog, the Results screen shows a bare dead-end with no organizations and only a 'try again' button, which BR-015 explicitly prohibits."

## Clarifications

### Session 2026-08-02

- Q: Should a "change your answers" secondary action remain visible on the Results screen once real results are shown (not just in the true dead-end case)? → A: Yes, always visible regardless of match quality — a persistent secondary action, not conditional on result strength.
- Q: For the true-empty-catalog case (User Story 2), what action should the message offer? → A: "Choose a different sport" as the primary action (return to the sport question specifically, not restart the whole questionnaire) — the only action that can actually resolve this specific case, since adjusting schedule/district/budget doesn't help when the chosen sport itself isn't in the catalog at all.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A weak match is still a match, not nothing (Priority: P1)

As a user who completes Sport Match™ with an uncommon combination of answers (e.g. an unusual schedule, a niche budget, or an environment few organizations tag), I still see at least one organization that offers my sport, with an honest explanation of why it's the closest option — instead of a dead end telling me nothing was found.

**Why this priority**: this is the literal violation being fixed — the single scenario BR-015 exists to prevent, and the one place today's behavior visibly contradicts an already-documented rule.

**Independent Test**: pick an answer combination known to produce zero results today (e.g. a schedule/environment/budget combination that scores weakly across the whole catalog for a given sport) and confirm the Results screen shows at least one organization offering that sport, each with a visible reason and an honest match label, rather than the current "no match, try again" screen.

**Acceptance Scenarios**:

1. **Given** a user completes Sport Match™ with answers that score weakly against every organization offering their chosen sport on every dimension except the sport itself, **When** results are calculated, **Then** at least the closest-scoring organizations offering that sport are shown, ranked by score, each with at least one true reason (which may simply be that it offers the requested sport).
2. **Given** an organization does not offer the sport the user selected at all, **When** results are calculated, **Then** that organization is still excluded — "closest available" never means "wrong sport."
3. **Given** an organization's true, honest score is low (e.g. below today's "Weak Match" threshold), **When** it is shown as a closest-available result, **Then** its label and reasons reflect that honestly — no score inflation, no invented reasons, no relabeling a weak match as a strong one.

---

### User Story 2 - A genuinely empty catalog says so plainly (Priority: P2)

As a user in an environment where no organizations exist at all for my chosen sport (e.g. a fresh or misconfigured environment), I see a message that plainly explains there's nothing available yet — not a message that implies my answers were the problem.

**Why this priority**: a real, distinct edge case from "weak fits exist" — lower priority because it's rare in a properly seeded environment, but still needs its own honest message rather than reusing the "try different answers" copy for a situation changing answers can't fix.

**Independent Test**: with zero organizations offering the selected sport in the catalog, confirm the resulting screen's message is distinguishable from the "your answers produced only weak matches" case and doesn't suggest retrying will help when the catalog itself has nothing to offer.

**Acceptance Scenarios**:

1. **Given** the organization catalog has zero organizations offering the user's selected sport, **When** results are calculated, **Then** the user sees a message that plainly reflects "nothing available for this sport yet," distinct from a "retry with different answers" message, with "choose a different sport" as its primary action (returning to the sport question specifically, not restarting the whole questionnaire).
2. **Given** the organization catalog has at least one organization offering the user's selected sport, **When** results are calculated, **Then** User Story 1 applies — the true-empty message from this story never appears.

### Edge Cases

- What happens when every organization offering the requested sport has an identical, weak score? All are still shown (up to the existing 5-result cap), ranked in a stable, deterministic order.
- What happens when the "closest available" set includes only very low-scoring organizations? They're shown with their honest low label (e.g. "Weak Match") and whatever true reasons apply — never upgraded to look stronger than they are.
- What happens when an organization has no reasons at all beyond offering the sport? It's still shown, with the sport itself as its one honest reason — this is exactly the case this fix exists to stop dropping.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT exclude an organization from results solely because it produced zero reasons on dimensions other than sport — an organization offering the requested sport is always eligible to appear.
- **FR-002**: System MUST continue to exclude any organization that does not offer the user's requested sport, regardless of how it scores on other dimensions.
- **FR-003**: System MUST be able to present the fact that an organization offers the requested sport as a valid, honest reason when few or no other reasons apply.
- **FR-004**: System MUST show results ranked by true, unmodified score — closest-available organizations are never re-scored or re-labeled to appear stronger than their honest fit.
- **FR-005**: System MUST distinguish, in what the user sees, between "your answers produced only weak matches" (organizations exist, scored low) and "no organization offers this sport at all" (the catalog itself has nothing) — these are different situations and must not share the same message implying the user's answers are at fault when the catalog is actually empty.
- **FR-006**: System MUST NOT fabricate data to satisfy this requirement — no invented reasons, no invented organizations, no altered scores (per the project's existing no-fabrication rule).
- **FR-007**: The existing cap on the number of results shown remains unchanged by this fix.
- **FR-008**: The Results screen MUST always offer a visible "change your answers" action, regardless of match quality — not conditional on results being weak (Clarifications, Session 2026-08-02).
- **FR-009**: The true-empty-catalog message (User Story 2) MUST offer "choose a different sport" as its primary action, returning the user to the sport question specifically rather than restarting the full questionnaire (Clarifications, Session 2026-08-02).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any answer combination where at least one organization offers the selected sport, the Results screen shows at least one organization — 0% of such cases show a dead-end "no results" screen.
- **SC-002**: 100% of organizations shown in a "closest available" result set genuinely offer the user's requested sport.
- **SC-003**: 100% of reasons shown for any result are true statements about that organization — none are invented.
- **SC-004**: A user can distinguish, from the screen's own wording alone, whether they're seeing a true "nothing offers this sport yet" state versus "these are the closest matches to your answers."

## Assumptions

- "Closest available" is still bounded by sport: an organization not offering the requested sport is never shown, regardless of how well it might otherwise fit — recommending the wrong sport is not a legitimate way to avoid an empty screen.
- The existing 5-result cap, score calculation, and match-label thresholds are not being redesigned here — only the exclusion rule that currently drops legitimately-scored organizations because they happened to produce zero copy-worthy reasons.
- A true empty catalog (zero organizations for the requested sport) remains a valid, distinct state to show the user — this feature does not require inventing an organization to fill that case, only requires that its message be honest and not conflated with "your answers were too narrow."
