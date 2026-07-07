# Contract: Organizations read (data-access layer)

This milestone ships a **data-access function**, not an HTTP endpoint (nothing calls it over HTTP yet). It is the layer *under* where a future `GET /api/organizations?sport=&district=` contract would sit. `docs/api-contracts.md` currently documents only `GET /api/organizations/:slug` (single-profile) — the list-by-filter contract below is a **documented gap** to reconcile into `docs/api-contracts.md` when Milestone 3 wires the UI.

## Function

```typescript
// app/src/lib/data/organizations.ts
export interface GetOrganizationsParams {
  sportSlug?: string;    // matches sports.slug, e.g. "running"
  districtName?: string; // matches districts.name, e.g. "Miraflores"
}

export function getOrganizations(
  params?: GetOrganizationsParams
): Promise<Organization[]>;
```

- Returns the existing `app/src/types.ts` `Organization[]` shape (FR-011). No new shape.
- No args → full active catalog. `sportSlug` → orgs offering that sport. `districtName` → orgs with a venue in that district (exact match, no adjacency). Both → intersection.

## Guarantees

| # | Guarantee | Spec ref |
|---|---|---|
| C1 | Only `is_active = true` AND `profile_status NOT IN (suspended, archived, rejected)` orgs are returned. | FR-004, SC-005, research.md R2 |
| C2 | Only orgs meeting the minimum launch dataset (name, ≥1 sport, ≥1 venue/district, ≥1 contact channel, ≥1 schedule, ADN, short description) are returned. | FR-005 |
| C3 | Anonymous (anon key, no login) — never requires auth. | FR-003, Principle I |
| C4 | Output is assignable to `Organization` with no UI component-contract change needed later. | FR-011, SC-006 |
| C5 | `districtName` filters by the org's venue district(s), not a column on the org. | research.md R6 |
| C6 | No matching/adjacency/scoring logic — pure retrieval. | Principle II |

## Error behavior

- Missing/undefined Supabase env vars → throw at client init with a message pointing to `app/.env.example` (fail-fast, backend.md §1.3).
- Empty result (e.g. a district with no orgs) → returns `[]`, not an error (the "no dead end" UX is a later milestone; the query itself must return cleanly — spec Edge Cases).

## Verification (see quickstart.md)

- Unit: `mapOrganizationRow(fixture)` → correct `Organization` (test-first, no DB).
- Integration: `getOrganizations({ sportSlug })` against the seeded DB proves C1–C5 and SC-001 (6 sports + Callao coverage).
- RLS: anon role cannot read `leads`/`users`; cannot read a suspended org (SC-005).
