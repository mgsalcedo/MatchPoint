import { supabase } from "./supabaseClient";
import { setTracker } from "../analytics";
import { getOrCreateVisitId } from "../visitId";
import { buildAnalyticsEventRow } from "./analyticsEventMappers";
import type { AnalyticsEvent } from "../analytics";

/**
 * Swaps analytics.ts's default console-only sink for a durable Supabase-backed one. Never
 * throws, never blocks the caller of track() — matches createMatchSession's "degrade silently"
 * pattern (never createLead's "must throw" pattern, research.md R7): an analytics write failure
 * must not surface to the user or block any action, including the North Star Lead-creation flow.
 */
export function installSupabaseAnalyticsSink(): void {
  setTracker((event: AnalyticsEvent) => {
    void writeEvent(event);
  });
}

async function writeEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const visitId = getOrCreateVisitId();
    const {
      data: { session },
    } = await supabase.auth.getSession(); // locally-cached read, no network round trip in the
    // common case — resolves user_id when known without requiring every track() call site to
    // thread it through (research.md R8).
    const row = buildAnalyticsEventRow(event, visitId, session?.user.id ?? null);
    const { error } = await supabase.from("analytics_events").insert(row);
    if (error) throw error;
  } catch (err) {
    console.error("[MatchPoint] Failed to record analytics event", event.name, err instanceof Error ? err.message : err);
  }
}
