# Security & Privacy Audit — Data Foundation (001)

Audited commit: `ae5bc64` on branch `001-data-foundation`.
Audited against: `docs/security-standards.md` (as currently written, reconciled 2026-07-03).
Scope: Supabase schema + RLS (`supabase/migrations/0001-0007`), data-access layer
(`app/src/lib/data/*`), and the real-org seed (`supabase/seed/002_organizations.sql`).

## What was checked

- All 7 migrations (`0001`–`0007`), read in full, focusing on RLS policy logic and column-level
  PII exposure in `users`/`organizations`/`leads`/`profile_claims`.
- `app/src/lib/data/supabaseClient.ts`, `organizations.ts`, `mappers.ts`, `types.ts` — full read.
- `app/src/lib/data/organizations.integration.test.ts` and `mappers.test.ts` — read for what they
  actually assert about RLS/exposure, not just that tests exist.
- `app/.env.example`, `supabase/.env.example` — checked for real vs. placeholder secrets.
- Full-repo `git grep` for `service_role`, `postgres://`, and key-shaped strings across all
  tracked files (not just the new commit) to rule out a secret committed earlier and only
  referenced now.
- `git ls-files` for any tracked `.env`/`.env.local`.
- Live check: `GET https://api.github.com/repos/mgsalcedo/MatchPoint` unauthenticated → confirmed
  `404` at audit time, matching the seed file's stated gating justification.
- `supabase/seed/002_organizations.sql` read in full for what categories of data it contains.
- `docs/security-standards.md` re-read in full (not assumed) to get the actual current gate wording.

## Findings

### High — the 404-check is a weak, transient signal for "safe to have committed real contact info"

`supabase/seed/002_organizations.sql:3-5` gates itself on: "committed only now that the repository
is private (confirmed via GitHub API returning 404 unauthenticated on 2026-07-08)." This reasoning
has two concrete gaps:

1. **A 404 is ambiguous.** `api.github.com/repos/{owner}/{repo}` returns 404 both when a repo is
   private *and* when it does not exist at that path (wrong org, renamed, deleted, or a typo).
   Nothing in the commit or runbook records a corroborating check (e.g., an authenticated
   `gh api repos/mgsalcedo/MatchPoint --jq .private` returning `true`, or a `gh repo view` while
   logged in) that would distinguish "private" from "not found here." I re-ran the same
   unauthenticated check today and got `404`, consistent with private, but that single data point
   has the same ambiguity now as it did at commit time.
2. **Privacy is a mutable setting, not a one-time gate.** The check proves the repo was private
   *at the moment of the curl call*, not that it stays private. Nothing in the repo (no CI check,
   no pre-push hook, no documented recurring verification) prevents someone from later flipping
   the repo to public — at which point `002_organizations.sql`'s real WhatsApp numbers, Instagram
   handles, and (per the commit message) sourcing notes become instantly public with no code
   change or review trigger to catch it. `docs/security-standards.md` does not mention this
   specific gate at all (it's a `FR-012`/project-policy rule layered on top of the security
   standards doc, not sourced from it), so there's no standing doc instructing a re-check before
   any future visibility change.

**Concrete exploitable scenario**: a future contributor (or the repo owner) toggles the GitHub repo
to public for an unrelated reason (portfolio use, onboarding a collaborator without an invite,
CI/CD requiring a public repo on a free plan) without realizing `002_organizations.sql` was gated
on privacy. The file, plus its full git history, becomes public immediately, exposing 10 real
organizations' WhatsApp numbers and Instagram handles sourced without those orgs' consent — this
is exactly the Ley N.º 29733 exposure the seed file's own comment is trying to avoid, just moved
one step later, from "commit time" to "any time after."

**Recommendation** (audit only — not implementing): confirm privacy via an authenticated call
(`gh api repos/mgsalcedo/MatchPoint --jq .private`) rather than an unauthenticated 404, and treat
repo-visibility as a standing constraint requiring periodic re-verification (or branch
protection / a CI check that fails the build if the repo is public and this file is tracked),
not a one-time gate satisfied at commit time.

