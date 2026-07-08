-- MatchPoint — migration 0004: users (step 5) + organizations (step 6), verbatim from
-- docs/database-schema.md. users is created for schema parity (FR-006); not written this milestone.

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
