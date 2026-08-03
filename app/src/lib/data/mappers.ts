/**
 * Pure row → app-model mapping. NO Supabase import here — this file is unit-tested
 * against fixture objects (mappers.test.ts), per constitution Principle III / base-standards
 * ("pure domain logic isolated from framework/IO code").
 *
 * Translates the DB's English snake_case rows (docs/database-schema.md) into the app's
 * existing camelCase `Organization` shape (app/src/types.ts) so a later UI swap (Milestone 3)
 * needs no component-contract changes (FR-011 / SC-006).
 */

import type {
  AdnDeportivo,
  Environment,
  Level,
  Organization,
  OrgType,
  Schedule,
  Sport,
  Weekday,
} from "../../types";
import type {
  DbAdnRow,
  DbOrganizationRow,
  DbOrganizationType,
  DbProfileStatus,
  DbScheduleRow,
  DbUserLevel,
} from "./types";

// --- Enum translation tables (centralized; one place per vocabulary) ---

const ORG_TYPE_MAP: Record<DbOrganizationType, OrgType> = {
  running_team: "team",
  trail_team: "team",
  cycling_club: "club",
  swimming_academy: "academy",
  triathlon_club: "club",
  training_center: "training_center",
  gym: "gym",
  coach_independent: "coach",
  federation: "federation",
  event_organizer: "event_organizer",
  sports_community: "community",
  academy: "academy",
  other: "other",
};

// DB sport slug (kebab) → app Sport. Slugs not in this map are dropped from the sports list.
const SPORT_SLUG_MAP: Record<string, Sport> = {
  running: "running",
  "trail-running": "trail",
  ciclismo: "ciclismo",
  natacion: "natacion",
  triatlon: "triatlon",
  "centro-entrenamiento": "centro_entrenamiento",
};

const LEVEL_MAP: Record<DbUserLevel, Level> = {
  never_practiced: "nunca_practique",
  beginner: "principiante",
  intermediate: "intermedio",
  advanced: "avanzado",
};

// DB `day_of_week` is ISO 8601: 1 = Monday … 7 = Sunday (research.md R3).
const DAY_OF_WEEK_MAP: Record<number, Weekday> = {
  1: "lun",
  2: "mar",
  3: "mie",
  4: "jue",
  5: "vie",
  6: "sab",
  7: "dom",
};

// suspended/archived/rejected are filtered out before mapping (RLS + query), so in practice the
// mapper only sees preloaded/claimed/verified. Fallbacks are defensive, not expected paths.
const PROFILE_STATUS_MAP: Record<DbProfileStatus, Organization["profileStatus"]> = {
  preloaded: "preloaded",
  claimed: "claimed",
  verified: "verified",
  suspended: "suspended",
  rejected: "suspended",
  archived: "suspended",
};

export function mapOrganizationType(dbType: DbOrganizationType): OrgType {
  return ORG_TYPE_MAP[dbType] ?? "other";
}

export function mapSportSlug(slug: string): Sport | null {
  return SPORT_SLUG_MAP[slug] ?? null;
}

export function mapUserLevel(level: DbUserLevel): Level {
  return LEVEL_MAP[level];
}

export function mapDayOfWeek(day: number): Weekday {
  const mapped = DAY_OF_WEEK_MAP[day];
  if (!mapped) throw new Error(`Invalid day_of_week ${day} (expected 1-7, ISO Monday=1)`);
  return mapped;
}

export function mapProfileStatus(status: DbProfileStatus): Organization["profileStatus"] {
  return PROFILE_STATUS_MAP[status] ?? "suspended";
}

// --- Reverse (app → DB) lookups for 002-sport-match-engine's session-write path. Derived from
// the tables above rather than duplicated, so there is one source of truth per vocabulary
// (docs/base-standards.md's no-duplicate-domain-logic rule). ---

export function mapSportToSlug(sport: Sport): string | null {
  return Object.entries(SPORT_SLUG_MAP).find(([, s]) => s === sport)?.[0] ?? null;
}

export function mapLevelToDb(level: Level): DbUserLevel {
  const found = Object.entries(LEVEL_MAP).find(([, l]) => l === level)?.[0];
  if (!found) throw new Error(`No DB user_level mapping for app Level "${level}"`);
  return found as DbUserLevel;
}

export function mapWeekdayToDayOfWeek(day: Weekday): number {
  const found = Object.entries(DAY_OF_WEEK_MAP).find(([, w]) => w === day)?.[0];
  if (!found) throw new Error(`No day_of_week mapping for app Weekday "${day}"`);
  return Number(found);
}

