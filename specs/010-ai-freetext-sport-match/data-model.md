# Data Model: AI Free-Text Entry for Sport Match™

No new entity, no migration, no change to `docs/data-model.md` or `docs/database-schema.md`.

## Why there's nothing to add here

This feature produces the same `SportMatchAnswers` shape (`app/src/types.ts:89-98`) the tap-through questionnaire already produces — just via an alternate input path. That shape was never itself a persisted table; it's an in-memory session object that `finalizeMatch()` turns into a `MatchSession`/`MatchResult` write through the existing, unchanged `sessionMappers.ts`. Nothing about that downstream path changes.

## What is explicitly NOT persisted

- The raw free-text sentence the user typed. It exists only for the duration of one Edge Function request/response and is never written to any table, never logged (FR-004, BR-028). If a future feature wants to persist it for debugging/improvement purposes, that is a new decision requiring its own privacy review — not assumed here.
- Any field outside the 8 defined `SportMatchAnswers` keys, even if the model's raw response happened to include one (the Edge Function only forwards the 8 whitelisted fields to its response; anything else the model might emit is dropped server-side before the client ever sees it).

## Existing entity this feature reads/writes through, unchanged

- **SportMatchAnswers** (`docs/data-model.md`'s conceptual model, `app/src/types.ts`): `goal`, `sport`, `district`, `days`, `time`, `level`, `budget`, `environment` — this feature's extraction output is validated to conform exactly to this shape (as a `Partial`) before merging into session state.
