/**
 * Client wrapper for the extract-match-answers Edge Function (010-ai-freetext-sport-match) —
 * turns a free-text sentence into a partial SportMatchAnswers via a server-side Claude Haiku
 * 4.5 call over OpenRouter. Never throws: any failure resolves to a well-typed "extract nothing,
 * fall back" result so callers always have one simple branch (contracts/extract-match-answers.md).
 */

import { supabase } from "./supabaseClient";
import type { SportMatchAnswers } from "../../types";

export interface ExtractionResult {
  extracted: Partial<SportMatchAnswers>;
  missing: (keyof SportMatchAnswers)[];
  ok: boolean;
}

// Same order QUESTIONS is defined in SportMatch.tsx — kept as a separate constant here (not
// imported from the page component) so this module has no UI dependency, per
// docs/base-standards.md's isolate-business-logic-from-IO/framework rule.
const ANSWER_ORDER: (keyof SportMatchAnswers)[] = [
  "goal",
  "sport",
  "district",
  "days",
  "time",
  "level",
  "budget",
  "environment",
];

function emptyFailureResult(): ExtractionResult {
  return { extracted: {}, missing: [...ANSWER_ORDER], ok: false };
}

export async function extractMatchAnswers(freeText: string): Promise<ExtractionResult> {
  try {
    const { data, error } = await supabase.functions.invoke("extract-match-answers", {
      body: { freeText },
    });
    if (error || !data) return emptyFailureResult();
    return data as ExtractionResult;
  } catch (err) {
    console.error("[MatchPoint] Free-text extraction failed", err instanceof Error ? err.message : err);
    return emptyFailureResult();
  }
}

export type RoutingDecision =
  | { action: "finalize" }
  | { action: "askMissing"; startAt: keyof SportMatchAnswers }
  | { action: "fallback" };

/**
 * Pure routing decision — the piece Constitution Principle III requires TDD coverage for, since
 * it gates whether possibly-incomplete data reaches finalizeMatch() (never guesses, FR-005).
 */
export function decideNextStep(result: ExtractionResult): RoutingDecision {
  if (!result.ok) return { action: "fallback" };
  if (result.missing.length === 0) return { action: "finalize" };

  const firstMissing = ANSWER_ORDER.find((key) => result.missing.includes(key));
  return { action: "askMissing", startAt: firstMissing ?? ANSWER_ORDER[0] };
}