// DB ADN scores are 1-5 Likert; the app/mock and matching.ts use a 0-1 scale. Normalize
// (1→0 … 5→1) so the eventual matching rewire (Milestone 3) keeps its 0-1 assumptions.
// Null → 0 (safe default; not fabricated — absence maps to "no signal"). Flagged in research.md.
function normalizeScore(n: number | null): number {
  if (n == null) return 0;
  return (n - 1) / 4;
}

// The app's AdnDeportivo has an `environments: Environment[]`; the DB stores individual 1-5
// scores instead. Derive the environment tags from those scores via documented thresholds
// (score >= 4 of 5). This computes from real stored signal — it does not fabricate (BR-016).
function deriveEnvironments(adn: DbAdnRow): Environment[] {
  const envs: Environment[] = [];
  if ((adn.competitiveness ?? 0) >= 4) envs.push("competitivo");
  if ((adn.social_atmosphere ?? 0) >= 4) envs.push("social");
  if ((adn.family_friendly ?? 0) >= 4) envs.push("familiar");
  if ((adn.performance_focus ?? 0) >= 4) envs.push("alto_rendimiento");
  if ((adn.inclusiveness ?? 0) >= 4) envs.push("inclusivo");
  if (envs.length === 0) envs.push("recreativo");
  return envs;
}

function mapAdn(adn: DbAdnRow | null): AdnDeportivo {
  if (!adn) {
    return {
      beginnerFriendliness: 0,
      competitiveness: 0,
      socialAtmosphere: 0,
      trainingIntensity: 0,
      performanceFocus: 0,
      inclusiveness: 0,
      environments: ["recreativo"],
    };
  }
  return {
    beginnerFriendliness: normalizeScore(adn.beginner_friendly),
    competitiveness: normalizeScore(adn.competitiveness),
    socialAtmosphere: normalizeScore(adn.social_atmosphere),
    trainingIntensity: normalizeScore(adn.training_intensity_score),
    performanceFocus: normalizeScore(adn.performance_focus),
    inclusiveness: normalizeScore(adn.inclusiveness),
    environments: deriveEnvironments(adn),
  };
}

function toHhMm(time: string): string {
  // DB `time` serializes as "HH:MM:SS"; the app uses "HH:MM".
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function mapSchedule(s: DbScheduleRow): Schedule {
  // No fabricated defaults (BR-016): a missing end_time or level_min stays undefined rather
  // than guessing a value (e.g. "principiante") the source data never confirmed.
  return {
    day: mapDayOfWeek(s.day_of_week),
    startTime: toHhMm(s.start_time),
    endTime: s.end_time ? toHhMm(s.end_time) : undefined,
    sessionType: s.session_name ?? "",
    level: s.level_min ? mapUserLevel(s.level_min) : undefined,
  };
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** Map one joined organization row to the app's `Organization` shape. */
export function mapOrganizationRow(row: DbOrganizationRow): Organization {
  const sports = row.organization_sports
    .map((os) => (os.sport ? mapSportSlug(os.sport.slug) : null))
    .filter((s): s is Sport => s !== null);

  const districts = dedupe(
    row.venues
      .map((v) => v.district?.name)
      .filter((n): n is string => Boolean(n))
  );

  return {
    id: row.id,
    name: row.name,
    type: mapOrganizationType(row.organization_type),
    sports,
    description: row.description ?? row.short_description ?? "",
    districts,
    schedules: row.schedules.map(mapSchedule),
    // No column exists in docs/database-schema.md for these — safe defaults, not fabricated
    // (research.md R5). priceRange stays "no_confirmado", trialClass false, services empty, no coach.
    priceRange: "no_confirmado",
    trialClassAvailable: false,
    whatsapp: row.whatsapp_number ?? undefined,
    instagram: row.instagram_url ?? undefined,
    bookingLink: row.booking_url ?? undefined,
    website: row.website_url ?? undefined,
    adnDeportivo: mapAdn(row.organization_adn),
    services: [],
    coach: undefined,
    profileStatus: mapProfileStatus(row.profile_status),
    // Surfaced by 007-visual-identity-system — the columns existed in the schema and were
    // already documented, only the app layer never read them (data-model.md).
    logoUrl: row.logo_url ?? undefined,
    coverImageUrl: row.cover_image_url ?? undefined,
  };
}
