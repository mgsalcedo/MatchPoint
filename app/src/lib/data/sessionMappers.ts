/**
 * Pure app-model → DB-row mapping for writing match_sessions/match_results. NO Supabase
 * import here (mirrors mappers.ts's discipline — unit-testable against fixtures).
 *
 * Owns the vocabulary translations genuinely new to this feature (goal/budget/environment/
 * label/time-of-day). The reverse sport/level/weekday lookups already live in mappers.ts,
 * next to the tables they're derived from (research.md R4) — imported here, not duplicated.
 */

import type { Budget, Environment, Goal, MatchLabel, MatchResult, SportMatchAnswers, TimeOfDay } from "../../types";
import { mapLevelToDb, mapWeekdayToDayOfWeek } from "./mappers";
import type { DbBudgetRange, DbMatchEnvironment, DbMatchGoal, DbMatchLabel } from "./types";

// Exported (not module-private) so leadMappers.ts (004-auth-lead-creation) reuses this same
// vocabulary for leads.goal instead of duplicating it — one shared Spanish→English goal
// mapping, not a second copy (research.md §6.1's no-duplicate-domain-logic rule).
export const GOAL_MAP: Record<Goal, DbMatchGoal> = {
  empezar: "start_sport",
  preparar_carrera: "prepare_race",
  mejorar_rendimiento: "improve_performance",
  mantenerme_activo: "stay_active",
  bajar_peso: "lose_weight",
  conocer_gente: "meet_people",
  otro: "other",
};

const BUDGET_MAP: Record<Budget, DbBudgetRange> = {
  gratis: "free",
  hasta_100: "up_to_100",
  "100_200": "100_200",
  "200_300": "200_300",
  mas_300: "more_than_300",
  no_seguro: "not_sure",
};

const ENVIRONMENT_MAP: Record<Environment, DbMatchEnvironment> = {
  competitivo: "competitive",
  social: "social",
  recreativo: "recreational",
  familiar: "family",
  alto_rendimiento: "high_performance",
  inclusivo: "inclusive",
};

const LABEL_MAP: Record<MatchLabel, DbMatchLabel> = {
  "Excellent Match": "excellent_match",
  "Very Good Match": "very_good_match",
  "Good Match": "good_match",
  "Possible Match": "possible_match",
  "Weak Match": "weak_match",
};

// preferred_times is a free-form text[] column (no DB enum), translated to English tokens
// anyway for consistency with every other stored vocabulary.
const TIME_OF_DAY_MAP: Record<TimeOfDay, string> = { manana: "morning", tarde: "afternoon", noche: "night" };

// anonymous_id is deliberately omitted (stays DB-null) — nothing reads it yet (no session-resume
// or cross-session correlation feature exists). See research.md R9 before adding it back.
export interface MatchSessionInsertRow {
  id: string;
  user_id: string | null;
  goal: DbMatchGoal;
  sport_id: string;
  district_id: string;
  available_days: number[];
  preferred_times: string[];
  level: ReturnType<typeof mapLevelToDb>;
  budget: DbBudgetRange;
  environment: DbMatchEnvironment;
}

export function buildMatchSessionRow(
  id: string,
  answers: SportMatchAnswers,
  sportId: string,
  districtId: string,
  userId?: string | null
): MatchSessionInsertRow {
  return {
    id,
    // Anonymous by default (RLS: migration 0009). If the user is already logged in when the
    // session is created, attribute it to them (migration 0011, research.md R4) — this does
    // NOT retroactively link a session created earlier while anonymous; that stays out of scope.
    user_id: userId ?? null,
    goal: GOAL_MAP[answers.goal],
    sport_id: sportId,
    district_id: districtId,
    available_days: [...answers.days].map(mapWeekdayToDayOfWeek).sort((a, b) => a - b),
    preferred_times: [TIME_OF_DAY_MAP[answers.time]],
    level: mapLevelToDb(answers.level),
    budget: BUDGET_MAP[answers.budget],
    environment: ENVIRONMENT_MAP[answers.environment],
  };
}

export interface MatchResultInsertRow {
  id: string;
  match_session_id: string;
  organization_id: string;
  score: number;
  label: DbMatchLabel;
  rank: number;
  reasons: string[];
}

// id is client-generated (crypto.randomUUID()), not left to the DB default — match_results has
// no SELECT policy (002's research.md R1), so a DB-generated id could never be read back. A Lead
// needs to reference the exact result it came from (research.md R8, 004-auth-lead-creation).
export function buildMatchResultRows(matchSessionId: string, results: MatchResult[]): MatchResultInsertRow[] {
  return results.map((r, i) => ({
    id: crypto.randomUUID(),
    match_session_id: matchSessionId,
    organization_id: r.organization.id,
    score: r.score,
    label: LABEL_MAP[r.label],
    rank: i + 1,
    reasons: r.reasons,
  }));
}
