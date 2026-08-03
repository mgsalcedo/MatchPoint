# Analytics Queries — Weekly Funnel Metrics

Living document (Milestone 6 · `005-analytics-funnel`). Run these directly in the Supabase SQL Editor (admin/service-role context — `analytics_events` has no SELECT policy for any client role, by design; see `docs/database-schema.md`).

Prerequisite: migration `0012_analytics_events.sql` applied, and at least one funnel walkthrough's worth of events recorded.

Every query defaults to "the current week"; change the `date_trunc`/`between` bounds to any date range you want.

## 1. Sport Match™ completion rate

```sql
select
  date_trunc('week', created_at) as week,
  count(distinct visit_id) filter (where event_name = 'match_started') as started,
  count(distinct visit_id) filter (where event_name = 'sport_match_completed') as completed,
  round(
    100.0 * count(distinct visit_id) filter (where event_name = 'sport_match_completed')
    / nullif(count(distinct visit_id) filter (where event_name = 'match_started'), 0),
    1
  ) as completion_rate_pct
from analytics_events
where event_name in ('match_started', 'sport_match_completed')
group by 1
order by 1 desc;
```

PMV validation target (roadmap.md): 60%+.

## 2. Results → profile click-through rate

```sql
select
  date_trunc('week', created_at) as week,
  count(distinct visit_id) filter (where event_name = 'results_viewed') as viewed_results,
  count(distinct visit_id) filter (where event_name = 'profile_opened') as opened_profile,
  round(
    100.0 * count(distinct visit_id) filter (where event_name = 'profile_opened')
    / nullif(count(distinct visit_id) filter (where event_name = 'results_viewed'), 0),
    1
  ) as ctr_pct
from analytics_events
where event_name in ('results_viewed', 'profile_opened')
group by 1
order by 1 desc;
```

PMV validation target: 25%+.

## 3. Profile → contact click-through rate

**Important**: joins on `(visit_id, organization_id)` together, not `visit_id` alone — a visitor who opens two different profiles in one visit and contacts only one of them would be overcounted by a `visit_id`-only join (research.md R10).

```sql
with profile_opens as (
  select distinct visit_id, organization_id, date_trunc('week', created_at) as week
  from analytics_events
  where event_name = 'profile_opened'
),
contacts as (
  select distinct visit_id, organization_id
  from analytics_events
  where event_name = 'contact_clicked'
)
select
  p.week,
  count(*) as opened_profile,
  count(*) filter (where c.visit_id is not null) as clicked_contact,
  round(
    100.0 * count(*) filter (where c.visit_id is not null) / nullif(count(*), 0),
    1
  ) as ctr_pct
from profile_opens p
left join contacts c on c.visit_id = p.visit_id and c.organization_id = p.organization_id
group by 1
order by 1 desc;
```

PMV validation target: 10%+.

## 4. Leads / contacts generated

Two equivalent sources — pick one as canonical per analysis to avoid the two drifting apart (research.md §7):

```sql
-- From analytics_events (matches the funnel-event view used above)
select date_trunc('week', created_at) as week, count(*) as leads_created
from analytics_events
where event_name = 'lead_created'
group by 1
order by 1 desc;
```

```sql
-- From leads directly (the authoritative, immutable North Star table)
select date_trunc('week', created_at) as week, count(*) as leads_created
from leads
group by 1
order by 1 desc;
```

PMV validation target: 100+ contacts during the validation period.

## 5. Step-by-step drop-off

Hardcodes BR-027's canonical 9-step order (this schema deliberately has no `order` column, to avoid duplicating and drifting from BR-027's own list — research.md R10).

```sql
with steps as (
  select * from (values
    ('app_opened', 1),
    ('match_started', 2),
    ('sport_match_completed', 3),
    ('results_viewed', 4),
    ('profile_opened', 5),
    ('contact_clicked', 6),
    ('login_completed', 7),
    ('lead_created', 8),
    ('external_contact_opened', 9)
  ) as t(event_name, step_order)
)
select
  s.step_order,
  s.event_name,
  count(distinct e.visit_id) as visitors_reached
from steps s
left join analytics_events e on e.event_name = s.event_name
group by 1, 2
order by 1;
```

Read this as a funnel: each row's `visitors_reached` should be less than or equal to the row above it. A big drop between two adjacent steps is the stage to investigate first.

## Notes

- All queries operate on `visit_id` (per-visit correlation, not unique-visitor-over-time) — repeat visits within a sitting are not deduplicated, by design (spec.md Edge Cases).
- `analytics_events` has no foreign keys (research.md R5) — `organization_id`/`lead_id`/etc. are best-effort, not referentially guaranteed. For authoritative Lead counts, prefer query 4's `leads`-table variant.
- No dashboard UI exists for these — this file is the deliverable, run manually as needed (owner decision, `005-analytics-funnel` spec Assumptions).
