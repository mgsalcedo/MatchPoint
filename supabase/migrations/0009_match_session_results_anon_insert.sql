-- MatchPoint — migration 0009: anonymous insert access for match_sessions / match_results.
--
-- 0007_rls_policies.sql intentionally left match_sessions/match_results with RLS enabled and
-- zero policies (deny-all for every role, including anon) — nothing wrote to them yet. Feature
-- 002-sport-match-engine needs an anonymous (unauthenticated) client to create its own
-- match_session + match_results rows without login, per ADR-0003 / constitution Principle I
-- (no login before value) and FR-001/FR-006.
--
-- Design: INSERT-only, no SELECT policy. The client computes matching results in-browser
-- (lib/matching.ts) and generates its own row ids via crypto.randomUUID() before inserting, so
-- it never needs Supabase to RETURNING a row back (which would itself require a SELECT policy).
-- With no SELECT policy, an anon client cannot read its own OR anyone else's match_sessions/
-- match_results rows — a strict superset of FR-006/SC-005, not just a minimal satisfaction of it.
--
-- `with check (user_id is null)` on match_sessions closes an impersonation gap: without it, an
-- anonymous request could insert a match_session claiming an arbitrary real user's id in
-- user_id, fabricating attribution. Anonymous requests have no verified identity, so user_id
-- must be null when written by the anon role; linking a session to a real user happens later
-- (Milestone 5, post-login) via a path that does not exist yet and is out of scope here.
--
-- Known gaps, explicitly deferred (do not solve in this migration):
--  1. No rate limiting. docs/security-standards.md calls for rate-limiting the match-scoring
--     path; RLS has no concept of request-rate limiting — that needs an edge function / gateway
--     layer if/when abuse is observed, not a schema change.
--  2. No `authenticated`-role insert policy yet. Once Milestone 5 ships real login, a logged-in
--     user completing Sport Match™ will hit these same tables as role `authenticated`, which
--     still resolves to deny-all until an analogous authenticated policy is added (mirroring
--     leads' authenticated_insert_leads pattern). Flag for Milestone 5, not built here.

create policy "anon_insert_match_sessions" on match_sessions
  for insert
  to anon
  with check (user_id is null);

create policy "anon_insert_match_results" on match_results
  for insert
  to anon
  with check (true);
