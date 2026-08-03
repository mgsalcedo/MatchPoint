import type { Level, MatchLabel, MatchResult, Organization, SportMatchAnswers } from "../types";
import { SPORT_LABELS } from "./labels";

/**
 * Shell-stage placeholder scoring, isolated in one module per docs/base-standards.md's
 * no-duplicate-domain-logic rule. Weights and label thresholds come from
 * docs/matching-engine.md — replace the fit functions with real business rules in Fase 2,
 * the shape (MatchResult) should stay stable for the UI built on top of it.
 */

const WEIGHTS = {
  goal: 0.25,
  sport: 0.2,
  schedule: 0.15,
  location: 0.15,
  level: 0.1,
  environment: 0.1,
  budget: 0.05,
};

const ADJACENT_DISTRICTS: Record<string, string[]> = {
  "San Isidro": ["Miraflores", "San Borja"],
  Miraflores: ["San Isidro", "Barranco", "Surco"],
  Surco: ["San Borja", "La Molina", "Miraflores"],
  "La Molina": ["Surco", "San Borja"],
  "San Borja": ["San Isidro", "Surco", "La Molina"],
  "San Miguel": ["San Isidro", "Callao"],
  Barranco: ["Miraflores", "Surco"],
  Callao: ["San Miguel"],
};

const BUDGET_RANK: Record<string, number> = {
  gratis: 0,
  hasta_100: 1,
  "100_200": 2,
  "200_300": 3,
  mas_300: 4,
  no_seguro: -1,
  no_confirmado: -1,
};

const LEVEL_RANK: Record<string, number> = {
  nunca_practique: 0,
  principiante: 1,
  intermedio: 2,
  avanzado: 3,
};

const TIME_WINDOWS: Record<string, [number, number]> = {
  manana: [5, 12],
  tarde: [12, 18],
  noche: [18, 23],
};

function goalFit(answers: SportMatchAnswers, org: Organization): number {
  const adn = org.adnDeportivo;
  switch (answers.goal) {
    case "empezar":
      return org.trialClassAvailable ? Math.min(1, adn.beginnerFriendliness + 0.1) : adn.beginnerFriendliness;
    case "preparar_carrera":
      return adn.trainingIntensity;
    case "mejorar_rendimiento":
      return adn.competitiveness;
    case "mantenerme_activo":
      return adn.beginnerFriendliness * 0.5 + adn.socialAtmosphere * 0.5;
    case "bajar_peso":
      return org.type === "training_center" ? 1 : adn.beginnerFriendliness * 0.7;
    case "conocer_gente":
      return adn.socialAtmosphere;
    default:
      return 0.5;
  }
}

function sportFit(answers: SportMatchAnswers, org: Organization): number {
  return org.sports.includes(answers.sport) ? 1 : 0;
}

function scheduleFit(answers: SportMatchAnswers, org: Organization): number {
  const dayMatches = org.schedules.filter((s) => answers.days.includes(s.day));
  if (dayMatches.length === 0) return 0;
  const [start, end] = TIME_WINDOWS[answers.time];
  const timeMatches = dayMatches.some((s) => {
    const hour = Number(s.startTime.split(":")[0]);
    return hour >= start && hour < end;
  });
  return timeMatches ? 1 : 0.6;
}

function locationFit(answers: SportMatchAnswers, org: Organization): number {
  if (org.districts.includes(answers.district)) return 1;
  const adjacent = ADJACENT_DISTRICTS[answers.district] ?? [];
  if (org.districts.some((d) => adjacent.includes(d))) return 0.6;
  return 0.2;
}

function levelFit(answers: SportMatchAnswers, org: Organization): number {
  // Schedules can legitimately have no confirmed level (BR-016 — no fabrication). Filter those
  // out before ranking rather than letting an undefined rank poison Math.min into NaN, which
  // silently fell through to the worst-case 0.15 for the WHOLE organization even when other
  // schedules had a confirmed, well-matching level (research.md R2).
  const ranks = org.schedules
    .map((s) => s.level)
    .filter((level): level is Level => level !== undefined)
    .map((level) => LEVEL_RANK[level]);
  if (ranks.length === 0) return 0.5; // no confirmed-level signal — neutral, not fabricated (BR-016)
  const userRank = LEVEL_RANK[answers.level];
  const minDistance = Math.min(...ranks.map((r) => Math.abs(r - userRank)));
  if (minDistance === 0) return 1;
  if (minDistance === 1) return 0.5;
  return 0.15;
}

