/**
 * Persists a completed Sport Match™ session (anonymous, no login — ADR-0003). Matching itself
 * already ran client-side (lib/matching.ts) before this is called; this function only writes
 * the outcome. Never throws — every failure mode collapses to `persisted: false` so the caller
 * can always keep showing the already-computed results (FR-009).
 */

import { supabase } from "./supabaseClient";
import { getSportId } from "./sports";
import { getDistrictId } from "./districts";
import { mapSportToSlug } from "./mappers";
import { buildMatchSessionRow, buildMatchResultRows } from "./sessionMappers";
import type { MatchResult, SportMatchAnswers } from "../../types";

export interface PersistMatchOutcome {
  matchSessionId: string;
  persisted: boolean; // false = write failed; results are still valid, per FR-009
}

export async function createMatchSession(
  answers: SportMatchAnswers,
  results: MatchResult[]
): Promise<PersistMatchOutcome> {
  const matchSessionId = crypto.randomUUID();
  try {
    const sportSlug = mapSportToSlug(answers.sport);
    if (!sportSlug) throw new Error(`No DB sport slug for app Sport "${answers.sport}"`);

    const [sportId, districtId] = await Promise.all([
      getSportId(sportSlug),
      getDistrictId(answers.district),
    ]);

    const sessionRow = buildMatchSessionRow(matchSessionId, answers, sportId, districtId);
    const { error: sessionError } = await supabase.from("match_sessions").insert(sessionRow);
    if (sessionError) throw sessionError;

    if (results.length > 0) {
      const resultRows = buildMatchResultRows(matchSessionId, results);
      const { error: resultsError } = await supabase.from("match_results").insert(resultRows);
      if (resultsError) throw resultsError;
    }

    return { matchSessionId, persisted: true };
  } catch (err) {
    // FR-009: a save failure must never block or blank the results screen. Logged payload
    // (err only) carries no contact/location-precision data beyond what's already shown in
    // the UI, per docs/security-standards.md's allow-list posture for logs/analytics.
    console.error("[MatchPoint] Failed to persist match session", err);
    return { matchSessionId, persisted: false };
  }
}
