# Data Model: No Empty Sport Match™ Results

Phase 1 output for `/speckit-plan`. **No entity, column, relationship, or migration changes.** This is a client-side matching-logic and UI-copy fix.

## Confirmed no-impact

- `MatchResult` (persisted as one row per organization per session via `match_results`) is unaffected in shape — this fix changes *which* organizations get scored and *what* their `reasons` array can contain (an honest sport-only reason where none existed before), not the row shape written to the database.
- `sessionMappers.ts`'s `buildMatchResultRows` already serializes whatever `MatchResult[]` it receives; `rank` derives from array index post-sort/slice, `reasons` stores as unconstrained `jsonb`. No change needed.
- No new Supabase migration. `docs/data-model.md` and `docs/database-schema.md` require no structural updates — see `research.md` R7 for the full confirmation trail.

## What actually changes (not a data-model concern)

- `app/src/lib/matching.ts`'s in-memory scoring/filtering logic (pure functions, no persistence).
- `app/src/pages/Results.tsx` and `app/src/pages/SportMatch.tsx`'s UI copy and navigation state (React Router `location.state`, not persisted anywhere).

See `research.md` for the full rationale and `contracts/` is intentionally omitted for this feature — there is no new or changed external interface (no API, no DB contract) to document.
