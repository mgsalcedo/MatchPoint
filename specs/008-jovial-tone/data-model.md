# Data Model: Match™ Jovial Tone Recalibration

Phase 1 output for `/speckit-plan`. **No entity, column, relationship, or migration changes.** This is a copy-only change plus one small, local UI addition (question helper text).

## Confirmed no-impact

- No Supabase table, RLS policy, or query changes.
- No change to `SportMatchAnswers`, `MatchResult`, `Organization`, or any other app-level type.
- No change to `app/src/lib/matching.ts` — match-reason text stays literal per FR-003, and no scoring/ranking logic is touched.

## What actually changes (not a data-model concern)

- `SportMatch.tsx`'s local `QUESTIONS` array gains an optional `helper?: string` field per question entry (research.md R1) — a UI-only addition, rendered as a plain paragraph, not persisted anywhere or sent to the backend.
- Hardcoded JSX strings across `Welcome.tsx`, `SportMatch.tsx`, `Results.tsx`, `OrganizationProfile.tsx`, `Login.tsx`, `ContactSuccess.tsx`, `AuthCallback.tsx` — string literals only.

No `contracts/` — no new or changed external interface.
