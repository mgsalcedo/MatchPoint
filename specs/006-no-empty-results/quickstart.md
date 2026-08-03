# Quickstart: No Empty Sport Match™ Results — validation

No setup, no migration, no owner action — this is a pure client-side logic + copy fix. `npm install && npm run dev` in `app/` (unchanged).

## Validate (proves the feature works)

| Check | Command / action | Expected | Proves |
|---|---|---|---|
| Unit — matching logic | `npm test` (Vitest) in `app/` | `matching.test.ts`: sport-eligibility gate, zero-reasons-no-longer-excludes, true-empty-catalog signal, 5-result cap, all passing; existing regression tests unmodified and still passing | R1, R2, R4, R6 |
| Weak-but-real match | In the running app: complete Sport Match™ with an uncommon combination (e.g. an unusual schedule/budget/environment) for a sport that IS in the catalog | Results screen shows at least one organization offering that sport — never the old "no match, try again" dead end | User Story 1, SC-001 |
| Wrong-sport exclusion | Same walkthrough, inspect the shown results | Every organization shown genuinely offers the requested sport — none are a "close enough" org for a different sport | User Story 1 (Acceptance Scenario 2), SC-002 |
| Honest reasons/labels | Same walkthrough | An organization with no other true reasons shows only "Ofrece {sport}." and an honest low label (e.g. "Weak Match") — never upgraded | SC-003 |
| True empty catalog | Complete Sport Match™ for a sport with zero organizations in the catalog (e.g. a seed environment missing that sport entirely) | Results screen shows the distinct "no communities for this sport yet" message with a single "Elegir otro deporte" action — not the same copy as the weak-match case | User Story 2, SC-004 |
| Choose a different sport | From the true-empty-catalog screen, click "Elegir otro deporte" | Lands back on the Sport Match™ flow at the sport question specifically (not the goal question), with previously-answered context (district, days, etc.) still intact | FR-009 |
| Change your answers | From a normal (non-empty) results screen | A persistent "Cambiar mis respuestas" action is visible regardless of match quality, and restarts the full questionnaire | FR-008 |

## Out of scope (do not do this feature)

- Any change to score weights, `labelFor()`'s thresholds, or the 5-result cap value itself.
- Distinguishing a catalog-fetch failure from a true sport-coverage gap (research.md R3 — owner-confirmed, left as-is).
- Any visual/design-system change (separate, already-planned feature).
- Any change to the Sport Match™ question flow itself beyond the sport-question entry point (FR-009).