function environmentFit(answers: SportMatchAnswers, org: Organization): number {
  return org.adnDeportivo.environments.includes(answers.environment) ? 1 : 0.3;
}

function budgetFit(answers: SportMatchAnswers, org: Organization): number {
  if (answers.budget === "no_seguro") return 0.7;
  if (org.priceRange === "no_confirmado") return 0.5;
  const userRank = BUDGET_RANK[answers.budget];
  const orgRank = BUDGET_RANK[org.priceRange];
  if (orgRank < 0) return 0.5;
  const distance = Math.abs(userRank - orgRank);
  if (distance === 0) return 1;
  if (distance === 1) return 0.6;
  return 0.2;
}

function labelFor(score: number): MatchLabel {
  if (score >= 85) return "Excellent Match";
  if (score >= 70) return "Very Good Match";
  if (score >= 55) return "Good Match";
  if (score >= 40) return "Possible Match";
  return "Weak Match";
}

function reasonsFor(answers: SportMatchAnswers, org: Organization, fits: Record<string, number>): string[] {
  const reasons: string[] = [];
  if (fits.location >= 1) reasons.push("Entrena en tu distrito o muy cerca.");
  else if (fits.location >= 0.6) reasons.push("Tiene sedes cerca de tu zona.");
  if (fits.schedule >= 1) reasons.push("Coincide con tus días y horario preferidos.");
  else if (fits.schedule >= 0.6) reasons.push("Tiene sesiones en tus días disponibles.");
  if (fits.level >= 1) {
    reasons.push(
      answers.level === "nunca_practique" || answers.level === "principiante"
        ? "Acepta principiantes."
        : "Tiene grupos de tu nivel."
    );
  }
  if (fits.environment >= 1) reasons.push("El ambiente de la comunidad coincide con lo que buscas.");
  if (fits.goal >= 0.75) reasons.push("Está alineado con tu objetivo.");
  if (org.trialClassAvailable) reasons.push("Ofrece clase de prueba.");
  if (fits.budget >= 1) reasons.push("El precio está dentro de tu presupuesto.");

  // 006-no-empty-results FR-003: sport is scored (fits.sport, weighted into WEIGHTS.sport) but
  // never produced a reason of its own. Fallback-only — only backfilled when it's genuinely one
  // of the few (or only) true things going for a weak-scoring organization — so orgs that already
  // have real reasons keep exactly the same reasons list as before (no regression). The
  // `fits.sport >= 1` guard is defensive: calculateMatches only calls this on sport-eligible orgs
  // post-fix, so it's always true here, but it protects any future caller from fabricating a
  // sport reason for an org that doesn't actually offer it (BR-016).
  if (reasons.length === 0 && fits.sport >= 1) {
    reasons.push(`Ofrece ${SPORT_LABELS[answers.sport].toLowerCase()}.`);
  }

  return reasons.slice(0, 5);
}

export function calculateMatches(answers: SportMatchAnswers, organizations: Organization[]): MatchResult[] {
  // 006-no-empty-results FR-002: an organization that does not offer the requested sport is
  // never eligible, regardless of how well it scores on every other dimension — "closest
  // available" never means "wrong sport." This filter is new: previously nothing in this
  // function hard-excluded on fits.sport, so a wrong-sport org could leak into results if it
  // scored well enough on location/schedule/budget to produce reasons on its own.
  const eligible = organizations.filter((org) => sportFit(answers, org) > 0);

  const scored = eligible.map((org) => {
    const fits = {
      goal: goalFit(answers, org),
      sport: sportFit(answers, org),
      schedule: scheduleFit(answers, org),
      location: locationFit(answers, org),
      level: levelFit(answers, org),
      environment: environmentFit(answers, org),
      budget: budgetFit(answers, org),
    };
    const score = Math.round(
      (fits.goal * WEIGHTS.goal +
        fits.sport * WEIGHTS.sport +
        fits.schedule * WEIGHTS.schedule +
        fits.location * WEIGHTS.location +
        fits.level * WEIGHTS.level +
        fits.environment * WEIGHTS.environment +
        fits.budget * WEIGHTS.budget) *
        100
    );
    const reasons = reasonsFor(answers, org, fits);
    return { organization: org, score, label: labelFor(score), reasons };
  });

  // 006-no-empty-results FR-001: no longer filtered by reasons.length > 0 — an organization that
  // offers the requested sport is always shown, even if it scores weakly on every other
  // dimension. reasonsFor() guarantees at least the sport-offer reason in that case (FR-003).
  // Post-fix, an empty return here is an unambiguous signal that zero organizations in the
  // catalog offer the requested sport at all (research.md R2).
  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}
