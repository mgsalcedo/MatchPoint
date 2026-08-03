import { describe, it, expect } from "vitest";
import type { AnalyticsEvent } from "../analytics";
import { buildAnalyticsEventRow } from "./analyticsEventMappers";

const VISIT_ID = "visit-1";
const USER_ID = "user-1";

describe("buildAnalyticsEventRow — every AnalyticsEvent variant maps correctly", () => {
  it("app_opened: base fields only", () => {
    const row = buildAnalyticsEventRow({ name: "app_opened" }, VISIT_ID, null);
    expect(row).toEqual({
      visit_id: VISIT_ID,
      user_id: null,
      event_name: "app_opened",
      sport: null,
      district: null,
      match_session_id: null,
      result_count: null,
      organization_id: null,
      contact_type: null,
      result_rank: null,
      lead_id: null,
      login_provider: null,
    });
  });

  it("match_started: base fields only", () => {
    const row = buildAnalyticsEventRow({ name: "match_started" }, VISIT_ID, USER_ID);
    expect(row.event_name).toBe("match_started");
    expect(row.user_id).toBe(USER_ID);
  });

  it("sport_match_completed: carries matchSessionId, sport, district", () => {
    const event: AnalyticsEvent = {
      name: "sport_match_completed",
      matchSessionId: "session-1",
      sport: "running",
      district: "San Isidro",
    };
    const row = buildAnalyticsEventRow(event, VISIT_ID, null);
    expect(row.match_session_id).toBe("session-1");
    expect(row.sport).toBe("running");
    expect(row.district).toBe("San Isidro");
  });

  it("results_viewed: carries matchSessionId, resultCount", () => {
    const event: AnalyticsEvent = { name: "results_viewed", matchSessionId: "session-1", resultCount: 3 };
    const row = buildAnalyticsEventRow(event, VISIT_ID, null);
    expect(row.match_session_id).toBe("session-1");
    expect(row.result_count).toBe(3);
  });

  it("no_match_viewed: carries matchSessionId only", () => {
    const event: AnalyticsEvent = { name: "no_match_viewed", matchSessionId: "session-1" };
    const row = buildAnalyticsEventRow(event, VISIT_ID, null);
    expect(row.match_session_id).toBe("session-1");
    expect(row.result_count).toBeNull();
  });

  it("profile_opened: carries organizationId, resultRank", () => {
    const event: AnalyticsEvent = { name: "profile_opened", organizationId: "org-1", resultRank: 2 };
    const row = buildAnalyticsEventRow(event, VISIT_ID, null);
    expect(row.organization_id).toBe("org-1");
    expect(row.result_rank).toBe(2);
  });

  it("profile_opened: resultRank may be null (direct-search entry, no rank context)", () => {
    const event: AnalyticsEvent = { name: "profile_opened", organizationId: "org-1", resultRank: null };
    const row = buildAnalyticsEventRow(event, VISIT_ID, null);
    expect(row.result_rank).toBeNull();
  });

  it("contact_clicked: carries organizationId, contactType, resultRank", () => {
    const event: AnalyticsEvent = {
      name: "contact_clicked",
      organizationId: "org-1",
      contactType: "whatsapp",
      resultRank: 1,
    };
    const row = buildAnalyticsEventRow(event, VISIT_ID, null);
    expect(row.organization_id).toBe("org-1");
    expect(row.contact_type).toBe("whatsapp");
    expect(row.result_rank).toBe(1);
  });

  it("login_started: carries provider", () => {
    const event: AnalyticsEvent = { name: "login_started", provider: "google" };
    const row = buildAnalyticsEventRow(event, VISIT_ID, null);
    expect(row.login_provider).toBe("google");
  });

  it("login_completed: carries provider", () => {
    const event: AnalyticsEvent = { name: "login_completed", provider: "google" };
    const row = buildAnalyticsEventRow(event, VISIT_ID, USER_ID);
    expect(row.login_provider).toBe("google");
    expect(row.user_id).toBe(USER_ID);
  });

  it("lead_created: carries organizationId, contactType, leadId", () => {
    const event: AnalyticsEvent = {
      name: "lead_created",
      leadId: "lead-1",
      organizationId: "org-1",
      contactType: "instagram",
    };
    const row = buildAnalyticsEventRow(event, VISIT_ID, USER_ID);
    expect(row.lead_id).toBe("lead-1");
    expect(row.organization_id).toBe("org-1");
    expect(row.contact_type).toBe("instagram");
  });

  it("external_contact_opened: carries leadId, contactType (no organizationId)", () => {
    const event: AnalyticsEvent = { name: "external_contact_opened", leadId: "lead-1", contactType: "booking" };
    const row = buildAnalyticsEventRow(event, VISIT_ID, USER_ID);
    expect(row.lead_id).toBe("lead-1");
    expect(row.contact_type).toBe("booking");
    expect(row.organization_id).toBeNull();
  });

  it("always stamps the given visitId and userId, regardless of event type", () => {
    const row = buildAnalyticsEventRow({ name: "app_opened" }, "visit-xyz", "user-xyz");
    expect(row.visit_id).toBe("visit-xyz");
    expect(row.user_id).toBe("user-xyz");
  });
});
