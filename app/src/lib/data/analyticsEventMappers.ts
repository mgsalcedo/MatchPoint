/**
 * Pure AnalyticsEvent -> analytics_events row mapping. NO Supabase import here — mirrors
 * leadMappers.ts/sessionMappers.ts's discipline (unit-testable against fixtures). The exhaustive
 * switch is deliberate: TypeScript fails to compile if a 12th AnalyticsEvent variant is ever
 * added here without updating this mapper (research.md R6, 005-analytics-funnel).
 */

import type { AnalyticsEvent } from "../analytics";

export interface AnalyticsEventInsertRow {
  visit_id: string;
  user_id: string | null;
  event_name: AnalyticsEvent["name"];
  sport: string | null;
  district: string | null;
  match_session_id: string | null;
  result_count: number | null;
  organization_id: string | null;
  contact_type: string | null;
  result_rank: number | null;
  lead_id: string | null;
  login_provider: string | null;
}

export function buildAnalyticsEventRow(
  event: AnalyticsEvent,
  visitId: string,
  userId: string | null
): AnalyticsEventInsertRow {
  const base: AnalyticsEventInsertRow = {
    visit_id: visitId,
    user_id: userId,
    event_name: event.name,
    sport: null,
    district: null,
    match_session_id: null,
    result_count: null,
    organization_id: null,
    contact_type: null,
    result_rank: null,
    lead_id: null,
    login_provider: null,
  };

  switch (event.name) {
    case "app_opened":
    case "match_started":
      return base;
    case "sport_match_completed":
      return { ...base, match_session_id: event.matchSessionId, sport: event.sport, district: event.district };
    case "results_viewed":
      return { ...base, match_session_id: event.matchSessionId, result_count: event.resultCount };
    case "no_match_viewed":
      return { ...base, match_session_id: event.matchSessionId };
    case "profile_opened":
      return { ...base, organization_id: event.organizationId, result_rank: event.resultRank };
    case "contact_clicked":
      return {
        ...base,
        organization_id: event.organizationId,
        contact_type: event.contactType,
        result_rank: event.resultRank,
      };
    case "login_started":
    case "login_completed":
      return { ...base, login_provider: event.provider };
    case "lead_created":
      return { ...base, organization_id: event.organizationId, contact_type: event.contactType, lead_id: event.leadId };
    case "external_contact_opened":
      return { ...base, contact_type: event.contactType, lead_id: event.leadId };
  }
}
