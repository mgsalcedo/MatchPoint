# Tasks: AI Free-Text Entry for Sport Match™

**Input**: Design documents from `/specs/010-ai-freetext-sport-match/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/extract-match-answers.md, quickstart.md

**Tests**: included and REQUIRED for the new extraction/routing logic — Constitution Principle III treats this as business logic (it gates whether incomplete/fabricated data can reach the matching engine), not optional UI code. `matching.ts` itself needs no new tests (untouched). No test calls the real OpenRouter API — the Edge Function's OpenRouter call is mocked/stubbed in every automated test.

**Manual, owner-only setup** (OpenRouter $5 credit limit, `supabase secrets set OPENROUTER_API_KEY=...`, `supabase functions deploy`) lives in `quickstart.md`, not repeated here as code tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to spec.md's user stories (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Scaffold the new Edge Function directory — first of its kind in this repo.

- [X] T001 Create `supabase/functions/extract-match-answers/index.ts` with a minimal stub handler (parses `freeText` from the request body, returns a hardcoded `{ extracted: {}, missing: [...], ok: false }`) so the deploy/invoke path can be verified end-to-end before real logic is added.
- [X] T002 [P] Create `app/src/lib/data/matchExtraction.ts` with the `ExtractionResult` type and an `extractMatchAnswers()` function signature (no implementation yet), mirroring the isolation pattern of `app/src/lib/data/matchSessions.ts`.

**Checkpoint**: `supabase functions serve` can invoke the stub locally and get a well-typed empty response.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared contract and plumbing every user story depends on.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [X] T003 Define the extraction contract types shared conceptually between client and Edge Function — `ExtractionResult { extracted: Partial<SportMatchAnswers>; missing: (keyof SportMatchAnswers)[]; ok: boolean }` in `app/src/lib/data/matchExtraction.ts`, matching `contracts/extract-match-answers.md` exactly.
- [X] T004 [P] Implement the raw OpenRouter call in `supabase/functions/extract-match-answers/index.ts`: `fetch("https://openrouter.ai/api/v1/chat/completions")` with `Authorization: Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`, model `anthropic/claude-haiku-4.5`, and a `stop_reason`/completion check per research.md R2 — no field-extraction logic yet, just prove the round trip works and errors are caught, not thrown.
- [X] T005 [P] Implement `extractMatchAnswers(freeText)` in `app/src/lib/data/matchExtraction.ts` to call `supabase.functions.invoke("extract-match-answers", { body: { freeText } })`, never throwing — any invocation error resolves to `{ extracted: {}, missing: [...all 8 keys], ok: false }` per the contract.

**Checkpoint**: client can call the Edge Function and get a typed, never-throwing result — ready for story-specific logic.

---

## Phase 3: User Story 1 - Full extraction reaches results directly (Priority: P1) 🎯 MVP

**Goal**: A user who states all 8 fields in free text skips every tap-through question and lands on results.

**Independent Test**: choose free text, submit a sentence stating all 8 fields, confirm no question screens appear before results.

### Tests for User Story 1 (write first, confirm they fail before implementing)

- [X] T006 [P] [US1] Fixture test in `app/src/lib/data/matchExtraction.test.ts`: given a mocked full-field `ExtractionResult` (`ok: true`, all 8 keys present, `missing: []`), the routing helper decides "go straight to `finalizeMatch()`."
- [X] T007 [P] [US1] ~~Fixture test in `supabase/functions/extract-match-answers/index.test.ts` (Deno test)~~ **Scope adjustment**: Deno's test runner isn't available in this environment. Verified instead via a live `curl` call against the deployed function with a full-field sentence — confirmed `{ extracted: <7-8 fields>, missing: [...], ok: true }`. No automated Deno test file exists; this is a real gap if Deno tooling becomes available later.

### Implementation for User Story 1

- [X] T008 [US1] Build the structured-output JSON schema (all 8 `SportMatchAnswers` fields, nullable, `budget` allowing `"no_seguro"` as a distinct literal) and the extraction prompt in `supabase/functions/extract-match-answers/index.ts`, sent as `response_format`/tool-forced JSON per research.md R2.
- [X] T009 [US1] Add the free-text toggle ("Prefiero describirlo con mis palabras") and textarea UI at the top of the first question in `app/src/pages/SportMatch.tsx`, per FR-002 (not on Welcome — `docs/ux-flows.md` Screen 1's single-CTA rule stays untouched).
- [X] T010 [US1] Wire the submit handler in `app/src/pages/SportMatch.tsx`: call `extractMatchAnswers()`, and on `ok: true` with `missing: []`, call `updateAnswers(extracted)` then `finalizeMatch()` directly, reusing the existing "Estoy cruzando tu objetivo..." loading screen.
- [X] T011 [US1] Verify (per quickstart.md's "Anonymous callability" and "Full extraction" checks) that the Edge Function is reachable and callable without a login session.

**Checkpoint**: User Story 1 fully functional — demoable independently of US2/US3.

---

## Phase 4: User Story 2 - Missing details fall back, nothing is guessed (Priority: P1)

**Goal**: Partial or failed extraction routes to the normal questionnaire for whatever wasn't captured — never a fabricated answer (BR-016).

**Independent Test**: submit a sentence with only 3–4 fields; confirm the app lands on the first genuinely-missing question with the stated fields pre-filled, not re-asked.

### Tests for User Story 2 (write first, confirm they fail before implementing)

- [X] T012 [P] [US2] Fixture test in `app/src/lib/data/matchExtraction.test.ts`: a partial `ExtractionResult` (some fields `missing`) routes to the first missing field in questionnaire order (`goal → sport → district → days → time → level → budget → environment`), with already-extracted fields merged via `updateAnswers()`, not re-asked.
- [X] T013 [P] [US2] Fixture test in `app/src/lib/data/matchExtraction.test.ts`: a sentence implying "I don't know my budget" maps to `budget: "no_seguro"` (present, not missing); a sentence never mentioning money maps to `budget` in `missing`. These must produce different `ExtractionResult`s.
- [X] T014 [P] [US2] ~~Fixture test~~ **Scope adjustment** (same as T007): verified live via `curl` with a sentence naming "Magdalena" (not in the known-districts list) — confirmed `district` came back in `missing`, never passed through.
- [X] T015 [P] [US2] Fixture test in `app/src/lib/data/matchExtraction.test.ts`: `ok: false` (any failure) routes to the plain tap-through questionnaire from the first question, with no fields pre-filled.

### Implementation for User Story 2

- [X] T016 [US2] Generalize `SportMatch.tsx`'s navigation state from the literal `{ startAt?: "sport" }` (introduced in `006-no-empty-results`) to `{ startAt?: keyof SportMatchAnswers }`, and update `step` initialization to resolve any question key, not just `"sport"`.
- [X] T017 [US2] Implement the routing decision in `app/src/lib/data/matchExtraction.ts` or a small helper it exports: given an `ExtractionResult`, decide `finalizeMatch()` vs. `startAt: <first missing key>` vs. plain fallback (no `startAt`) — this is the function T012/T013/T015's fixtures test.
- [X] T018 [US2] Implement district validation against `DISTRICTS` (`app/src/data/organizations.ts`) inside `supabase/functions/extract-match-answers/index.ts` before building the response — non-matching values become `null`/absent, added to `missing`.
- [X] T019 [US2] Implement the budget null-vs-`"no_seguro"` distinction in the extraction prompt/schema and response mapping in `supabase/functions/extract-match-answers/index.ts` (research.md R3).
- [X] T020 [US2] Add the fallback explanation copy (shown when `ok: false` or when routed into the tap-through) to `app/src/pages/SportMatch.tsx`, drafted in Match™'s established voice.
- [X] T021 [US2] Sync `docs/microcopy.md` (new fallback string + the free-text entry point's own copy) and `docs/ux-flows.md` Flow 1 (document the new optional entry point and its placement) — living-doc discipline, same pass as the code.

**Checkpoint**: User Stories 1 AND 2 both work independently; nothing is ever fabricated.

---

## Phase 5: User Story 3 - Cost exposure stays bounded (Priority: P2)

**Goal**: The feature cannot silently blow past the $5 test budget or fail visibly once it does.

**Independent Test**: an oversized/pathological request is rejected cheaply; after the OpenRouter-side limit is hit (manual setup, quickstart.md), new submissions fail gracefully into the tap-through questionnaire.

### Tests for User Story 3

- [X] T022 [P] [US3] ~~Fixture test~~ **Scope adjustment** (same as T007): verified live via `curl` with a 600-character payload — confirmed `ok: false` with all 8 fields in `missing`, no OpenRouter call made (checked no cost/usage recorded for that request).

### Implementation for User Story 3

- [X] T023 [US3] Add the request-length cap check as the first step in `supabase/functions/extract-match-answers/index.ts`, before any OpenRouter call.
- [X] T024 [US3] Add a header comment in `supabase/functions/extract-match-answers/index.ts` documenting the required manual setup (OpenRouter $5 credit limit, `OPENROUTER_API_KEY` secret) — mirrors `supabase/seed/002_organizations.sql`'s header-as-gate convention, so the requirement travels with the code, not just `quickstart.md`.
- [X] T025 [US3] Code-level guarantee confirmed (any non-200 from OpenRouter, including a spend-limit rejection, falls through to `emptyFailure()`). **Still pending**: the product owner confirming this empirically once real testing volume actually reaches the $5 limit (per quickstart.md).

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [X] T026 [P] Run the full existing test suite (`npm run test` in `app/`) and confirm zero changes to any existing test's outcome — proves SC-005 (tap-through-only path is byte-for-byte unaffected).
- [X] T027 Run `quickstart.md`'s full validation table manually against a real deploy (owner + implementer together) before considering this feature done.
- [X] T028 [P] `tsc -b` / build check on `app/` to confirm the `startAt` type generalization (T016) didn't introduce any type errors elsewhere.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)**: blocks all user stories.
- **User Story 1 (Phase 3)**: depends only on Foundational. Independently demoable as the MVP.
- **User Story 2 (Phase 4)**: depends on Foundational; reuses US1's UI toggle (T009) and Edge Function schema (T008) but adds its own routing/validation logic. Should follow US1 since it generalizes US1's happy-path handler.
- **User Story 3 (Phase 5)**: depends only on Foundational (T004's Edge Function skeleton) — can technically run in parallel with US2, but doing it last is safer since it's a guardrail on a mechanism (T004/T008) that's still settling during US1/US2.
- **Polish (Phase 6)**: after all three stories.

## Parallel Example: Foundational phase

```bash
# T004 and T005 touch different files and have no dependency on each other:
Task: "Implement the raw OpenRouter call in supabase/functions/extract-match-answers/index.ts"
Task: "Implement extractMatchAnswers() in app/src/lib/data/matchExtraction.ts"
```

## Implementation Strategy

**MVP first**: Setup → Foundational → User Story 1 → stop and validate (T011) → this alone is demoable ("describe it, get results," happy path only). User Story 2 is what makes it safe to let anyone other than the product owner touch it (never fabricates). User Story 3 is what makes it safe to leave running during testing without watching it constantly. Ship all three before calling this test "done," but US1 alone is a legitimate checkpoint to pause at and demo.