### Low — organization contact info in the seed is technically outside `docs/security-standards.md`'s PII framing, but Ley N.º 29733 consent gap still applies

`docs/security-standards.md`'s "PII & location" section is written entirely in terms of **User**
location and **Organization contact channels once published** — it explicitly says Organization
contact channels "are public marketplace data once the profile is published/verified... not
gated" (line 10). Read literally, the seeded WhatsApp/Instagram/website data for these 10
organizations is compliant with that gate: it's the intended shape of a preloaded Organization
profile per `docs/data-model.md`/ADR-0005, and nothing in this migration set exposes User PII (the
`users` table is schema-only, no rows seeded, and RLS denies all reads on it — see below).

However, `docs/security-standards.md` line 27 separately requires: "consent for storing
location/contact data must be explicit, not bundled into generic ToS acceptance" under Ley N.º
29733. The seeded orgs are real third-party businesses that did not go through any consent flow —
their contact info was sourced from public web search, not collected from them directly. This is
consistent with the PMV's "preload first, claim later" model (ADR-0005) referenced in the seed
file's own comment, and MatchPoint's `docs/business-rules.md` presumably already treats
preloading public business info as legitimate-interest processing rather than consent-based
processing (a common, defensible pattern for B2B/public business directories under most
data-protection regimes, Peru's included, when the data is already publicly disclosed by the
business itself for commercial contact purposes). This audit is not positioned to make that legal
call, but flags it as a **documentation gap**: `docs/security-standards.md` doesn't currently
distinguish "consent required" (User PII) from "public business data, correction/removal path
required instead" for Organizations — it only gets close to this at line 29 ("Organization data
needs its own correction/removal path... phrased separately from account deletion"). That
correction/removal path is not yet implemented anywhere in this migration set (no admin UI, no
endpoint, no documented process) — reasonable for this milestone (schema/data-access only, no UI
yet) but worth tracking as a pre-launch requirement, not a defect in this commit.

No code change recommended here; flagging for the product/docs side, not the implementation.

## Compliant / no changes needed

- **RLS policies (`supabase/migrations/0007_rls_policies.sql`)** match the spec exactly:
  - `public_read_organizations` (lines 29-33) gates on `is_active = true AND profile_status NOT IN
    ('suspended','archived','rejected')` — correct per the audit's checklist.
  - All four child tables (`organization_sports`, `venues`, `schedules`, `organization_adn`,
    lines 36-76) each gate through an `exists` subquery against the same visible-parent-org
    condition — no child table has an independent, looser policy. `venues` and `schedules` also
    correctly AND their own `is_active = true`.
  - `leads`: insert-only for `authenticated` with `user_id = auth.uid()` (lines 80-83), and a
    separate select policy restricted to `user_id = auth.uid()` (lines 85-88) — matches "insert-
    only for authenticated users reading their own rows" (there is no update/delete policy at
    all, which is correct and stronger than strictly required — reinforces the documented
    immutable-Lead rule from `docs/data-model.md`).
  - `users`, `match_sessions`, `match_results`, `profile_claims`: RLS enabled (migration lines
    8-19) with zero policies defined for any of them → Postgres RLS semantics mean this is
    deny-all for every role including `authenticated`, confirmed correct. The migration's own
    comment (line 90-91) correctly identifies this and warns against scope creep.
  - The integration test suite (`organizations.integration.test.ts:70-101`) actually exercises
    this against a live DB as the anon role — confirms empty reads on `leads` and `users`, and
    confirms a suspended org is unreachable even by direct id lookup. This is genuine verification,
    not just policy-file inspection.

- **Defense in depth**: `organizations.ts:55-59` re-applies the `is_active`/`profile_status`
  filter in the query itself, on top of RLS. Comment at lines 53-54 correctly frames this as
  belonging to testability/readability, not as the actual security boundary — RLS is. Good
  practice, correctly documented as such (avoids the common mistake of an app-layer filter being
  mistaken for the security boundary).

