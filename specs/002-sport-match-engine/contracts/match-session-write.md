# Contract: Match session + results write (data-access layer)

Like `organizations-read.md` (001-data-foundation), this ships a **data-access function**, not an HTTP endpoint. `docs/api-contracts.md` documents `POST /api/match-sessions`'s JSON shape; that contract's preamble already allows a direct Supabase-client implementation as valid (see plan.md's Constitution Check / implementation note). This file documents the function actually shipped.

## Function

```typescript
// app/src/lib/data/matchSessions.ts
export interface PersistMatchOutcome {
  matchSessionId: string; // always present — client-generated, even on failure
  persisted: boolean;     // false = the write failed; results are still valid
}

export async function createMatchSession(
  answers: SportMatchAnswers,
  results: MatchResult[]
): Promise<PersistMatchOutcome>;
```

- Takes the already-captured answers and the already-computed `MatchResult[]` (from `calculateMatches()` — no matching logic lives here).
- Never throws. Every failure mode collapses to `{ matchSessionId, persisted: false }`.
- Attempts the `match_sessions` insert even when `results` is empty (the "no strong match" case) — only the `match_results` insert is skipped then. This is what makes SC-002 ("100% of completed questionnaires produce exactly one stored session record") hold regardless of match outcome.

## Guarantees

| # | Guarantee | Spec ref |
|---|---|---|
| C1 | Anonymous (anon key, no login) — never requires auth. | FR-001, Principle I |
| C2 | A save failure never throws and never prevents the caller from showing already-computed results. | FR-009 |
| C3 | No two sessions/results can collide — each id is a fresh `crypto.randomUUID()`. | — |
| C4 | An anon `match_sessions` insert with a non-null `user_id` is rejected by RLS. | data-model.md, research.md R1 |
| C5 | Nothing written by this function is ever readable back via the anon key (no SELECT policy exists). | FR-006, SC-005 |
| C6 | `match_results` rows are 1-based ranked in the same order as the input `MatchResult[]`. | — |
| C7 | Reuses `getOrganizations()` (001-data-foundation) unmodified and unscoped (no sport/district filter) as the catalog matching runs against. | research.md R3 |

## Error behavior

- Sport/district id lookup miss (e.g. a seeded-data drift between the questionnaire's district list and `districts.name`) → caught, `persisted: false`, logged.
- Network/insert error on either table → caught, `persisted: false`, logged. If the session insert itself fails, the results insert is never attempted (its FK would fail anyway).
- Missing/undefined Supabase env vars → same fail-fast behavior as `organizations.ts` (throws at client init, not at call time).

## Verification (see quickstart.md)

- Unit: `sessionMappers.ts`'s vocabulary tables round-trip correctly (DB→app→DB is the identity for every enum value); `matching.ts`'s `levelFit()` regression test (research.md R2).
- Integration (live DB): an anon insert of a session + results succeeds; a subsequent `select()` with the same anon client returns zero rows for both tables (proves C5 concretely); an anon insert with non-null `user_id` is rejected (proves C4).
