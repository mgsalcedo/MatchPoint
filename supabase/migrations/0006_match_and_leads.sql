-- MatchPoint — migration 0006: match_sessions (11), match_results (12), leads (13),
-- profile_claims (14). Created for schema parity (FR-006); not written this milestone.
--
-- ⚠ leads is intentionally append-only: NO status column, no mutable/lifecycle field.
-- This is the immutable-Lead rule (docs/data-model.md divergence note). Do not add a
-- status/opened column here — that reopens a settled product decision.

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