- **Secrets**: no service_role key, DB password, or live connection string found anywhere in the
  committed tree. `app/.env.example:5-10` and `supabase/.env.example:5-9` contain only placeholder
  values (`your-project-ref`, `your-db-password`, `your-service-role-key`) with explicit inline
  warnings never to put the service_role key in `app/`. `.gitignore:4-6` excludes `.env`,
  `.env.local`, and `supabase/.env`. `git ls-files` confirms no `.env`/`.env.local` file is
  tracked. Full-history `git grep` for `service_role`/`postgres://` turned up only the two
  `.env.example` placeholder lines.

- **`supabaseClient.ts`**: uses `VITE_SUPABASE_ANON_KEY` exclusively (line 14), no reference to
  `service_role` anywhere in `app/src`. Fails fast with a clear error if env vars are missing
  (lines 16-21) rather than silently falling back to a broader-privileged path. Docstring
  correctly explains the anon-key/RLS security model rather than treating key secrecy as the
  boundary.

- **Auth/session boundaries**: not yet applicable at this milestone — no auth flow, no
  Organization session, no endpoint code exists yet in this commit (data-access layer only, no
  API/server actions). Nothing here to find; `docs/security-standards.md` line 15-17 confirms
  Organizations have no session at PMV, so there is no cross-role boundary to test yet. This will
  need a dedicated audit pass when the Lead-creation/contact flow (Milestone 3+) lands, per the
  doc's own "Review trigger" section (line 34).

- **Moderation gate**: satisfied by construction, as `docs/security-standards.md` line 17
  anticipates — no write path to `organizations` exists in shipped code at all (only migrations
  and a read-only query), so there is no publish path to bypass a moderation step. The seed data
  itself is inserted via raw SQL by an admin/operator, matching "only admins can create/edit
  Organization profiles (Flow 9)."

- **Rate limiting / scraping resistance**: not yet applicable — no HTTP endpoint exists yet in
  this commit; `getOrganizations()` is a data-access function with nothing calling it over the
  network. This becomes relevant once Milestone 3 wires it behind an API/server action or the app
  queries Supabase directly from the browser — worth flagging now for that future milestone: a
  direct-from-browser Supabase query (as `supabaseClient.ts` sets up) has no natural rate-limit
  choke point unless Supabase's own project-level rate limiting or a future edge function adds
  one. Not a defect in this commit since nothing calls it yet, but noted so it isn't missed later.

- **Data deletion**: not applicable to this commit — no User accounts exist yet (schema only, zero
  rows), no deletion path is expected at this milestone. `docs/security-standards.md` line 28
  requires this "before public launch," not at Milestone 0/1.

- **Mappers (`mappers.ts`)**: pure, side-effect-free, no logging of row contents, no analytics
  calls, nothing that would leak PII/contact data into logs. Confirmed no `console.log`/analytics
  import anywhere in `app/src/lib/data/`.

- **Seed data content**: contains only Organization-level business contact info (WhatsApp,
  Instagram, website) as described — no User rows, no `profile_claims` rows with
  `requester_email`/`requester_phone` seeded, verified via grep. The one org intentionally seeded
  with zero contact channels (Altaïr CrossFit, per the integration test comment at
  `organizations.integration.test.ts:49-51`) correctly fails `meetsMinimumDataset()` and is
  excluded from discovery rather than being fabricated a fake contact channel — correct BR-016
  behavior.

## Summary

One High finding (404-unauthenticated is an insufficient, non-durable signal for "repo is and
will stay private") and one Low/documentation finding (Ley N.º 29733 consent framing for
preloaded Organization data isn't fully spelled out in `docs/security-standards.md`, though the
implementation itself is consistent with the PMV's preload-then-claim model). RLS, secret
hygiene, and the anon-key-only client are all correctly implemented and verified, not just
asserted. No Critical findings — there is no live write path, auth flow, or public endpoint in
this commit for a Critical-severity exploit to attach to yet.
