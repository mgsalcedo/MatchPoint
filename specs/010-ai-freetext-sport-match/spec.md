# Feature Specification: AI Free-Text Entry for Sport Match™

**Feature Branch**: `010-ai-freetext-sport-match`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Insert a real, working Claude model into MatchPoint's Sport Match™ so a user can describe what they're looking for in their own words instead of tapping through the questionnaire — the extraction feeds the existing, unchanged matching engine (docs/matching-engine.md's already-documented 'Future AI layer'), not a replacement for it. Approved: moving off pure client+Supabase for the first time; button placement follows existing design principles; testing budget capped at $5 total; use Claude Haiku for the initial test."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describe it in your own words instead of tapping through 8 questions (Priority: P1)

As a user starting Sport Match™, I can choose to type a sentence describing what I'm looking for (e.g., "Trabajo hasta las 7, vivo en Magdalena, quiero preparar mi primera media maratón y conocer gente") instead of answering each question by tapping, and still reach the same results the tap-through questionnaire would have produced.

**Why this priority**: this is the entire feature — without it there's nothing to test or ship.

**Independent Test**: from the first Sport Match™ question, choose the free-text option, submit a sentence that clearly states all 8 fields, and confirm the results screen shows the same kind of ranked, reasoned results the tap-through flow produces — with no question screens shown in between.

**Acceptance Scenarios**:

1. **Given** a user is on the first Sport Match™ question, **When** they choose the free-text option, **Then** they see a single text input instead of tap-through questions.
2. **Given** a submitted sentence that states all 8 fields clearly, **When** extraction completes, **Then** the user goes straight to the matching/results flow, same as completing the tap-through questionnaire.
3. **Given** the free-text option was never chosen, **When** a user completes Sport Match™, **Then** the experience is byte-for-byte the same as before this feature (tap-through remains the default, unchanged path).

---

### User Story 2 - Missing details fall back to the normal questions, never a guess (Priority: P1)

As a user who only mentions some details in my sentence, I get asked the remaining questions through the normal tap-through screens — the app never assumes an answer I didn't give.

**Why this priority**: equal priority to Story 1 — this is what keeps the feature honest (BR-016, never fabricate) and is the difference between a real feature and a broken/misleading one.

**Independent Test**: submit a sentence that only mentions 3–4 fields (e.g., sport and district only) and confirm the app lands on the first tap-through question for a field that wasn't mentioned, with the mentioned fields already filled in — not re-asked.

**Acceptance Scenarios**:

1. **Given** a sentence that omits the budget, **When** extraction completes, **Then** the user is routed to the budget question (not asked to restate what they already said), and budget is not silently assumed.
2. **Given** a sentence where "no sé mi presupuesto" is explicitly stated, **When** extraction completes, **Then** budget is set to the existing "no estoy seguro" option — distinct from budget simply not being mentioned at all.
3. **Given** the extraction call fails or times out, **When** that happens, **Then** the user is dropped into the normal tap-through questionnaire from the first question, with a light Match™-voiced explanation, never stuck or shown a raw error.

---

### User Story 3 - The organization's cost exposure stays bounded (Priority: P2)

As the product owner, this feature cannot run away with API spend while it's being tested and demoed.

**Why this priority**: not user-facing, but a hard operational requirement before this ships anywhere reachable by anyone other than the product owner.

**Independent Test**: confirm a hard spend limit is configured on the OpenRouter API key itself, and confirm the feature stops accepting new free-text submissions gracefully (falling back to the tap-through questionnaire) if that limit is reached, rather than failing in a way that looks broken.

**Acceptance Scenarios**:

1. **Given** the OpenRouter API key used by this feature, **When** checked in the OpenRouter dashboard, **Then** it has a hard credit/spend limit configured at $5.
2. **Given** the spend limit has been reached, **When** a user tries the free-text option, **Then** they fall back to the tap-through questionnaire with a light explanation, not an error page.

### Edge Cases

- What happens if a user pastes something unrelated to sports (e.g., a random paragraph)? All 8 fields extract as "not mentioned," routing to the full tap-through questionnaire from the first question.
- What happens if a user's sentence mentions something outside the 8 fields (health details, injury history, anything sensitive)? Only the 8 defined fields are ever extracted; nothing else from the sentence is stored, logged, or reaches any table (BR-028).
- What happens if the extracted district doesn't match one of MatchPoint's known districts (e.g., a misspelling or a district outside Lima/Callao)? Treated as not-extracted for that field, routed to the district question rather than guessed or auto-corrected.
- What happens on a second free-text attempt after a fallback? Previously-extracted fields are not lost — the user resumes from where the tap-through flow left off, consistent with the existing mid-questionnaire navigation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to opt into a free-text entry mode from the start of Sport Match™, as a secondary, clearly-optional path — the tap-through questionnaire remains the default, unchanged primary path (Principle II, Sport Match™ First).
- **FR-002**: The free-text option MUST be placed at the top of the first Sport Match™ question screen as a quiet secondary link (e.g., "Prefiero describirlo con mis palabras"), not on the Welcome screen — `docs/ux-flows.md` Screen 1 explicitly restricts Welcome to a single primary CTA with no secondary CTAs in the PMV.
- **FR-003**: Submitted free text MUST be sent to a server-side extraction step — the OpenRouter API key MUST NOT be embedded in client-side code at any point.
- **FR-004**: The extraction MUST only ever populate the 8 existing Sport Match™ fields (goal, sport, district, days, time, level, budget, environment) — no other information from the free text may be extracted, stored, or logged.
- **FR-005**: Any field not clearly stated in the free text MUST remain unset (not guessed) and MUST route the user to that question in the normal tap-through flow; already-extracted fields MUST be pre-filled, not re-asked.
- **FR-006**: The system MUST distinguish "the user said they don't know their budget" (a valid existing answer option) from "budget was not mentioned at all" (unset, needs asking) — collapsing these into the same outcome would fabricate a claim the user didn't make.
- **FR-007**: A candidate district value MUST be validated against MatchPoint's existing known-district list before being accepted; anything that doesn't match is treated as unset, never auto-corrected or guessed.
- **FR-008**: If the extraction call fails, times out, or returns a low-confidence/invalid result, the user MUST fall back to the normal tap-through questionnaire from the first question, with a brief in-voice explanation — never a raw error, never a stuck screen.
- **FR-009**: The existing matching/ranking engine MUST NOT change — extraction only ever produces the same structured answer shape the tap-through questionnaire already produces, consumed identically.
- **FR-010**: The OpenRouter API key used for extraction MUST have a hard usage/spend limit of $5 configured at the provider level, for the initial testing period.
- **FR-011**: If the configured spend limit is reached, new free-text submissions MUST fail gracefully into the tap-through questionnaire rather than erroring visibly to the user.
- **FR-012**: The initial model used for extraction MUST be Claude Haiku 4.5, called via OpenRouter, for this testing period.

### Key Entities

- No new persisted entity. `SportMatchAnswers` (existing, see `docs/data-model.md`) is the target shape extraction populates — unchanged. The submitted free-text sentence itself is transient (used only within the extraction request/response) and is never persisted to any table.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user who states all 8 fields clearly in free text reaches results without seeing a single tap-through question screen.
- **SC-002**: A user who states only some fields is routed only to the questions for the fields they didn't mention — never re-asked something they already stated, never given an unstated answer.
- **SC-003**: 0 pieces of information outside the 8 defined fields are ever stored or logged from a free-text submission.
- **SC-004**: Total spend on the extraction feature during the testing period does not exceed $5, enforced at the provider level, not just by application logic.
- **SC-005**: The existing tap-through-only funnel (a user who never touches the free-text option) shows zero behavioral change from before this feature.

## Assumptions

- Real Peruvian-Spanish phrasing (including colloquialisms and district nicknames) is what the feature is evaluated against; a small accuracy check against realistic sentences happens during implementation, not as a separate gate before starting.
- This is a first, bounded test of the capability ($5 budget, Haiku model) — a decision on broader rollout, a higher spend limit, or a larger model is explicitly out of scope for this feature and made later based on what this test shows.
- Rate-limiting beyond the provider-level spend cap (e.g., per-user or per-IP throttling) is not required for this initial $5-bounded test, since the spend limit itself is the primary backstop; revisit if this moves toward a wider release.
- Supabase Edge Functions is the server-side execution surface (the only backend compute already available in this stack) — this is the first feature to introduce server-side compute to MatchPoint.
