-- MatchPoint — migration 0010: RLS policies for `users` (004-auth-lead-creation).
--
-- users has been RLS-enabled with zero policies since 0007 (deny-all). This feature is the
-- first thing that writes to it — a user row is provisioned on first login (docs/data-model.md:
-- "User is created only after Google or Apple login"). `id` MUST equal auth.uid() for every row
-- (see .claude/doc/auth-lead-creation/backend.md §2.1 / research.md R2) — this is what
-- already-shipped migration 0007's `authenticated_insert_leads` policy (`user_id = auth.uid()`)
-- has assumed since 001-data-foundation. Insert and update are both needed because the
-- provisioning write is an idempotent upsert (re-runs harmlessly on every login/session-restore,
-- see app/src/lib/data/users.ts).

create policy "authenticated_upsert_own_user_insert" on users
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "authenticated_upsert_own_user_update" on users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Own-row read, mirroring the existing users_read_own_leads pattern (0007). Not exercised by any
-- UI this milestone (no "my profile" screen), but a user reading their own row is the correct
-- minimal-scope policy to ship alongside insert/update, not something to add later under time
-- pressure. No anon policy — users are created only after login (Product Principle 1).
create policy "users_read_own_profile" on users
  for select
  to authenticated
  using (id = auth.uid());
