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

describe("calculateMatches — wrong sport is always excluded (FR-002, 006-no-empty-results)", () => {
  // This fixture offers natacion while the user asked for triatlon — it was previously labeled
  // "no strong match," but it's actually exercising sport exclusion, not a weak-match-everywhere
  // case (006-no-empty-results research.md R6). The old assertion was vacuously true (results
  // happened to be empty for unrelated reasons); this one is true *because* of the sport filter.
  it("returns an empty array — the org doesn't offer the requested sport, regardless of any other fit", () => {
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
    expect(results).toHaveLength(0);
  });
});

describe("calculateMatches — sport eligibility gate (FR-002, 006-no-empty-results)", () => {
  it("excludes an organization that scores well on every other dimension but doesn't offer the requested sport", () => {
    const wrongSportOrg = fixtureOrg({
      sports: ["natacion"], // user wants triatlon
      districts: ["San Isidro"],
      schedules: [{ day: "mar", startTime: "06:00", endTime: "07:00", sessionType: "Grupal", level: "principiante" }],
      priceRange: "no_confirmado",
    });
    const answers = fixtureAnswers({ sport: "triatlon", district: "San Isidro", days: ["mar"], time: "manana" });
    const results = calculateMatches(answers, [wrongSportOrg]);
    expect(results).toHaveLength(0);
  });

  it("never lets a wrong-sport organization outrank a correctly-sport-matching one", () => {
    const wrongSportButOtherwiseStrong = fixtureOrg({ id: "org-wrong", sports: ["natacion"], districts: ["San Isidro"] });
    const rightSportButWeak = fixtureOrg({ id: "org-right", sports: ["triatlon"], districts: ["Ventanilla"] });
    const answers = fixtureAnswers({ sport: "triatlon", district: "San Isidro" });
    const results = calculateMatches(answers, [wrongSportButOtherwiseStrong, rightSportButWeak]);
    expect(results.map((r) => r.organization.id)).toEqual(["org-right"]);
  });
});

describe("calculateMatches — sport-matching org is never dropped for lacking other reasons (FR-001, FR-003)", () => {
  it("includes a sport-matching org that scores weakly on every other dimension, with the sport itself as its one reason", () => {
    const weakButRightSport = fixtureOrg({
      sports: ["running"],
      districts: ["Ventanilla"], // far from user's district, not adjacent
      schedules: [],
      priceRange: "mas_300",
      trialClassAvailable: false,
      adnDeportivo: {
        beginnerFriendliness: 0,
        competitiveness: 0,
        socialAtmosphere: 0,
        trainingIntensity: 0,
        performanceFocus: 0,
        inclusiveness: 0,
        environments: ["alto_rendimiento"],
      },
    });
    const answers = fixtureAnswers({ sport: "running", district: "San Isidro", environment: "social", budget: "gratis", goal: "conocer_gente" });
    const results = calculateMatches(answers, [weakButRightSport]);
    expect(results).toHaveLength(1);
    expect(results[0].reasons).toEqual(["Ofrece running."]);
    expect(results[0].label).toBe("Weak Match");
  });

  it("does not append the sport reason when real reasons already exist (no regression)", () => {
    const strongOrg = fixtureOrg(); // fixtureOrg's defaults already produce real reasons per the existing smoke test
    const results = calculateMatches(fixtureAnswers(), [strongOrg]);
    expect(results[0].reasons.some((r) => r.startsWith("Ofrece "))).toBe(false);
  });
});

describe("calculateMatches — true-empty-catalog signal (FR-005, 006-no-empty-results)", () => {
  it("returns an empty array when zero organizations in the catalog offer the requested sport, even if organizations exist for other sports", () => {
    const orgs = [fixtureOrg({ sports: ["natacion"] }), fixtureOrg({ id: "org-2", sports: ["ciclismo"] })];
    const results = calculateMatches(fixtureAnswers({ sport: "triatlon" }), orgs);
    expect(results).toHaveLength(0);
  });

  it("returns at least one result whenever at least one organization offers the requested sport, regardless of how poorly it scores otherwise", () => {
    const orgs = [
      fixtureOrg({ id: "org-wrong", sports: ["natacion"] }),
      fixtureOrg({ id: "org-right", sports: ["triatlon"], districts: ["Ventanilla"], schedules: [] }),
    ];
    const results = calculateMatches(fixtureAnswers({ sport: "triatlon" }), orgs);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.organization.id === "org-right")).toBe(true);
  });
});

describe("calculateMatches — 5-result cap unchanged (FR-007)", () => {
  it("still caps at 5 results when more than 5 organizations offer the requested sport", () => {
    const orgs = Array.from({ length: 7 }, (_, i) => fixtureOrg({ id: `org-${i}`, sports: ["running"] }));
    const results = calculateMatches(fixtureAnswers({ sport: "running" }), orgs);
    expect(results).toHaveLength(5);
  });
});
