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

// Must match QUESTIONS' order in SportMatch.tsx — kept as a separate constant here (not
// imported from the page component) so this module has no UI dependency, per
// docs/base-standards.md's isolate-business-logic-from-IO/framework rule.
export const ANSWER_ORDER: (keyof SportMatchAnswers)[] = [
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

/**
 * Scans forward from `fromIndex` (in ANSWER_ORDER/QUESTIONS order) and returns the index of the
 * first field NOT already present in `answers` — skipping every already-answered field along the
 * way, not just landing on the first one. Returns `ANSWER_ORDER.length` when everything from
 * `fromIndex` onward is already answered (caller should finalize instead of asking more).
 *
 * This is the piece that makes FR-005 ("already-extracted fields MUST be pre-filled, not
 * re-asked") actually hold as the user taps through subsequent questions — landing on the first
 * missing field alone isn't enough if later fields were also extracted; without this, a partial
 * extraction would only skip the very first gap and then re-ask everything after it.
 */
export function nextUnansweredIndex(fromIndex: number, answers: Partial<SportMatchAnswers>): number {
  let i = fromIndex;
  while (i < ANSWER_ORDER.length && answers[ANSWER_ORDER[i]] !== undefined) {
    i++;
  }
  return i;
}
