# Implementation Plan: AI Free-Text Entry for Sport Match™

**Branch**: `010-ai-freetext-sport-match` | **Date**: 2026-08-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-ai-freetext-sport-match/spec.md`

## Summary

Add an opt-in "describe it in your own words" entry point at the top of Sport Match™'s first question. A user's free-text sentence is sent to a new Supabase Edge Function, which calls Claude Haiku 4.5 **via OpenRouter's OpenAI-compatible API** with a structured-output request to extract the same 8 fields the tap-through questionnaire already collects (`SportMatchAnswers`). Extracted fields are merged into the existing session state via the unchanged `updateAnswers()`; anything not clearly stated stays unset and routes the user into the normal tap-through flow at the first missing question (generalizing `006-no-empty-results`'s existing `startAt` mechanism). The matching/ranking engine (`app/src/lib/matching.ts`) is not touched. This is the first feature to introduce server-side compute and a paid external API dependency to MatchPoint — bounded to a $5 hard spend limit on the OpenRouter API key for this initial test.

## Technical Context

**Language/Version**: TypeScript (React 19, Vite) for the client; TypeScript on Deno for the new Supabase Edge Function.

**Primary Dependencies**: none new to install — the Edge Function calls OpenRouter's OpenAI-compatible REST API (`https://openrouter.ai/api/v1/chat/completions`) via plain `fetch`, no SDK required (research.md R1). No new client dependency.

**Storage**: N/A — no new persisted entity. The free-text sentence is transient (request/response only, never written to any table, per FR-004/BR-028).

**Testing**: Vitest for client-side routing/merge logic (new, TDD per Constitution Principle III — this is business logic gating what reaches `finalizeMatch()`); Edge Function gets its own lightweight test coverage for district validation and the null-vs-"no_seguro" distinction (research.md R4). No test ever calls the real Anthropic API (mocked throughout).

**Target Platform**: Same as the rest of `/app`, plus Supabase Edge Functions (Deno runtime) as a new deployment target.

**Performance Goals**: Extraction round-trip target ~1.5–3s (Haiku generation + Edge Function overhead), masked by the existing "Estoy cruzando tu objetivo..." loading screen — well inside BR-011's 60-second budget.

**Constraints**: OpenRouter API key MUST live only in the Edge Function's environment (Supabase Function secret), never in client code (FR-003). Hard $5 spend limit on the key, configured in the OpenRouter dashboard — a product-owner action, not something this plan can enforce in code alone (FR-010).

**Scale/Scope**: 1 new Edge Function, 1 new client data-access module, 1 small UI addition (a toggle/link + textarea) inside `SportMatch.tsx`, 1 generalization of the existing `startAt` navigation state. No schema migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. No Login Before Value** — ✅ Pass, with a build-time acceptance check. The Edge Function must be deployed callable by the `anon` role (no forced auth), same as the existing `match_sessions` anonymous-insert pattern. Verified explicitly in quickstart.md, not assumed.
- **II. Sport Match™ First** — ✅ Pass. The tap-through questionnaire remains the default, unchanged path; free text is an additional entry point into the *same* centralized `matching.ts`, never a second scoring path. Every result still carries reasons from the unchanged engine.
- **III. Test-First for Business Logic** — ✅ Pass, with a scope note. `matching.ts` itself needs no new tests (untouched). The new client-side extraction-routing logic (merge partial answers → decide `finalizeMatch()` vs. route to first missing question) IS business logic in the constitution's sense — it gates whether incomplete data can reach the scoring engine — and gets TDD coverage via fixtures (research.md R4), never live-API tests.
- **IV. Contact/Lead Is the North Star** — ✅ Pass / N/A. `Lead` schema and creation ordering are untouched; this feature only changes how `SportMatchAnswers` gets populated, upstream of any Lead.
- **V. PMV Scope Discipline** — ⚠️ Pass, with an explicitly-accepted complexity cost (see Complexity Tracking). This is the first feature to add a paid external dependency and server-side compute to a previously pure client+Supabase PMV. The product owner explicitly requested this and explicitly approved the tradeoff (spec.md's Input/Assumptions) — not a silent scope expansion — but it is real, new operational complexity that Principle V asks to name plainly rather than wave through.
- **VI. Trust & Safety** — ✅ Pass, with explicit new-data-flow handling. The free-text sentence is a new third-party data flow (to Anthropic) MatchPoint didn't have before. Mitigations: extraction schema only ever emits the 8 defined fields (nothing else reaches any table/log, FR-004); the sentence itself is never persisted (Assumptions); a hard provider-level spend limit bounds cost exposure (FR-010) in place of a more elaborate rate-limiter, which is an explicit, documented scope decision for this bounded $5 test (spec.md Assumptions), not an oversight.

No violations requiring a rejected-alternative writeup beyond what's captured in Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/010-ai-freetext-sport-match/
├── plan.md              # This file
├── research.md          # Phase 0 output (R1-R5)
├── data-model.md        # Phase 1 output (confirms no schema change)
├── contracts/
│   └── extract-match-answers.md   # New Edge Function's request/response contract
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
supabase/
└── functions/
    └── extract-match-answers/
        └── index.ts            # NEW — Deno Edge Function, holds OPENROUTER_API_KEY secret

app/src/
├── lib/data/
│   └── matchExtraction.ts      # NEW — thin client wrapper around supabase.functions.invoke(),
│                                  mirrors matchSessions.ts/leads.ts isolation pattern
├── pages/
│   └── SportMatch.tsx           # MODIFIED — free-text toggle + textarea at the first question;
│                                   startAt generalized from a literal "sport" union to
│                                   keyof SportMatchAnswers so extraction can route to any
│                                   missing question, not just sport
└── context/
    └── MatchSessionContext.tsx  # Unchanged — updateAnswers()/finalizeMatch() reused as-is
```

**Structure Decision**: additive — one new Edge Function directory (first of its kind in this repo), one new client data-access module following the existing `lib/data/` isolation convention, and a scoped modification to `SportMatch.tsx`'s existing navigation-state handling. No existing file's business logic changes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| First server-side compute + paid external API dependency in a previously pure client+Supabase PMV (Principle V tension) | The feature is fundamentally "extract structured data from free text," a task client-side code cannot do; a real LLM call is unavoidable to deliver what was explicitly requested | Doing the call from the browser (no Edge Function) was rejected outright — it would expose the OpenRouter API key in the shipped bundle, a Principle VI trust/safety violation, not just a style preference |
