/**
 * Supabase row shapes (snake_case) mirroring docs/database-schema.md.
 * These are the raw DB rows the query returns; mappers.ts translates them into the
 * app's camelCase `Organization` shape (app/src/types.ts). Kept separate so the mapper
 * is a pure function with no Supabase import and can be unit-tested against fixtures.
 *
 * Only the columns read this milestone are typed here (organization discovery).
 */

export type DbOrganizationType =
  | "running_team"
  | "trail_team"
  | "cycling_club"
  | "swimming_academy"
  | "triathlon_club"
  | "training_center"
  | "gym"
  | "coach_independent"
  | "federation"
  | "event_organizer"
  | "sports_community"
  | "academy"
  | "other";

export type DbProfileStatus =
  | "preloaded"
  | "claimed"
  | "verified"
  | "rejected"
  | "suspended"
  | "archived";

export type DbUserLevel = "never_practiced" | "beginner" | "intermediate" | "advanced";

// 002-sport-match-engine: vocabularies for writing match_sessions/match_results.
export type DbMatchGoal =
  | "start_sport"
  | "prepare_race"
  | "improve_performance"
  | "stay_active"
  | "lose_weight"
  | "meet_people"
  | "other";

export type DbBudgetRange = "free" | "up_to_100" | "100_200" | "200_300" | "more_than_300" | "not_sure";

export type DbMatchEnvironment =
  | "competitive"
  | "social"
  | "recreational"
  | "family"
  | "high_performance"
  | "inclusive";

export type DbMatchLabel =
  | "excellent_match"
  | "very_good_match"
  | "good_match"
  | "possible_match"
  | "weak_match";

// 004-auth-lead-creation: vocabularies for writing leads.
export type DbContactType = "whatsapp" | "instagram" | "booking" | "call" | "form";

export type DbLeadSource =
  | "result_card"
  | "organization_profile"
  | "event_profile"
  | "direct_search"
  | "admin_test";

export interface DbSportRow {
  id: string;
  name: string;
  slug: string;
}

export interface DbDistrictRow {
  id: string;
  name: string;
}

export interface DbVenueRow {
  id: string;
  name: string;
  district: DbDistrictRow | null;
}

export interface DbScheduleRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string | null;
  session_name: string | null;
  level_min: DbUserLevel | null;
  level_max: DbUserLevel | null;
  venue_id: string | null;
  sport_id: string | null;
}

export interface DbAdnRow {
  beginner_friendly: number | null;
  competitiveness: number | null;
  social_atmosphere: number | null;
  training_intensity_score: number | null;
  performance_focus: number | null;
  inclusiveness: number | null;
  family_friendly: number | null;
  group_size: "small" | "medium" | "large" | null;
  coach_involvement: number | null;
  event_frequency: number | null;
  culture_tags: string[] | null;
}

/** One organization row with its joined child rows, as returned by the discovery query. */
export interface DbOrganizationRow {
  id: string;
  name: string;
  slug: string;
  organization_type: DbOrganizationType;
  description: string | null;
  short_description: string | null;
  instagram_url: string | null;
  whatsapp_number: string | null;
  booking_url: string | null;
  website_url: string | null;
  profile_status: DbProfileStatus;
  organization_sports: { sport: DbSportRow | null }[];
  venues: DbVenueRow[];
  schedules: DbScheduleRow[];
  // organization_adn is a one-to-one; Supabase returns it as an object (or null).
  organization_adn: DbAdnRow | null;
}
