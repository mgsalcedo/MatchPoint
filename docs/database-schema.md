# Database Schema — MatchPoint

Living document. Recommended physical schema for Supabase/PostgreSQL — the starting point for migrations. Reconciled 2026-07-03 (Fase 2 · Ingeniería) against `docs/data-model.md`.

**Divergence from the originally imported pack:** the source schema included a `lead_status` enum and `status`/`external_url_opened` columns on `leads`. Both are omitted here — see `docs/data-model.md`'s divergence note: `Lead` is a deliberately immutable single event, not a workflow, per an explicit product-owner decision. If "was the link opened" needs tracking later, add an analytics event or an append-only log table, not a mutable column on `leads`.

Assumed stack: PWA frontend, Supabase PostgreSQL, Google/Apple authentication, Row Level Security, server actions or API routes.

## Extensions

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

## Enums

```sql
create type organization_type as enum (
  'running_team',
  'trail_team',
  'cycling_club',
  'swimming_academy',
  'triathlon_club',
  'training_center',
  'gym',
  'coach_independent',
  'federation',
  'event_organizer',
  'sports_community',
  'academy',
  'other'
);

create type profile_status as enum (
  'preloaded',
  'claimed',
  'verified',
  'rejected',
  'suspended',
  'archived'
);

create type user_level as enum (
  'never_practiced',
  'beginner',
  'intermediate',
  'advanced'
);

create type budget_range as enum (
  'free',
  'up_to_100',
  '100_200',
  '200_300',
  'more_than_300',
  'not_sure'
);

create type match_goal as enum (
  'start_sport',
  'prepare_race',
  'improve_performance',
  'stay_active',
  'lose_weight',
  'meet_people',
  'other'
);

create type match_environment as enum (
  'competitive',
  'social',
  'recreational',
  'family',
  'high_performance',
  'inclusive'
);

create type match_label as enum (
  'excellent_match',
  'very_good_match',
  'good_match',
  'possible_match',
  'weak_match'
);

create type contact_type as enum (
  'whatsapp',
  'instagram',
  'booking',
  'call',
  'form'
);

create type lead_source as enum (
  'result_card',
  'organization_profile',
  'event_profile',
  'direct_search',
  'admin_test'
);

create type claim_status as enum (
  'pending',
  'approved',
  'rejected',
  'needs_more_info'
);

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
```

## Tables

### users

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null,
  auth_provider_id text not null,
  name text,
  email text,
  avatar_url text,
  phone text,
  home_district_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(auth_provider, auth_provider_id),
  unique(email)
);
```

### sports

```sql
create table sports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

Seed:

```sql
insert into sports (name, slug) values
('Running', 'running'),
('Trail Running', 'trail-running'),
('Ciclismo', 'ciclismo'),
('Natación', 'natacion'),
('Triatlón', 'triatlon'),
('Centro de Entrenamiento', 'centro-entrenamiento');
```

### districts

```sql
create table districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text not null,
  region text not null default 'Lima',
  latitude numeric,
  longitude numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(name, province)
);
```

### organizations

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  organization_type organization_type not null,
  description text,
  short_description text,
  logo_url text,
  cover_image_url text,
  instagram_url text,
  whatsapp_number text,
  website_url text,
  booking_url text,
  profile_status profile_status not null default 'preloaded',
  completeness_score integer not null default 0 check (completeness_score >= 0 and completeness_score <= 100),
  last_verified_at timestamptz,
  last_updated_by_org_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_status on organizations(profile_status);
create index idx_organizations_type on organizations(organization_type);
create index idx_organizations_active on organizations(is_active);
```

### organization_sports

```sql
create table organization_sports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sport_id uuid not null references sports(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(organization_id, sport_id)
);
```

### venues

```sql
create table venues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  district_id uuid not null references districts(id),
  address text,
  reference text,
  latitude numeric,
  longitude numeric,
  has_parking boolean,
  has_showers boolean,
  has_lockers boolean,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_venues_org on venues(organization_id);
create index idx_venues_district on venues(district_id);
```

### schedules

```sql
create table schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  venue_id uuid references venues(id) on delete set null,
  sport_id uuid not null references sports(id),
  day_of_week integer not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time,
  session_name text,
  level_min user_level,
  level_max user_level,
  intensity text,
  capacity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_schedules_org on schedules(organization_id);
