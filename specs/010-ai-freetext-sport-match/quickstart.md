# Quickstart: AI Free-Text Entry for Sport Match™ — validation

## Setup (one-time, product-owner action)

1. OpenRouter dashboard (openrouter.ai/settings/keys) → the key already provisioned locally (`.env.openrouter`) → set a hard credit limit of **$5** on that key. This is the authoritative cost backstop (FR-010) — do this before any testing, not after.
2. `supabase secrets set OPENROUTER_API_KEY=<key>` (or via the Supabase dashboard's Edge Function secrets UI) — never in `app/.env*`, never in client code. The value comes from the local `.env.openrouter` file, never pasted into chat.
3. `supabase functions deploy extract-match-answers` — deploy the new Edge Function; confirm it does NOT require `--no-verify-jwt` (the anon-key JWT already satisfies Supabase's default verification, per Constitution Principle I).

## Validate (proves the feature works)

| Check | Action | Expected | Proves |
|---|---|---|---|
| Anonymous callability | Call the Edge Function without a logged-in session | Succeeds (200, `ok: true`/`false` per input) | Principle I — no login before value |
| Full extraction, no questions shown | On the first Sport Match™ question, choose free text, submit a sentence stating all 8 fields clearly | Lands directly on the matching/results flow, no question screens shown | US1, SC-001 |
| Partial extraction routes correctly | Submit a sentence mentioning only sport + district | Routed to the first unmentioned question (goal, if asked before sport — check `QUESTIONS` order), with sport/district already filled | US2, SC-002 |
| Budget "unsure" vs. unmentioned | Submit a sentence with "no sé cuánto puedo pagar" | `budget` extracts as the existing "no estoy seguro" option, not left unmentioned | FR-006 |
| Budget genuinely unmentioned | Submit a sentence that never brings up money | `budget` is `missing`, user is asked the budget question normally | FR-006 |
| Invalid/unknown district rejected | Submit a sentence naming a district outside MatchPoint's 8 supported districts (or a misspelling) | `district` comes back as `missing`, user is asked the district question — value is never guessed/auto-corrected | FR-007 |
| Nothing extra leaks | Submit a sentence that includes unrelated content (e.g. mentions an injury) | Only the 8 defined fields ever reach `updateAnswers()`; nothing else appears in Supabase logs/tables | FR-004, SC-003 |
| Extraction failure falls back cleanly | Simulate a failure (e.g. temporarily break the Edge Function or exceed the length cap) | User lands on the plain tap-through questionnaire from the first question, with a light Match™-voiced explanation — no raw error, no stuck screen | FR-008 |
| Tap-through unaffected | Complete Sport Match™ without ever touching the free-text option | Identical experience to before this feature — same screens, same copy, same behavior | SC-005 |
| Spend cap enforced | (After real testing volume) Check OpenRouter dashboard usage against the $5 limit | Spend halts at the configured limit; further calls fail gracefully into tap-through, not a visible error | FR-010, FR-011, US3 |

## Out of scope (do not do this feature)

- Any change to `app/src/lib/matching.ts`'s scoring/ranking logic.
- Any change to the `Lead` creation flow or its ordering guarantee.
- A model tier other than Haiku, or a spend limit other than $5, for this initial test.
- Per-user/per-IP rate limiting beyond the provider-level spend cap.
- Persisting the raw free-text sentence anywhere.
