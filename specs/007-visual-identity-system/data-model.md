# Data Model: Visual Identity System

Phase 1 output for `/speckit-plan`. **No schema change, no migration, no living-doc update.** The only change is app-layer: surfacing two columns that already exist in the database and are already documented.

## Organization (app-level type) — two optional fields added

| Field | Type | Source column | Notes |
|---|---|---|---|
| `logoUrl` | `string \| undefined` | `organizations.logo_url` | Square mark. Optional — most seeded organizations have none today (research.md R10). |
| `coverImageUrl` | `string \| undefined` | `organizations.cover_image_url` | Wide community photo, used in profile hero. Optional, same reason. |

Both are optional by design, not by omission: the fallback treatment (initials over a sport-tinted gradient, research.md R4) is a first-class rendering path that must look deliberate, since it is the *common* case at PMV, not an edge case.

## What changes in code

- `app/src/types.ts` — two optional fields on `Organization`.
- `app/src/lib/data/organizations.ts` — add `logo_url, cover_image_url` to the `SELECT` constant.
- `app/src/lib/data/mappers.ts` — map both through (undefined when null).

## Confirmed no-impact

- **No migration.** `organizations.logo_url` and `organizations.cover_image_url` already exist (`docs/database-schema.md` lines 197-198).
- **No `docs/data-model.md` update.** Both fields are already documented in the Organization table — the doc was correct; the code was behind it.
- **No `docs/database-schema.md` update.** Same reason.
- **No RLS change.** Both columns sit on `organizations`, already covered by the existing public-read policy.
- **No effect on matching.** `meetsMinimumDataset()` is unchanged — imagery is not and must not become an eligibility criterion, or organizations would silently vanish from results for lacking a photo.

## Not an entity

Brand assets (logo mark, favicon) are static files in `app/public/`, not modeled data — noted here only to be explicit that they are not part of any entity.
