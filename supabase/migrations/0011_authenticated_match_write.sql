-- MatchPoint — migration 0011: authenticated-role insert access for match_sessions/match_results.
--
-- Mirrors 0009's anon policies. Required by 004-auth-lead-creation: once login persists across
-- reloads (User Story 3), a returning logged-in user can start a fresh Sport Match™ session
-- while already authenticated, hitting these tables as role `authenticated` — which has had zero
-- policies (deny-all) since 0007. Without this, Sport Match™ silently breaks for exactly the
-- users this feature keeps logged in. Flagged explicitly in 0009's own migration comment as
-- deferred to this milestone.
--
-- Unlike the anon policy (`user_id is null` — anon has no identity to attribute to), an
-- authenticated insert must be attributed to the caller's own id, never left null and never
-- spoofable to someone else's id.

create policy "authenticated_insert_match_sessions" on match_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "authenticated_insert_match_results" on match_results
  for insert
  to authenticated
  with check (true); -- unchanged rationale from 0009: FK constraints already enforce validity
