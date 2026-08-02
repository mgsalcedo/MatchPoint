-- MatchPoint — migration 0005: organization_sports (7), venues (8), schedules (9),
-- organization_adn (10). Verbatim from docs/database-schema.md.

create table organization_sports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sport_id uuid not null references sports(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique(organization_id, sport_id)
);

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