create index idx_schedules_sport on schedules(sport_id);
create index idx_schedules_day_time on schedules(day_of_week, start_time);
```

### organization_adn

```sql
create table organization_adn (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  beginner_friendly integer check (beginner_friendly between 1 and 5),
  competitiveness integer check (competitiveness between 1 and 5),
  social_atmosphere integer check (social_atmosphere between 1 and 5),
  training_intensity_score integer check (training_intensity_score between 1 and 5),
  performance_focus integer check (performance_focus between 1 and 5),
  inclusiveness integer check (inclusiveness between 1 and 5),
  family_friendly integer check (family_friendly between 1 and 5),
  group_size text check (group_size in ('small', 'medium', 'large')),
  coach_involvement integer check (coach_involvement between 1 and 5),
  event_frequency integer check (event_frequency between 1 and 5),
  culture_tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### match_sessions

```sql
create table match_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  anonymous_id text,
  goal match_goal not null,
  sport_id uuid not null references sports(id),
  district_id uuid not null references districts(id),
  available_days integer[] not null,
  preferred_times text[] not null,
  level user_level not null,
  budget budget_range not null,
  environment match_environment not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### match_results

```sql
create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_session_id uuid not null references match_sessions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  label match_label not null,
  rank integer not null,
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(match_session_id, organization_id),
  unique(match_session_id, rank)
);
```

### leads

`leads` is intentionally append-only: no `status` column, no update path. See the divergence note at the top of this document.

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  match_session_id uuid references match_sessions(id) on delete set null,
  match_result_id uuid references match_results(id) on delete set null,
  contact_type contact_type not null,
  source lead_source not null,
  sport_id uuid references sports(id),
  goal text,
  district_id uuid references districts(id),
  result_rank integer,
  created_at timestamptz not null default now()
);

create index idx_leads_user on leads(user_id);
create index idx_leads_org on leads(organization_id);
create index idx_leads_created_at on leads(created_at);
```

### profile_claims

```sql
create table profile_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  requester_role text,
  evidence_url text,
  message text,
  status claim_status not null default 'pending',
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
```

### analytics_events

`analytics_events` (`005-analytics-funnel`, migration `0012`) is durable storage for BR-027's funnel events — `app/src/lib/analytics.ts`'s `track()` writes here via `installSupabaseAnalyticsSink()`. Deliberately **no foreign keys** on `user_id`/`organization_id`/`match_session_id`/`lead_id`: this table is best-effort telemetry, not a referentially-integral record — an FK violation must never turn a should-never-fail write into a failing one (e.g. a race between `onAuthStateChange`'s fire-and-forget `ensureUserRow()` and an analytics write carrying the same not-yet-committed `user_id`), and plain columns avoid needing `ON DELETE` handling once a User-deletion path exists. No `jsonb` payload column either — narrow, explicitly-typed nullable columns per field, matching the PII/location allow-list already applied to every other logged/analytics payload in this project. `sport`/`district` go further still: unlike `match_sessions`/`leads`, they're not even `sport_id`/`district_id` lookups — plain denormalized text, to avoid an extra network round trip on a write path that must never block (research.md R5/R6).

**Future obligation, not yet actionable**: because `user_id` has no FK here, deleting a `users` row will **not** cascade into or null out matching `analytics_events` rows the way it does for `leads`/`match_sessions` — those rows would silently retain a now-orphaned `user_id`. Whoever eventually builds the account-deletion path (`docs/security-standards.md`'s pre-launch gap, first flagged in `004-auth-lead-creation`'s security audit) must explicitly include `analytics_events` in that purge; it will not be caught by an FK-cascade-only approach. Not actioned here — no deletion path exists yet to integrate with.

```sql
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null,
  user_id uuid,
  event_name analytics_event_name not null,

  sport text,
  district text,
  match_session_id uuid,
  result_count integer,
  organization_id uuid,
  contact_type contact_type,
  result_rank integer,
  lead_id uuid,
  login_provider text,

  created_at timestamptz not null default now()
);

create index idx_analytics_events_visit on analytics_events(visit_id);
create index idx_analytics_events_name_created on analytics_events(event_name, created_at);
create index idx_analytics_events_user on analytics_events(user_id) where user_id is not null;
```

## RLS notes

- Public can read active organizations, sports, districts, venues, schedules, ADN.
- Only authenticated users can create leads.
- Users can read their own leads.
- Admin can manage all data.
- Organization editing comes after profile claim approval.
- Anonymous (`anon` role) clients may INSERT their own `match_sessions`/`match_results` rows (`user_id` must be null); there is no SELECT policy for either table — the client never reads a row back after writing it (migration `0009`, feature `002-sport-match-engine`).
- `users`: authenticated users may insert/update/select only their own row (`id = auth.uid()`); no anon access. `id` is always the Supabase Auth user's own id, never the column's `gen_random_uuid()` default (migration `0010`, feature `004-auth-lead-creation`).
- Authenticated (`authenticated` role) clients may also INSERT their own `match_sessions`/`match_results` rows (`user_id = auth.uid()` for sessions), mirroring the anon policies above — needed once login persists across reloads, so a returning logged-in user's Sport Match™ session still writes correctly (migration `0011`, feature `004-auth-lead-creation`).
- `analytics_events`: both `anon` and `authenticated` clients may INSERT (a visitor can go from anonymous to logged-in mid-funnel); `anon` writes must have `user_id is null`, `authenticated` writes must have `user_id is null or user_id = auth.uid()` (never spoofable). No SELECT policy for any client role — the product owner queries this table directly via the Supabase SQL Editor, per `docs/analytics-queries.md` (migration `0012`, feature `005-analytics-funnel`).

## Migration order

1. Extensions.
2. Enums.
3. Districts.
4. Sports.
5. Users.
6. Organizations.
7. Organization sports.
8. Venues.
9. Schedules.
10. ADN.
11. Match sessions.
12. Match results.
13. Leads.
14. Profile claims.
15. RLS policies.
16. Seed data.
17. Analytics events (migration `0012`, feature `005-analytics-funnel`).
