import { describe, it, expect } from "vitest";
import type { Organization, Schedule, SportMatchAnswers } from "../types";
import { calculateMatches } from "./matching";

// A complete Organization fixture, shaped like real mapOrganizationRow() output
// (app/src/lib/data/mappers.ts) — same type, no adapter needed.
function fixtureOrg(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org-1",
    name: "Lima Runners Club",
    type: "team",
    sports: ["running"],
    description: "Comunidad de running para todos los niveles.",
    districts: ["San Isidro"],
    schedules: [
      { day: "mar", startTime: "06:00", endTime: "07:00", sessionType: "Grupal", level: "principiante" },
    ],
    priceRange: "no_confirmado",
    trialClassAvailable: false,
    whatsapp: "51999111222",
    adnDeportivo: {
      beginnerFriendliness: 0.8,
      competitiveness: 0.4,
      socialAtmosphere: 0.9,
      trainingIntensity: 0.5,
      performanceFocus: 0.3,
      inclusiveness: 0.6,
      environments: ["social", "inclusivo"],
    },
    services: [],
    profileStatus: "verified",
    ...overrides,
  };
}

function fixtureAnswers(overrides: Partial<SportMatchAnswers> = {}): SportMatchAnswers {
  return {
    goal: "conocer_gente",
    sport: "running",
    district: "San Isidro",
    days: ["mar"],
    time: "manana",
    level: "principiante",
    budget: "no_seguro",
    environment: "social",
    ...overrides,
  };
}

describe("levelFit — real-data regression (research.md R2)", () => {
  // This is the actual regression test: before the fix, Math.min(...) over a ranks array
  // containing even one `undefined` entry (from an unleveled schedule) evaluates to NaN, which
  // fails both `=== 0` and `=== 1` checks and silently falls through to the function's worst-case
  // `0.15`. That means one unconfirmed-level schedule among several *correctly leveled, exact-match*
  // ones drags the whole organization down to the worst possible level-fit score — this assertion
  // fails before the fix (mixed scores lower than the fully-leveled control) and passes after it
  // (the unleveled schedule is ignored, not treated as a mismatch).
  it("only considers schedules with a confirmed level when some, not all, are missing one", () => {
    const withMixed = fixtureOrg({
      schedules: [
        { day: "mar", startTime: "06:00", endTime: "07:00", sessionType: "Grupal" } as Schedule, // no level
        { day: "jue", startTime: "06:00", endTime: "07:00", sessionType: "Grupal", level: "principiante" },
      ],
    });
    const onlyLeveled = fixtureOrg({
      schedules: [{ day: "jue", startTime: "06:00", endTime: "07:00", sessionType: "Grupal", level: "principiante" }],
    });
    const answers = fixtureAnswers({ days: ["jue"] });
    const [mixedResult] = calculateMatches(answers, [withMixed]);
    const [leveledResult] = calculateMatches(answers, [onlyLeveled]);
    expect(Number.isFinite(mixedResult.score)).toBe(true);
    expect(mixedResult.score).toBe(leveledResult.score);
  });

  it("baseline is unaffected when every schedule already has a confirmed, matching level", () => {
    const org = fixtureOrg({
      schedules: [{ day: "mar", startTime: "06:00", endTime: "07:00", sessionType: "Grupal", level: "principiante" }],
    });
    const [result] = calculateMatches(fixtureAnswers({ level: "principiante" }), [org]);
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.label).not.toBe("Weak Match");
  });

  it("never crashes or produces a non-finite score when no schedule has a confirmed level", () => {
    const org = fixtureOrg({
      schedules: [{ day: "mar", startTime: "06:00", endTime: "07:00", sessionType: "Grupal" } as Schedule],
    });
    const [result] = calculateMatches(fixtureAnswers(), [org]);
    expect(result).toBeDefined();
    expect(Number.isFinite(result.score)).toBe(true);
  });
});

describe("calculateMatches — shape-integration smoke test", () => {
  it("ranks multiple real-shaped organizations without crashing", () => {
    const orgs = [
      fixtureOrg({ id: "org-1", name: "Lima Runners Club" }),
      fixtureOrg({
        id: "org-2",
        name: "No Confirmed Level Org",
        schedules: [{ day: "mar", startTime: "06:00", endTime: "07:00", sessionType: "Grupal" } as Schedule],
      }),
      fixtureOrg({ id: "org-3", name: "No Schedule Org", schedules: [] }),
    ];
    const results = calculateMatches(fixtureAnswers(), orgs);
    for (const r of results) {
      expect(Number.isFinite(r.score)).toBe(true);
    }
  });
});

describe("calculateMatches — no strong match (FR-005, research.md)", () => {
  it("returns an empty array, never partial/invalid entries, when nothing has a reason", () => {
    const org = fixtureOrg({
      sports: ["natacion"],
      districts: ["Ventanilla"],
      adnDeportivo: {
        beginnerFriendliness: 0,
        competitiveness: 0,
        socialAtmosphere: 0,
        trainingIntensity: 0,
        performanceFocus: 0,
        inclusiveness: 0,
        environments: ["recreativo"],
      },
      schedules: [],
      whatsapp: undefined,
    });
    const answers = fixtureAnswers({ sport: "triatlon", district: "San Isidro", environment: "competitivo" });
    const results = calculateMatches(answers, [org]);
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });
});
