# Contract: Lead creation + contact orchestration (data-access layer)

Like `match-session-write.md` (002), this ships **data-access functions**, not HTTP endpoints. `docs/api-contracts.md` documents `POST /api/leads`'s JSON shape; this feature implements it as a direct Supabase client insert (same posture as 002's `POST /api/match-sessions`).

## Functions

```typescript
// app/src/lib/data/leads.ts
/** Throws on failure — callers MUST catch and MUST NOT open the external destination on error. */
export async function createLead(input: BuildLeadInput): Promise<string>; // returns the Lead's id

// app/src/lib/data/users.ts
/** Idempotent upsert. id MUST be authUser.id. Safe to call on every sign-in/session-restore. */
export async function ensureUserRow(authUser: SupabaseUser): Promise<void>;

// app/src/lib/data/organizations.ts (new function, existing file)
/** FR-013: single-row re-check the org is still publicly contactable, right before a Lead insert. */
export async function getOrganizationContactSnapshot(id: string): Promise<OrgContactSnapshot | null>;

// app/src/context/MatchSessionContext.tsx (orchestration, not a data-access file)
/** Centralizes re-verify → create-Lead → resolve-external-URL. One function, two callers
 * (already-logged-in contact, and post-OAuth-redirect pending-contact completion). */
async function performContact(pending: PendingContact, currentUserId: string): Promise<ContactOutcome>;
```

## Guarantees

| # | Guarantee | Spec ref |
|---|---|---|
| C1 | A Lead is never created for an organization that has become suspended/archived/rejected since the user clicked contact. | FR-013 |
| C2 | The external destination (WhatsApp/Instagram/booking URL) never opens unless a Lead was confirmed saved first. | FR-007, BR-003 |
| C3 | A Lead, once created, is never updated or deleted by any code path in this feature. | FR-008, constitution Principle IV |
| C4 | A user may create more than one Lead across different organizations/contact methods in one visit. | FR-009, BR-020 |
| C5 | If the Lead insert fails, the user sees a distinguishable failure state and can retry the same contact action without re-entering anything. | FR-010 |
| C6 | `createLead`/`ensureUserRow` only succeed for the actual authenticated caller — RLS enforces `id`/`user_id = auth.uid()`, not just application-code discipline. | constitution Principle VI |
| C7 | A `pendingContact` requested while logged out survives the real OAuth full-page redirect and completes automatically on return, without the user re-clicking anything. | FR-004, User Story 2 |
| C8 | Login is never triggered except from inside a contact attempt — no code path in this feature prompts login earlier in the funnel. | constitution Principle I |

## Error behavior

- `createLead` throws — the caller (`performContact`) catches it and returns a `"lead_failed"` outcome; `pendingContact` stays in `sessionStorage` so a retry re-runs the exact same attempt (C5).
- `getOrganizationContactSnapshot` returns `null` for a since-suspended/archived org (or one that no longer exists) — `performContact` returns `"org_unavailable"` and clears the pending contact (no retry makes sense against a permanently-gone target).
- `ensureUserRow` failure is logged but does not block `performContact` from proceeding if `session.user` is already available — the Lead insert itself will fail on the FK if the user row genuinely doesn't exist, surfacing as the same `"lead_failed"` path.
- Missing/undefined Supabase env vars → same fail-fast behavior as every other data-access file in this project (throws at client init, not at call time).

## Verification (see quickstart.md)

- Unit: `leadMappers.ts`'s enum mappings (`buildLeadInsertRow`) and `pendingContact.ts`'s sessionStorage read/save/clear round-trip, both test-first (constitution Principle III).
- Manual/E2E only (research.md R13 — no `service_role`-backed automated integration test): a real Google OAuth login, a real Lead insert verified via the Supabase Table Editor, and confirmation that the external destination only opens after that row exists.
