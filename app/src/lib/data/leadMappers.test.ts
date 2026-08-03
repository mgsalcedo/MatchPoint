import { describe, it, expect } from "vitest";
import type { ContactType, Goal, LeadSource } from "../../types";
import type { OrgContactSnapshot } from "./organizations";
import { buildExternalUrl, buildLeadInsertRow, resolveContactValue, type BuildLeadInput } from "./leadMappers";

const ALL_CONTACT_TYPES: ContactType[] = ["whatsapp", "instagram", "booking", "call", "form"];
const ALL_SOURCES: LeadSource[] = [
  "result_card",
  "organization_profile",
  "event_profile",
  "direct_search",
  "admin_test",
];
const ALL_GOALS: Goal[] = [
  "empezar",
  "preparar_carrera",
  "mejorar_rendimiento",
  "mantenerme_activo",
  "bajar_peso",
  "conocer_gente",
  "otro",
];

function fixtureInput(overrides: Partial<BuildLeadInput> = {}): BuildLeadInput {
  return {
    id: "lead-1",
    userId: "user-1",
    organizationId: "org-1",
    matchSessionId: "session-1",
    matchResultId: "result-1",
    contactType: "whatsapp",
    source: "organization_profile",
    sportId: "sport-1",
    goal: "conocer_gente",
    districtId: "district-1",
    resultRank: 1,
    ...overrides,
  };
}

function fixtureSnapshot(overrides: Partial<OrgContactSnapshot> = {}): OrgContactSnapshot {
  return {
    id: "org-1",
    name: "Peru Runners",
    whatsapp: "51999111222",
    instagram: "https://instagram.com/perurunners",
    bookingLink: undefined,
    website: undefined,
    ...overrides,
  };
}

describe("buildLeadInsertRow", () => {
  it.each(ALL_CONTACT_TYPES)("maps every ContactType through 1:1 (already DB-aligned): %s", (contactType) => {
    const row = buildLeadInsertRow(fixtureInput({ contactType }));
    expect(row.contact_type).toBe(contactType);
  });

  it.each(ALL_SOURCES)("maps every LeadSource through 1:1: %s", (source) => {
    const row = buildLeadInsertRow(fixtureInput({ source }));
    expect(row.source).toBe(source);
  });

  it.each(ALL_GOALS)("translates every Goal via the shared GOAL_MAP: %s", (goal) => {
    const row = buildLeadInsertRow(fixtureInput({ goal }));
    expect(row.goal).toBeTruthy();
    expect(row.goal).not.toBe(goal); // English DB token, not the raw Spanish app value
  });

  it("maps core fields and allows null match context", () => {
    const row = buildLeadInsertRow(
      fixtureInput({ matchSessionId: null, matchResultId: null, goal: null, sportId: null, districtId: null })
    );
    expect(row).toEqual({
      id: "lead-1",
      user_id: "user-1",
      organization_id: "org-1",
      match_session_id: null,
      match_result_id: null,
      contact_type: "whatsapp",
      source: "organization_profile",
      sport_id: null,
      goal: null,
      district_id: null,
      result_rank: 1,
    });
  });
});

describe("resolveContactValue — FR-013 contactability decision", () => {
  it("resolves whatsapp when present", () => {
    const result = resolveContactValue(fixtureSnapshot({ whatsapp: "51999111222" }), "whatsapp");
    expect(result).toEqual({ available: true, value: "51999111222" });
  });

  it("resolves instagram when present", () => {
    const result = resolveContactValue(fixtureSnapshot({ instagram: "https://instagram.com/x" }), "instagram");
    expect(result).toEqual({ available: true, value: "https://instagram.com/x" });
  });

  it("resolves booking when present", () => {
    const result = resolveContactValue(fixtureSnapshot({ bookingLink: "https://booking.example" }), "booking");
    expect(result).toEqual({ available: true, value: "https://booking.example" });
  });

  it("reports unavailable when the specific channel no longer exists on the org", () => {
    expect(resolveContactValue(fixtureSnapshot({ whatsapp: undefined }), "whatsapp")).toEqual({ available: false });
    expect(resolveContactValue(fixtureSnapshot({ instagram: undefined }), "instagram")).toEqual({ available: false });
    expect(resolveContactValue(fixtureSnapshot({ bookingLink: undefined }), "booking")).toEqual({ available: false });
  });

  it("treats call/form as always structurally available (no DB-backed value to check)", () => {
    expect(resolveContactValue(fixtureSnapshot(), "call")).toEqual({ available: true });
    expect(resolveContactValue(fixtureSnapshot(), "form")).toEqual({ available: true });
  });
});

describe("buildExternalUrl", () => {
  it("builds a wa.me link for whatsapp", () => {
    expect(buildExternalUrl("whatsapp", fixtureSnapshot({ whatsapp: "51999111222" }))).toEqual({
      url: "https://wa.me/51999111222",
      label: "Abrir WhatsApp",
    });
  });

  it("uses a real seed-shaped full instagram URL as-is (does not double-prefix it)", () => {
    // Real seed data stores instagram_url as a full URL already — the pre-existing
    // ContactSuccess.tsx logic this replaces only handled a bare handle and would have
    // produced "https://instagram.com/https://instagram.com/x" here. Regression guard.
    const result = buildExternalUrl("instagram", fixtureSnapshot({ instagram: "https://instagram.com/perurunners" }));
    expect(result).toEqual({ url: "https://instagram.com/perurunners", label: "Abrir Instagram" });
  });

  it("still prefixes a bare instagram handle correctly", () => {
    const result = buildExternalUrl("instagram", fixtureSnapshot({ instagram: "perurunners" }));
    expect(result).toEqual({ url: "https://instagram.com/perurunners", label: "Abrir Instagram" });
  });

  it("uses the booking URL as-is", () => {
    const result = buildExternalUrl("booking", fixtureSnapshot({ bookingLink: "https://booking.example/x" }));
    expect(result).toEqual({ url: "https://booking.example/x", label: "Reservar clase" });
  });

  it("returns null when the channel is unavailable", () => {
    expect(buildExternalUrl("whatsapp", fixtureSnapshot({ whatsapp: undefined }))).toBeNull();
  });

  it("returns null for call/form (no external URL wired up yet)", () => {
    expect(buildExternalUrl("call", fixtureSnapshot())).toBeNull();
    expect(buildExternalUrl("form", fixtureSnapshot())).toBeNull();
  });
});
