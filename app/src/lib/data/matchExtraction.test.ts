import { describe, it, expect } from "vitest";
import { decideNextStep, nextUnansweredIndex, ANSWER_ORDER, type ExtractionResult } from "./matchExtraction";

// decideNextStep is the piece Constitution Principle III requires TDD for — it gates whether
// possibly-incomplete extraction can reach finalizeMatch() (FR-005, never guesses). extractMatchAnswers
// itself is thin IO glue around supabase.functions.invoke, left untested here, consistent with
// this codebase's existing convention (createMatchSession/createLead are likewise not unit-mocked).

function fixtureResult(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return { extracted: {}, missing: [], ok: true, ...overrides };
}

describe("decideNextStep", () => {
  it("US1: finalizes directly when all 8 fields are extracted", () => {
    const result = fixtureResult({
      extracted: {
        goal: "preparar_carrera",
        sport: "running",
        district: "San Isidro",
        days: ["lun", "mie"],
        time: "noche",
        level: "principiante",
        budget: "hasta_100",
        environment: "social",
      },
      missing: [],
    });

    expect(decideNextStep(result)).toEqual({ action: "finalize" });
  });

  it("US2: routes to the first missing field in questionnaire order, not just any missing field", () => {
    // budget and days are both missing; questionnaire order puts "days" before "budget".
    const result = fixtureResult({
      extracted: { goal: "conocer_gente", sport: "running", district: "San Isidro" },
      missing: ["days", "budget", "environment"],
    });

    expect(decideNextStep(result)).toEqual({ action: "askMissing", startAt: "days" });
  });

  it("US2: routes to the only missing field when just one is unstated", () => {
    const result = fixtureResult({
      extracted: {
        goal: "mantenerme_activo",
        sport: "trail",
        district: "La Molina",
        days: ["sab"],
        time: "manana",
        level: "intermedio",
        environment: "recreativo",
      },
      missing: ["budget"],
    });

    expect(decideNextStep(result)).toEqual({ action: "askMissing", startAt: "budget" });
  });

  it('FR-006: budget "no_seguro" counts as extracted, not missing — distinct from unmentioned budget', () => {
    const stated = fixtureResult({
      extracted: { budget: "no_seguro" },
      missing: ["goal", "sport", "district", "days", "time", "level", "environment"],
    });
    expect(decideNextStep(stated)).toEqual({ action: "askMissing", startAt: "goal" });

    // If budget itself were the only thing missing, it must be the one routed to — proving
    // "no_seguro" and "missing" are never conflated by the routing logic.
    const onlyBudgetMissing = fixtureResult({
      extracted: {
        goal: "empezar",
        sport: "natacion",
        district: "Miraflores",
        days: ["mar"],
        time: "tarde",
        level: "nunca_practique",
        environment: "familiar",
      },
      missing: ["budget"],
    });
    expect(decideNextStep(onlyBudgetMissing)).toEqual({ action: "askMissing", startAt: "budget" });
  });

  it("US2: total extraction failure falls back to the plain questionnaire, nothing pre-filled", () => {
    const result = fixtureResult({ ok: false, extracted: {}, missing: [] });
    expect(decideNextStep(result)).toEqual({ action: "fallback" });
  });

  it("edge case: unrelated free text extracts nothing, routes to the very first question", () => {
    const result = fixtureResult({
      extracted: {},
      missing: ["goal", "sport", "district", "days", "time", "level", "budget", "environment"],
    });
    expect(decideNextStep(result)).toEqual({ action: "askMissing", startAt: "goal" });
  });
});

describe("nextUnansweredIndex", () => {
  // Regression test: a real user sentence ("running, la molina, dos veces a la semana, noches,
  // principiante") extracted sport/district/time/level but not goal/days/budget/environment.
  // decideNextStep correctly routed to "goal" (the first missing field), but SportMatch.tsx's
  // question-by-question advancement re-asked sport/district/time/level anyway, because it only
  // ever moved one step forward instead of skipping every already-answered field along the way —
  // the bug this function (and its use in SportMatch.tsx's goToNext) fixes.
  it("skips every already-answered field, not just the first one", () => {
    const answers = {
      sport: "running" as const,
      district: "La Molina",
      time: "noche" as const,
      level: "principiante" as const,
    };
    // Starting from "goal" (index 0, itself unanswered): must land on "goal" immediately...
    expect(ANSWER_ORDER[nextUnansweredIndex(0, answers)]).toBe("goal");
    // ...and advancing past "goal" must skip sport/district/time/level (all answered) and land
    // on "days" — not on "sport", which a naive step+1 would incorrectly re-ask.
    const goalIndex = ANSWER_ORDER.indexOf("goal");
    expect(ANSWER_ORDER[nextUnansweredIndex(goalIndex + 1, answers)]).toBe("days");
  });

  it("returns ANSWER_ORDER.length when every remaining field is already answered", () => {
    const answers = {
      goal: "empezar" as const,
      sport: "running" as const,
      district: "San Isidro",
      days: ["lun" as const],
      time: "noche" as const,
      level: "principiante" as const,
      budget: "gratis" as const,
      environment: "social" as const,
    };
    expect(nextUnansweredIndex(0, answers)).toBe(ANSWER_ORDER.length);
  });

  it("does not skip a field that is genuinely unanswered even mid-sequence", () => {
    const answers = { goal: "empezar" as const, sport: "running" as const };
    // district (index 2) is unanswered — must stop there, not skip past it.
    expect(ANSWER_ORDER[nextUnansweredIndex(0, answers)]).toBe("district");
  });
});
