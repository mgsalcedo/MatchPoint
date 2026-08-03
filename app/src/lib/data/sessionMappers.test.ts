import { describe, it, expect } from "vitest";
import type { Budget, Environment, Goal, MatchLabel, MatchResult, SportMatchAnswers } from "../../types";
import { mapLevelToDb, mapSportToSlug, mapWeekdayToDayOfWeek } from "./mappers";
import { buildMatchResultRows, buildMatchSessionRow } from "./sessionMappers";

const ALL_GOALS: Goal[] = [
  "empezar",
  "preparar_carrera",
  "mejorar_rendimiento",
  "mantenerme_activo",
  "bajar_peso",
  "conocer_gente",
  "otro",
];

const ALL_BUDGETS: Budget[] = ["gratis", "hasta_100", "100_200", "200_300", "mas_300", "no_seguro"];

const ALL_ENVIRONMENTS: Environment[] = [
  "competitivo",
  "social",
  "recreativo",
  "familiar",
  "alto_rendimiento",
  "inclusivo",
];

const ALL_LABELS: MatchLabel[] = [
  "Excellent Match",
  "Very Good Match",
  "Good Match",
  "Possible Match",
  "Weak Match",
];

function fixtureAnswers(overrides: Partial<SportMatchAnswers> = {}): SportMatchAnswers {
  return {
    goal: "conocer_gente",
    sport: "running",
    district: "San Isidro",
    days: ["mar", "jue"],
    time: "manana",
    level: "principiante",
    budget: "no_seguro",
    environment: "social",
    ...overrides,
  };
}

describe("buildMatchSessionRow — vocabulary round-trips", () => {
  it.each(ALL_GOALS)("maps every Goal value: %s", (goal) => {
    const row = buildMatchSessionRow("session-1", fixtureAnswers({ goal }), "sport-id", "district-id");
    expect(row.goal).toBeTruthy();
  });

  it.each(ALL_BUDGETS)("maps every Budget value: %s", (budget) => {
    const row = buildMatchSessionRow("session-1", fixtureAnswers({ budget }), "sport-id", "district-id");
    expect(row.budget).toBeTruthy();
  });

  it.each(ALL_ENVIRONMENTS)("maps every Environment value: %s", (environment) => {
    const row = buildMatchSessionRow("session-1", fixtureAnswers({ environment }), "sport-id", "district-id");
    expect(row.environment).toBeTruthy();
  });

  it("maps core fields, forces user_id null, and sorts available_days", () => {
    const row = buildMatchSessionRow(
      "session-1",
      fixtureAnswers({ days: ["jue", "lun"] }),
      "sport-id-123",
      "district-id-456"
    );
    expect(row.id).toBe("session-1");
    expect(row.user_id).toBeNull();
    expect(row.sport_id).toBe("sport-id-123");
    expect(row.district_id).toBe("district-id-456");
    expect(row.available_days).toEqual([1, 4]); // lun=1, jue=4, sorted ascending
    expect(row.preferred_times).toEqual(["morning"]);
  });
});

describe("reverse (app -> DB) enum lookups round-trip through mappers.ts", () => {
  it("mapSportToSlug covers every mapped Sport", () => {
    expect(mapSportToSlug("running")).toBe("running");
    expect(mapSportToSlug("trail")).toBe("trail-running");
    expect(mapSportToSlug("centro_entrenamiento")).toBe("centro-entrenamiento");
  });

  it("mapLevelToDb covers every Level", () => {
    expect(mapLevelToDb("nunca_practique")).toBe("never_practiced");
    expect(mapLevelToDb("principiante")).toBe("beginner");
    expect(mapLevelToDb("avanzado")).toBe("advanced");
  });

  it("mapWeekdayToDayOfWeek is ISO Monday=1", () => {
    expect(mapWeekdayToDayOfWeek("lun")).toBe(1);
    expect(mapWeekdayToDayOfWeek("dom")).toBe(7);
  });
});

describe("buildMatchResultRows — rank assignment (1-based, input order)", () => {
  const fakeResults: MatchResult[] = [
    { organization: { id: "org-a" } as MatchResult["organization"], score: 92, label: "Excellent Match", reasons: ["r1"] },
    { organization: { id: "org-b" } as MatchResult["organization"], score: 60, label: "Good Match", reasons: ["r2"] },
  ];

  it.each(ALL_LABELS)("maps every MatchLabel value: %s", (label) => {
    const rows = buildMatchResultRows("session-1", [{ ...fakeResults[0], label }]);
    expect(rows[0].label).toBeTruthy();
  });

  it("assigns 1-based ranks in the same order as the input array", () => {
    const rows = buildMatchResultRows("session-1", fakeResults);
    expect(rows).toEqual([
      { id: expect.any(String), match_session_id: "session-1", organization_id: "org-a", score: 92, label: "excellent_match", rank: 1, reasons: ["r1"] },
      { id: expect.any(String), match_session_id: "session-1", organization_id: "org-b", score: 60, label: "good_match", rank: 2, reasons: ["r2"] },
    ]);
  });

  it("generates a distinct client-side id per row (research.md R8, 004-auth-lead-creation)", () => {
    const rows = buildMatchResultRows("session-1", fakeResults);
    expect(rows[0].id).not.toBe(rows[1].id);
  });
});
