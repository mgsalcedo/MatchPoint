-- MatchPoint — migration 0007: Row Level Security (step 15).
-- Public anonymous read on the discovery tables (active + not suspended/archived/rejected);
-- lead insert restricted to authenticated users. Reference: docs/database-schema.md "RLS notes",
-- backend plan §3, research.md R2 (rejected also excluded). RLS is the security boundary — the
-- data-access layer adds the same filters for readability/testability, not instead of this.

-- Enable RLS on every table (required even for public-read tables — RLS-on with no policy = deny-all).
alter table districts enable row level security;
alter table sports enable row level security;
alter table organizations enable row level security;
alter table organization_sports enable row level security;
alter table venues enable row level security;
alter table schedules enable row level security;
alter table organization_adn enable row level security;
alter table users enable row level security;
alter table match_sessions enable row level security;
alter table match_results enable row level security;
alter table leads enable row level security;
alter table profile_claims enable row level security;

-- Reference data: public read of active rows.
create policy "public_read_districts" on districts
  for select using (is_active = true);

create policy "public_read_sports" on sports
  for select using (is_active = true);

-- Organizations: active AND not suspended/archived/rejected (BR-008 + research.md R2).
create policy "public_read_organizations" on organizations
  for select using (
    is_active = true
    and profile_status not in ('suspended', 'archived', 'rejected')
  );

-- Child tables: visible only through a visible parent organization.
create policy "public_read_organization_sports" on organization_sports
  for select using (
    exists (
      select 1 from organizations o
      where o.id = organization_sports.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived', 'rejected')
    )
  );

create policy "public_read_venues" on venues
  for select using (
    is_active = true
    and exists (
      select 1 from organizations o
      where o.id = venues.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived', 'rejected')
    )
  );

create policy "public_read_schedules" on schedules
  for select using (
    is_active = true
    and exists (
      select 1 from organizations o
      where o.id = schedules.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived', 'rejected')
    )
  );

create policy "public_read_organization_adn" on organization_adn
  for select using (
    exists (
      select 1 from organizations o
      where o.id = organization_adn.organization_id
        and o.is_active = true
        and o.profile_status not in ('suspended', 'archived', 'rejected')
    )
  );

-- Leads: authenticated users may insert their own and read their own.
-- Not exercised this milestone (no write path shipped yet) but correct now (FR-008).
create policy "authenticated_insert_leads" on leads
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users_read_own_leads" on leads
  for select
  to authenticated
  using (user_id = auth.uid());

-- users / match_sessions / match_results / profile_claims: RLS enabled, no policy = deny-all.
-- Nothing reads/writes them this milestone. Do NOT add a public policy — that is scope creep.
