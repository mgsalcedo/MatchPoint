# Research: AI Free-Text Entry for Sport Match™

Phase 0 output for `/speckit-plan`. Grounded in a `backend-architect` planning pass run before this spec was finalized (reviewed `docs/adrs/0004-wizard-of-oz-matching.md`, `docs/matching-engine.md`, the constitution, `docs/security-standards.md`, and the actual current code in `app/src/types.ts`, `app/src/lib/matching.ts`, `app/src/pages/SportMatch.tsx`, `app/src/context/MatchSessionContext.tsx`, `app/src/data/organizations.ts`).

## R1 — Where the model call lives: a new Supabase Edge Function calling OpenRouter

**Decision**: `supabase/functions/extract-match-answers/index.ts`, a Deno Edge Function, holding `OPENROUTER_API_KEY` as a Supabase Function secret. The client calls it via `supabase.functions.invoke("extract-match-answers", { body: { freeText } })` — same anon-key-authenticated pattern already used for the app's other Supabase calls, no forced login (Constitution Principle I). Inside the function, a plain `fetch` to `https://openrouter.ai/api/v1/chat/completions` (OpenRouter's OpenAI-compatible endpoint) calls the model — no SDK needed, since OpenRouter accepts standard `fetch`/JSON.

**Rationale**: the app is a Vite SPA; any client-embedded API key is extractable from the shipped JS bundle (confirmed via direct inspection during `007`/`010`'s GitHub Pages debugging this session — bundle contents are fully readable). An OpenRouter key in client code is the same risk class `docs/security-standards.md` already forbids for Supabase's `service_role` key. Supabase Edge Functions is the only server-side compute surface already available in this stack — no new infra provider to introduce. OpenRouter specifically (rather than a direct Anthropic API key) was the product owner's explicit choice — she already provisioned an OpenRouter key locally (`.env.openrouter`, gitignored) for this project.

**Alternatives considered**: a separate Node/Express backend — rejected, adds a whole new deployment target and hosting decision for one endpoint, when Supabase already provides serverless compute the project has credentials for. A client-side call with a "restricted" key — rejected outright; API keys of this kind are not restrictable to safe client-side use the way some tightly-scoped public keys are (contrast with Supabase's anon key, which is designed to be public because RLS enforces the real boundary). A direct Anthropic API key instead of OpenRouter — not chosen; the product owner already has OpenRouter credentials set up and wants to use them for this test.

## R2 — Model: Claude Haiku 4.5 via OpenRouter (current fast/low-cost tier)

**Decision**: model slug `anthropic/claude-haiku-4.5` on OpenRouter, per the product owner's explicit choice for this test. Confirmed via OpenRouter's own model page: $1/$5 per MTok (input/output), 200K context, and explicit support for tool-calling and structured outputs through OpenRouter's OpenAI-compatible API.

**Rationale**: single-turn structured extraction of 8 enum-ish fields from one sentence is exactly the profile a fast/cheap model tier handles well — not open-ended generation or multi-step reasoning. Using structured outputs (a JSON-schema-constrained `response_format`, or tool-calling with a forced tool as the fallback if plain `response_format` support proves inconsistent for this model on OpenRouter — verify both at implementation time) removes most of the accuracy risk a smaller model would otherwise carry for free-form JSON, since the shape itself is guaranteed by the API, not just prompted for.

**Alternatives considered**: a larger/more expensive tier — explicitly deferred per spec.md's Assumptions; only revisit if Haiku's accuracy against real Peruvian-Spanish test sentences proves insufficient during implementation. Calling Anthropic directly instead of through OpenRouter — not chosen, per R1.

## R3 — Extraction output shape and the null-vs-explicit-value distinction

**Decision**: the Edge Function returns `{ extracted: Partial<SportMatchAnswers>, missing: (keyof SportMatchAnswers)[] }`. Every field is independently nullable in the raw model output; `null`/absent means "not mentioned," which is different from a field having a real, meaningful value the user did state (including `budget: "no_seguro"`, the questionnaire's own existing "I'm not sure" option).

**Rationale**: BR-016 (never fabricate) requires the system to never convert silence into a claim. The one place this is subtle is `budget`, because the tap-through flow already has a legitimate answer meaning "I don't know" — collapsing "not mentioned" and "explicitly unsure" into the same bucket would either wrongly claim the user said something they didn't, or wrongly re-ask something they did address. Every other field (goal, sport, days, time, level, environment) has no such ambiguous middle option, so this distinction matters specifically for `budget`.

**Alternatives considered**: a single flat `Partial<SportMatchAnswers>` with no separate `missing` list, inferring "missing" client-side from `undefined` values — rejected because it can't represent the budget distinction above without an extra sentinel anyway; an explicit `missing` array keeps the contract self-documenting.

## R4 — District validation is a second gate, not trust-the-model

**Decision**: any extracted `district` value is checked against the existing literal `DISTRICTS` list (`app/src/data/organizations.ts`) before being accepted. A non-matching value (typo, a district outside Lima/Callao, a neighborhood alias the model invented) is treated as `missing`, never auto-corrected or fuzzy-matched.

**Rationale**: `district` is the one field where the model could plausibly emit a plausible-looking but wrong string (a real Lima neighborhood that isn't one of MatchPoint's 8 supported districts, or a misspelling). Validating against the closed list before it ever reaches `updateAnswers()` keeps the guarantee "nothing unvalidated reaches the matching engine" enforced in code, not just in the prompt.

## R5 — Test strategy: fixtures and schema validation, never the live API

**Decision**: `matching.ts` needs zero new tests (untouched). New tests target: (a) the Edge Function's district-whitelist validation and budget null-vs-"no_seguro" logic, using fixture inputs, not live model calls; (b) the client-side routing logic in `matchExtraction.ts`/the `SportMatch.tsx` integration — given a mocked extraction result (full, partial, invalid-district, total-failure), assert the correct outcome (`finalizeMatch()` directly, `startAt` pointing at the right question, or fallback to the plain questionnaire).

**Rationale**: Constitution Principle III requires TDD for business logic and requires it be testable without network/IO. The routing/merge logic decides whether possibly-incomplete data reaches the scoring engine, which makes it business logic in the constitution's sense even though it's new to this feature — the LLM call itself is mocked at the boundary so tests stay deterministic and fast, consistent with `docs/base-standards.md`'s IO-isolation rule.
