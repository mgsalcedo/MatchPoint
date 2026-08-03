# Quickstart: Real Auth & Lead Creation — setup & validation

Assumes 001/002/003's environment is already set up (migrations 0001-0009 applied, org seed run). This feature adds two more migrations and one real, external prerequisite.

## Setup

1. **Owner action — configure Google OAuth** (required before any of this is testable end-to-end):
   - Create an OAuth 2.0 Client ID in Google Cloud Console (Web application type).
   - In the Supabase dashboard → Authentication → Providers → Google: enable it, paste the Client ID/Secret.
   - In the Supabase dashboard → Authentication → URL Configuration: add `http://localhost:5173/auth/callback` (dev) and the production origin's `/auth/callback` to the Redirect URLs allow-list.
   - Apple is deliberately deferred this milestone (research.md R1) — no Apple setup needed yet.
2. **Apply migrations `0010` and `0011`** (RLS for `users`, and `authenticated`-role access for `match_sessions`/`match_results`) via the Supabase SQL Editor, same process as prior migrations.
3. `npm install && npm run dev` in `app/` (unchanged — no new dependency).

## Validate (proves the feature works)

| Check | Command / action | Expected | Proves |
|---|---|---|---|
| Unit — lead mappers | `npm test` (Vitest) in `app/` | `leadMappers.test.ts`: every `ContactType`/`LeadSource` value maps correctly | data-model.md |
| Unit — pending contact | `npm test` | `pendingContact.test.ts`: save/read/clear round-trips correctly against a mocked `sessionStorage` | research.md R9 |
| Real login | In the running app, click any contact CTA while logged out | Real Google account chooser appears (not a fake button); after choosing an account, the app lands back on a completed contact — not the login screen, not a blank page | User Story 2, FR-003, FR-004 |
| Real Lead creation | Same flow, through to completion | A new row exists in `leads` (check via Supabase Table Editor — the anon/app client has no read access by RLS design, admin dashboard access is the only way to see it); a new row exists in `users` if this was the first-ever login | User Story 1, SC-001 |
| External redirect ordering | Same flow | The external destination (WhatsApp/Instagram/booking) opens only after the above — never before, never if the Lead insert fails | FR-007, SC-004 |
| Session persistence | After logging in, reload the page | Still recognized as logged in, no login screen shown | User Story 3, SC-003 |
| Org-unavailable edge case | Suspend/archive a test organization (via Table Editor) between clicking contact and finishing login | `performContact` returns `"org_unavailable"`, no Lead created, no external redirect | Edge Cases, FR-013 |
| Analytics | Dev-mode console tracker | `login_started`, `login_completed`, `lead_created`, `external_contact_opened` each log once per completed flow | FR-012, SC-005 |

## Out of scope (do not do this feature)

- Apple Sign In (deferred, research.md R1).
- Retroactively linking a previously-anonymous match session to the user after login.
- A logout affordance (not required by any User Story here).
- Lead de-duplication (BR-021, explicitly future scope).
- Any profile-claim or admin/moderation flow.
