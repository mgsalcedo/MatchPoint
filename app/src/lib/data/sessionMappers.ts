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

const GOAL_MAP: Record<Goal, DbMatchGoal> = {
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
  user_id: null;
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
  districtId: string
): MatchSessionInsertRow {
  return {
    id,
    user_id: null, // anon-only this milestone; RLS enforces this (migration 0009)
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
  match_session_id: string;
  organization_id: string;
  score: number;
  label: DbMatchLabel;
  rank: number;
  reasons: string[];
}

export function buildMatchResultRows(matchSessionId: string, results: MatchResult[]): MatchResultInsertRow[] {
  return results.map((r, i) => ({
    match_session_id: matchSessionId,
    organization_id: r.organization.id,
    score: r.score,
    label: LABEL_MAP[r.label],
    rank: i + 1,
    reasons: r.reasons,
  }));
}
