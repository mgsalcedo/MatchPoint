-- MatchPoint — migration 0008: centralize the organization-visibility predicate.
--
-- Code-review finding: the "is_active AND profile_status NOT IN (suspended,archived,rejected)"
-- exclusion was hand-duplicated across 5 separate RLS policies in 0007_rls_policies.sql, with
-- no shared source of truth. If BR-008's exclusion list ever changes, an author editing only
-- some of the 5 policies would silently leave a child table (venues/schedules/organization_sports/
-- organization_adn) publicly readable for an org that should be hidden — a real data leak with
-- nothing to catch the drift. This introduces one function the 4 child-table policies call
-- instead of repeating the EXISTS subquery.
--
-- The `organizations` table's own policy (0007) is left as the standalone, canonical definition:
-- a policy on `organizations` calling a function that re-queries `organizations` risks RLS
-- self-recursion, so it is not routed through this function. Every OTHER table's visibility now
-- has exactly one place to edit.

create or replace function is_organization_visible(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from organizations o
    where o.id = org_id
      and o.is_active = true
      and o.profile_status not in ('suspended', 'archived', 'rejected')
  );
$$;

drop policy if exists "public_read_organization_sports" on organization_sports;
create policy "public_read_organization_sports" on organization_sports
  for select using (is_organization_visible(organization_id));

drop policy if exists "public_read_venues" on venues;
create policy "public_read_venues" on venues
  for select using (is_active = true and is_organization_visible(organization_id));

drop policy if exists "public_read_schedules" on schedules;
create policy "public_read_schedules" on schedules
  for select using (is_active = true and is_organization_visible(organization_id));

drop policy if exists "public_read_organization_adn" on organization_adn;
create policy "public_read_organization_adn" on organization_adn
  for select using (is_organization_visible(organization_id));
