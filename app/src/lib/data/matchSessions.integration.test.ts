/**
 * Integration test — requires a live, seeded Supabase database with migration
 * 0009_match_session_results_anon_insert.sql applied. Excluded from the default `npm test`
 * run (see vite.config.ts). Run explicitly:
 *
 *   RUN_INTEGRATION=1 npx vitest run src/lib/data/matchSessions.integration.test.ts
 *
 * Proves FR-001/FR-006/SC-005 and the anon-write RLS design (research.md R1) against the
 * real database, not just by inspecting the SQL.
 */

import { describe, it, expect } from "vitest";
import { supabase } from "./supabaseClient";
import { createMatchSession } from "./matchSessions";
import type { MatchResult, SportMatchAnswers } from "../../types";

const answers: SportMatchAnswers = {
  goal: "conocer_gente",
  sport: "running",
  district: "San Isidro",
  days: ["mar"],
  time: "manana",
  level: "principiante",
  budget: "no_seguro",
  environment: "social",
};

async function fetchOneRealOrgId(): Promise<string> {
  const { data, error } = await supabase.from("organizations").select("id").limit(1).single();
  if (error || !data) throw new Error("Seed has no organizations — run supabase/seed/002_organizations.sql first");
  return data.id;
}

describe("createMatchSession (integration, live DB)", () => {
  it("anon insert of a session + results succeeds, and neither is readable back", async () => {
    const orgId = await fetchOneRealOrgId();
    const results: MatchResult[] = [
      {
        organization: { id: orgId } as MatchResult["organization"],
        score: 88,
        label: "Very Good Match",
        reasons: ["Coincide con tus días y horario preferidos."],
      },
    ];

    const outcome = await createMatchSession(answers, results);
    expect(outcome.persisted).toBe(true);
    expect(outcome.matchSessionId).toBeTruthy();

    // C5 / FR-006 / SC-005: no SELECT policy exists — the anon client cannot read what it
    // just wrote, for either table.
    const sessionRead = await supabase.from("match_sessions").select("id").eq("id", outcome.matchSessionId);
    expect(sessionRead.data).toEqual([]);

    const resultsRead = await supabase
      .from("match_results")
      .select("id")
      .eq("match_session_id", outcome.matchSessionId);
    expect(resultsRead.data).toEqual([]);
  });

  it("attempts the session insert even when there are zero results (SC-002)", async () => {
    const outcome = await createMatchSession(answers, []);
    expect(outcome.persisted).toBe(true);
  });

  it("rejects an anon match_sessions insert that claims a non-null user_id (impersonation guard)", async () => {
    const { error } = await supabase.from("match_sessions").insert({
      id: crypto.randomUUID(),
      user_id: "00000000-0000-0000-0000-000000000001",
      goal: "meet_people",
      sport_id: (await supabase.from("sports").select("id").limit(1).single()).data?.id,
      district_id: (await supabase.from("districts").select("id").limit(1).single()).data?.id,
      available_days: [1],
      preferred_times: ["morning"],
      level: "beginner",
      budget: "not_sure",
      environment: "social",
    });
    expect(error).not.toBeNull();
  });
});
