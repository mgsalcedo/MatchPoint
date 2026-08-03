-- MatchPoint — migration 0012: analytics_events (Milestone 6 / 005-analytics-funnel).
--
-- Durable storage for BR-027's funnel events. app/src/lib/analytics.ts's track()/setTracker()
-- mechanism already exists (console-only default sink); this table is the new sink's
-- destination, wired up in app/src/main.tsx via installSupabaseAnalyticsSink()
-- (app/src/lib/data/analyticsEvents.ts). See specs/005-analytics-funnel/research.md for
-- full rationale.
--
-- Design mirrors 0009/0011's match_sessions/match_results precedent: INSERT-only for BOTH anon
-- and authenticated roles, NO SELECT policy for any client role — the product owner queries this
-- table directly via the Supabase SQL Editor (dashboard/service-role context, bypasses RLS), per
-- this feature's explicit "no dashboard UI" decision. A visitor can go from anonymous to
-- logged-in mid-funnel, so both roles need insert access to this one new table.
--
-- Deliberately NO foreign keys on user_id/organization_id/match_session_id/lead_id. This table's
-- purpose is best-effort telemetry, not referential integrity: an FK violation (e.g. a race
-- between onAuthStateChange's fire-and-forget ensureUserRow() and an analytics write carrying
-- the same not-yet-committed user_id) must never cause event loss beyond what already happens
-- when Supabase itself is unreachable. Plain uuid columns also avoid needing ON DELETE handling
-- here once a User-deletion path (docs/security-standards.md, Peru Ley 29733) exists.
--
-- event_name's values match app/src/lib/analytics.ts's AnalyticsEvent["name"] union VERBATIM —
-- no translation table (same discipline as ContactType/LeadSource, 004-auth-lead-creation).
-- Includes all 11 currently-defined events (BR-027's required 9, plus the 2 pre-existing extras
-- no_match_viewed/login_started) — cheap to store and useful for diagnosing e.g. abandoned OAuth
-- (login_started with no matching login_completed), even though only 9 are FR-001's requirement.

create type analytics_event_name as enum (
  'app_opened',
  'match_started',
  'sport_match_completed',
  'results_viewed',
  'no_match_viewed',
  'profile_opened',
  'contact_clicked',
  'login_started',
  'login_completed',
  'lead_created',
  'external_contact_opened'
);

create table analytics_events (
  id uuid primary key default gen_random_uuid(), -- DB-generated is fine here: nothing ever reads
                                                    -- this id back (unlike match_results/leads,
                                                    -- which needed client ids for a downstream FK).
  visit_id uuid not null,        -- client-generated per browser-tab visit (lib/visitId.ts). NOT
                                  -- match_sessions.anonymous_id — that column stays unused by
                                  -- design (research.md R2/R3).
  user_id uuid,                  -- no FK (see comment above); null for anon-role writes and for
                                  -- any authenticated write that chooses not to attach it.
  event_name analytics_event_name not null,

  sport text,                    -- raw app-level Sport value (e.g. "running"), not a sport_id
                                  -- lookup — avoids an extra network round trip on a
                                  -- must-never-block write path. District-level only, per
                                  -- docs/security-standards.md.
  district text,                 -- raw district name, same rationale as `sport`.
  match_session_id uuid,         -- no FK.
  result_count integer,
  organization_id uuid,          -- no FK.
  contact_type contact_type,     -- reuses the existing enum type (0001) — shared vocabulary.
  result_rank integer,
  lead_id uuid,                  -- no FK.
  login_provider text,           -- "google" | "apple" — plain text, matching users.auth_provider's
                                  -- own convention (also plain text, not an enum).

  created_at timestamptz not null default now()
);

create index idx_analytics_events_visit on analytics_events(visit_id);
create index idx_analytics_events_name_created on analytics_events(event_name, created_at);
create index idx_analytics_events_user on analytics_events(user_id) where user_id is not null;

alter table analytics_events enable row level security;

-- Anon: no identity to attribute to; user_id must be null (mirrors 0009's match_sessions policy
-- — `with check (user_id is null)` closes the same impersonation gap 0009 already documented).
create policy "anon_insert_analytics_events" on analytics_events
  for insert
  to anon
  with check (user_id is null);

-- Authenticated: user_id, when set, must be the caller's own id — never spoofable to someone
-- else's (mirrors 0011's anti-spoofing pattern) — but may also be left null. Unlike
-- match_sessions (where user_id is the primary correlation key), this table's primary
-- correlation key is visit_id; user_id is a best-effort enrichment, not load-bearing, so
-- permitting null here (rather than forcing every authenticated write to resolve it) keeps the
-- write path simpler and avoids adding a hard dependency on session lookup succeeding.
create policy "authenticated_insert_analytics_events" on analytics_events
  for insert
  to authenticated
  with check (user_id is null or user_id = auth.uid());

-- No SELECT policy for anon or authenticated — admin/SQL-Editor-only reads (mirrors 0009).
