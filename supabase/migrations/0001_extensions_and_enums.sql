-- MatchPoint — migration 0001: extensions + enums
-- Applies steps 1-2 of docs/database-schema.md's migration order, verbatim.
-- Run order: 0001 → 0002 → ... → 0007. See docs/runbooks/data-foundation-setup.md.

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums
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
