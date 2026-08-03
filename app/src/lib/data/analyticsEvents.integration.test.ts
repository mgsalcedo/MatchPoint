/**
 * Integration test — requires a live Supabase database with migration
 * 0012_analytics_events.sql applied. Excluded from the default `npm test` run (see
 * vite.config.ts). Run explicitly:
 *
 *   RUN_INTEGRATION=1 npx vitest run src/lib/data/analyticsEvents.integration.test.ts
 *
 * Proves FR-004 and the anon-write RLS design (research.md R13, 005-analytics-funnel) against
 * the real database, not just by inspecting the SQL. Needs no service_role key — the anon-role
 * write path is safe to automate, unlike 004's authenticated-role writes (research.md R13's
 * distinction).
 */

import { describe, it, expect } from "vitest";
import { supabase } from "./supabaseClient";
import { buildAnalyticsEventRow } from "./analyticsEventMappers";

describe("analytics_events (integration, live DB)", () => {
  it("anon insert of an event succeeds, and is not readable back (no SELECT policy)", async () => {
    const visitId = crypto.randomUUID();
    const row = buildAnalyticsEventRow({ name: "app_opened" }, visitId, null);

    const { error: insertError } = await supabase.from("analytics_events").insert(row);
    expect(insertError).toBeNull();

    const { data } = await supabase.from("analytics_events").select("id").eq("visit_id", visitId);
    expect(data).toEqual([]);
  });

  it("rejects an anon insert that claims a non-null user_id (impersonation guard)", async () => {
    const visitId = crypto.randomUUID();
    const row = buildAnalyticsEventRow(
      { name: "app_opened" },
      visitId,
      "00000000-0000-0000-0000-000000000001"
    );

    const { error } = await supabase.from("analytics_events").insert(row);
    expect(error).not.toBeNull();
  });
});
