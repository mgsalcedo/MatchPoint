# Research: No Empty Sport Match™ Results

Phase 0 output for `/speckit-plan`. Consolidates the `backend-architect` agent's findings (`.claude/doc/no-empty-results/backend.md`).

## R1 — A more serious, previously-undetected bug: wrong-sport organizations can already leak into results today

Removing only `calculateMatches()`'s trailing `.filter((r) => r.reasons.length > 0)` would not be a complete fix — it would make an existing, undetected bug worse. `reasonsFor()` never reads `fits.sport`, and nothing else in `calculateMatches()` hard-excludes on it (`sportFit()` only contributes 20% to the weighted score). An organization offering a *different* sport than requested can already appear in results today if it scores well enough on location/schedule/budget to produce reasons on its own — the only thing coincidentally keeping most wrong-sport orgs out today is that they also happen to score badly on everything else.

**Decision**: the fix requires two separate changes, not one — a new, explicit `organizations.filter(org => sportFit(answers, org) > 0)` gate applied before scoring (closes this bug, satisfies FR-002), plus removal of the `reasons.length > 0` filter (closes the originally-reported bug, satisfies FR-001).

## R2 — `results.length === 0` is proven sufficient to distinguish the two spec states; no new field needed

Algebraic proof (not just an assertion): `eligible = organizations.filter(sportFit > 0)`; `.map()` preserves length; `.sort().slice(0, 5)` can only shrink a non-empty array to at most 5, never to 0. Therefore `calculateMatches(...).length === 0` if and only if zero organizations in the catalog offer the requested sport — exactly User Story 2's case, and only that case, for a successfully-fetched catalog.

**Decision**: no return-type change to `calculateMatches`, no new context field. `Results.tsx`'s existing `results.length === 0` branch is, post-fix, precisely the true-empty-catalog branch — it needs new copy and a new action, not a new signal.

## R3 — Known, accepted exception: catalog-fetch failure still collapses to the same signal (owner-confirmed, left as-is)

`MatchSessionContext.tsx`'s `finalizeMatch()` already catches `getOrganizations()` failures and sets `computed = []` (pre-existing behavior, not introduced by this feature). Post-fix, this means a rare network/Supabase failure will show the new "no communities for this sport yet" message instead of a generic error — technically inaccurate (the catalog might be fully populated; it just couldn't be read), but the underlying conflation predates this feature and distinguishing "fetch failed" from "sport not covered" was not part of what was specified or clarified.

**Decision (owner-confirmed)**: leave as-is. Not solved by this feature. A `catalogLoadFailed`-style flag remains a valid, small fast-follow if this proves disruptive in practice, but is explicit scope creep against the clarified spec today.

## R4 — `reasonsFor()`'s sport fallback is additive-only, guarded, and fallback-only (not always-on)

**Decision**: push `"Ofrece {sport}."` into the reasons list only when `reasons.length === 0` at that point (i.e., every other dimension produced nothing) and `fits.sport >= 1` (defensive — always true post-R1's filter, but protects any future caller that reuses `reasonsFor` on an unfiltered list from fabricating a sport reason for an org that doesn't actually offer it, which would violate BR-016).

**Rationale**: an always-on version would change the reasons shown for every existing result, not just previously-empty ones — the spec's own wording ("when few or no other reasons apply") and the no-regression test requirement both point to fallback-only.

## R5 — Two different actions, two different mechanisms, both required by their respective FRs

- **FR-008** ("change your answers," always visible): full restart — `resetMatch()` + `navigate("/match")`, reusing the exact pattern already used by the pre-fix empty-state branch. Any answer might be the reason results feel weak, so a full restart is the correct scope.
- **FR-009** ("choose a different sport," true-empty-catalog primary action): a narrower, sport-only jump — does **not** call `resetMatch()`. `answers` (goal, district, days, etc.) stay in `MatchSessionContext`; only the sport question is revisited. Only the sport is provably the blocker in that specific state, so resetting everything else would lose real, still-valid context for no reason.

**Mechanism (FR-009)**: `SportMatch.tsx` reads `location.state.startAt === "sport"` (mirrors `OrganizationProfile.tsx`'s existing `resultRank` pattern) to initialize `step` at the sport question's index (`QUESTIONS.findIndex(q => q.key === "sport")`, derived not hardcoded) instead of `0`. This is a single literal, not a general "jump to any question" feature — deliberately not over-engineered relative to what FR-009 asks for.

## R6 — Test file already exists; extend, don't create; one existing test needs refocusing

`app/src/lib/matching.test.ts` already has 3 describe blocks (from `002-sport-match-engine`). Its `"no strong match"` block's fixture (org offers `natacion`, user asked `triatlon`) is actually exercising wrong-sport-exclusion (R1), not "weak match across the board" — its current assertion is vacuously true both before and after the fix. **Decision**: rename this block to reflect what it actually tests (FR-002, wrong-sport exclusion) and strengthen its assertion to `results.length === 0` explicitly, so a future regression in the sport filter would actually be caught. New describe blocks added for: sport eligibility gate (2 tests), zero-reasons-no-longer-excludes (2 tests), true-empty-catalog signal (2 tests), 5-result cap (1 test, previously uncovered). All written failing-first against pre-fix code, per constitution Principle III.

## R7 — No changes needed to persistence, analytics, or the data model

`sessionMappers.ts`/`matchSessions.ts` already just serialize whatever `MatchResult[]` they're given — `rank` derives from array index, `reasons` stores as unconstrained `jsonb`. `analytics.ts`'s `no_match_viewed`/`results_viewed` events need no changes; their semantics *narrow correctly* for free post-fix (`no_match_viewed` now fires only for the true-empty-catalog case; `results_viewed` now correctly fires for weak-but-real matches that previously hit the dead end). No entity, column, or migration changes — confirmed against `docs/data-model.md`/`docs/database-schema.md`.

## R8 — Doc-sync is not optional cleanup; 4 docs currently describe the pre-fix model and would actively mislead if left alone

`docs/matching-engine.md` (sport-as-hard-gate was previously unstated/unimplemented; "No-match case" section conflates the two states this feature splits apart), `docs/microcopy.md` (empty-state copy references now-inapplicable actions like "expand district"), `docs/ux-flows.md` (Flow 3's no-results trigger/actions need narrowing to match FR-009's single clarified action), `docs/component-library.md` (`EmptyMatchState`'s documented props `onExpandDistrict`/`onChangeSchedule` no longer correspond to any real state post-fix — recommend narrowing to `onChooseAnotherSport` only, flagging pre-existing doc/code drift since `Results.tsx` doesn't actually implement this documented component shape today, which is not this fix's job to resolve). `docs/api-contracts.md`'s `POST /api/match-sessions` Rules line never stated the sport-exclusion rule at all — recommended (not required) addition, since this omission is arguably why the bug shipped unnoticed.
