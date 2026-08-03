# Backend Plan — No Empty Sport Match™ Results

Feature: `006-no-empty-results` · Branch: `006-no-empty-results` (off `main`, which has 001-005's work merged, minus 005-analytics-funnel which is still an unmerged PR on its own branch — this feature doesn't depend on it) · Spec: `specs/006-no-empty-results/spec.md`

Status: PLAN ONLY, no code changes made. This is a client-side matching-logic bug fix — there is no new entity, no new endpoint, no schema migration. `docs/data-model.md`, `docs/database-schema.md`, and `docs/api-contracts.md` need at most one clarifying-sentence doc-sync each (§6); nothing structural changes in any of them.

---

## 0. TL;DR for the implementer

1. `app/src/lib/matching.ts`'s `calculateMatches()` gets a **new explicit sport-eligibility filter** (`organizations.filter(org => sportFit(...) > 0)`) applied *before* scoring, and **loses** the `.filter((r) => r.reasons.length > 0)` at the end. These are two separate changes, not one — see §1.2 for why skipping the first one would be a regression, not a fix.
2. `reasonsFor()` gets one new fallback line: if an eligible organization produced zero reasons from every other dimension, push a reason stating it offers the requested sport. Existing reasons are untouched otherwise (no reordering, no dedup change).
3. Post-fix, `results.length === 0` in `Results.tsx` becomes an **unambiguous** signal for "zero organizations in the catalog offer this sport" — no new field, no new return type, no context change needed to distinguish the two states from the spec. §2 proves this algebraically and flags the one pre-existing exception (fetch failure) that also collapses to `results.length === 0` and is *not* fixed by this feature — flag this to the user, don't silently patch it.
4. `Results.tsx`'s existing `results.length === 0` branch is rewritten with new copy + a "choose a different sport" primary action (FR-009); its success-path branch gains a persistent "change your answers" secondary action (FR-008).
5. `SportMatch.tsx` gains a small `location.state`-based mechanism to start the questionnaire at the sport question instead of question 0, reusing the exact pattern `OrganizationProfile.tsx` already uses for `resultRank` (§4) — no new routing library, no generalized "jump to any step" feature.
6. `app/src/lib/matching.test.ts` **already exists** (three describe blocks, real regression coverage for the `levelFit` NaN bug). This is not a from-scratch test file — extend it. One of its existing tests (§5.1) needs a rename/refocus, not a rewrite, because it turns out to already be testing something adjacent to (not the same as) what this feature fixes.
7. **A genuine, previously-undetected bug** falls out of this analysis: today, an organization that does **not** offer the requested sport can still appear in results if it happens to score well on location/schedule/budget — because `reasonsFor()` never looks at `fits.sport`, and neither does the exclusion filter. This is exactly what FR-002 requires fixing, and it's a bigger, more clearly wrong behavior than the "drops good matches" bug already root-caused. See §1.2 for a concrete failure scenario and why removing only the `reasons.length > 0` filter (without adding the sport filter) would make this worse, not better.

---

## 1. The `matching.ts` fix, in detail

### 1.1 Current code (for reference — do not re-paste stale line numbers, read the live file before editing)

```ts
export function calculateMatches(answers: SportMatchAnswers, organizations: Organization[]): MatchResult[] {
  const scored = organizations.map((org) => {
    const fits = { goal: goalFit(...), sport: sportFit(...), schedule: scheduleFit(...), location: locationFit(...), level: levelFit(...), environment: environmentFit(...), budget: budgetFit(...) };
    const score = Math.round(/* weighted sum */);
    const reasons = reasonsFor(answers, org, fits);
    return { organization: org, score, label: labelFor(score), reasons };
  });

  return scored
    .filter((r) => r.reasons.length > 0)   // ← BR-015 violation: drops orgs with 0 reasons, even sport-matching ones
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
```

`sportFit()` is computed into `fits.sport` and weighted 0.2 into `score`, but **nothing in this function ever hard-excludes on it**. The only thing keeping a wrong-sport org out of results today is the accident that it also happens to score badly enough on every other dimension to produce zero `reasonsFor()` lines.

### 1.2 The bug this uncovers: wrong-sport organizations can already leak into results today

Construct: user wants `triatlon` in `San Isidro`, `mar` mornings, `no_seguro` budget. An organization offers **only** `natacion` (not triatlon), but is based in `San Isidro`, has a `mar` morning schedule, and `priceRange` unconfirmed:

- `locationFit` = 1 (same district) → `fits.location >= 1` → reason: `"Entrena en tu distrito o muy cerca."`
- `scheduleFit` = 1 (day+time match) → `fits.schedule >= 1` → reason: `"Coincide con tus días y horario preferidos."`
- `budgetFit` = 0.5 (unconfirmed price, `answers.budget === "no_seguro"` → actually 0.7 branch) → below the `>= 1` threshold, no reason, but doesn't matter — two reasons already exist.
- `sportFit` = **0** (doesn't offer triatlon) — but `reasonsFor()` never reads `fits.sport`, so this has zero effect on whether the org is shown.

Today's filter (`reasons.length > 0`) passes this organization through. Its score is still meaningfully high (goal + location + schedule + budget all contribute; only the 20%-weighted sport term is zeroed), so it can rank as a "Good Match" or better for a sport it doesn't even offer. `app/src/lib/matching.test.ts`'s existing "no strong match" test (§5.1) happens not to trigger this because its fixture also scores badly on every *other* dimension — it's testing a different (also real, but narrower) case.

**Implication for the fix**: simply deleting `.filter((r) => r.reasons.length > 0)` without adding an explicit sport-based exclusion would make this existing bug *worse* — every organization in the catalog would appear for every query, regardless of sport, since nothing else in the function excludes anything. FR-002 ("must continue to exclude any organization that does not offer the user's requested sport") is not automatically satisfied by removing the reasons filter; it requires a **new, explicit** filter that doesn't exist in the code today.

### 1.3 The fix

```ts
export function calculateMatches(answers: SportMatchAnswers, organizations: Organization[]): MatchResult[] {
  // FR-002 (006-no-empty-results): an organization that does not offer the requested sport is
  // never eligible, regardless of how well it scores on every other dimension — "closest
  // available" never means "wrong sport." This filter is new: previously nothing in this
  // function hard-excluded on fits.sport (see backend plan .claude/doc/no-empty-results/backend.md
  // §1.2 for the latent bug this closes — a wrong-sport org could leak into results if it scored
  // well enough on location/schedule/budget to produce reasons on its own).
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

  // FR-001 (006-no-empty-results): no longer filtered by reasons.length > 0. An organization that
  // offers the requested sport is always shown, even if it scores weakly on every other
  // dimension — reasonsFor() guarantees at least the sport-offer reason in that case (FR-003, §1.4).
  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}
```

Note `sportFit(answers, org) > 0` is recomputed once in the `eligible` filter and again inside `fits.sport` in the `map` — that's an intentional, cheap duplication (it's a single array `.includes()` check, not a query) rather than restructuring the whole function to thread a pre-computed value through; keeps the diff small and each function's contract (`(answers, org) => number`) unchanged, which matters because `sportFit`/`goalFit`/etc. are also implicitly documented by `docs/matching-engine.md`'s pseudocode as taking exactly those two arguments.

`labelFor()` and the weighted-score formula are **untouched** — FR-004/the spec's Assumptions are explicit that thresholds and scoring are not being redesigned here.

### 1.4 `reasonsFor()` fix — sport as a genuine fallback reason (FR-003)

```ts
import { SPORT_LABELS } from "./labels"; // plain data map, no React/framework dependency — safe in this pure module

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

  // FR-003 (006-no-empty-results): sport is scored (fits.sport, weighted 0.2) but until now never
  // produced a reason of its own. Only surfaced as a fallback — when it's genuinely one of the few
  // (or only) true things going for a weak-scoring organization — so orgs that already have real
  // reasons keep exactly the same reasons list as before this fix (no regression, see matching.test.ts).
  if (reasons.length === 0 && fits.sport >= 1) {
    reasons.push(`Ofrece ${SPORT_LABELS[answers.sport].toLowerCase()}.`);
  }

  return reasons.slice(0, 5);
}
```

Design choices worth flagging explicitly:

- **Fallback-only, not always-on.** The spec's own wording ("when few or no other reasons apply") and the parent task's explicit no-regression test requirement both point the same way: don't prepend "Ofrece X." to every single result — only backfill it when `reasons` would otherwise be empty. An always-on version would change the reasons shown for every existing result (violates "no fabrication of *new* copy where honest copy already existed" in spirit, and breaks the no-regression test).
- **`fits.sport >= 1` guard is defensive, not load-bearing.** Since `reasonsFor` is only ever called on `eligible` orgs post-fix (§1.3), `fits.sport` will always be exactly `1` when this runs. The guard costs nothing and protects against a future caller reusing `reasonsFor` on an unfiltered list and accidentally fabricating a sport reason for an org that doesn't actually offer the sport (which would violate BR-016).
- **Copy**: `SPORT_LABELS` (in `app/src/lib/labels.ts`) maps `"running" → "Running"` etc. — capitalized, meant for headings/badges. Lowercased here (`.toLowerCase()`) because it's mid-sentence: `"Ofrece running."`, `"Ofrece triatlón."`, `"Ofrece centro de entrenamiento."` — matches the spec text's own example verbatim (`"Ofrece running."`). Confirm this reads naturally for `"Ofrece centro de entrenamiento."` — it's a little awkward but consistent with how `SPORT_LABELS` already renders that value elsewhere in the UI; not worth a special case for one sport.
- **`SPORT_LABELS` import**: `matching.ts` currently only imports types. `labels.ts` is pure data (`Record<string, string>` maps + one small `badgeClass()` helper) with zero React/DOM dependency, so importing just `SPORT_LABELS` from it doesn't violate `docs/base-standards.md`'s "pure domain logic isolated from framework/IO code" rule. If the implementer prefers zero coupling to `labels.ts`, an equally valid alternative is a small private `sportsCopy` map inside `matching.ts` — flag this as a judgment call, not a hard requirement either way, but importing avoids a second copy of the sport-name vocabulary (matches the project's existing no-duplicate-vocabulary discipline, e.g. `sessionMappers.ts`'s comment about reusing `GOAL_MAP` rather than duplicating it).

---

## 2. Proving `results.length === 0` is an unambiguous post-fix signal (and the one thing it does NOT distinguish)

The parent task explicitly asks whether `calculateMatches` needs a richer return shape (e.g. "N checked, M offer sport") to let `Results.tsx` tell the two spec states apart, or whether `results.length === 0` alone is now sufit. It is sufficient — **no new field, no new context state, no `calculateMatches` signature change needed.**

Reasoning, directly from the code in §1.3:

- `eligible = organizations.filter(sportFit > 0)`. `eligible.length === 0` **iff** zero organizations in the catalog offer `answers.sport`.
- `scored = eligible.map(...)` — `.map()` preserves array length exactly. `scored.length === eligible.length`.
- `scored.sort(...).slice(0, 5)` — `.slice(0, 5)` on a non-empty array always returns a non-empty array (returns `min(length, 5)` elements). It cannot turn a non-empty array into an empty one.
- Therefore: **`calculateMatches(...).length === 0` iff `eligible.length === 0` iff no organization in the catalog offers the requested sport.** This is exactly User Story 2 / FR-005's "no organization offers this sport at all" case, and *only* that case, for any input where `organizations` is the real, successfully-fetched catalog.

So `Results.tsx`'s existing `if (results.length === 0)` branch (already present, already reads `results` off `useMatchSession()`) is, post-fix, **precisely** the branch for the true-empty-catalog message — it just needs new copy and a new primary action (§3), not a new signal.

### 2.1 The one pre-existing exception — flag, do not silently fix

`MatchSessionContext.tsx`'s `finalizeMatch()` already collapses a **catalog-fetch failure** to the same outcome:

```ts
try {
  const orgs = await getOrganizations();
  computed = calculateMatches(answers, orgs);
} catch (err) {
  console.error(...);
  computed = []; // degrade to the existing no-results screen, not a crash
}
```

If `getOrganizations()` throws (network error, Supabase outage, etc.), `results` is `[]` for a reason that has nothing to do with sport coverage — the catalog might be fully populated, we just couldn't read it. Today this already renders the same "no match" screen as a legitimately empty catalog; after this fix, it will render the **new** true-empty-catalog message ("no communities for this sport yet"), which is not actually true — it's a fetch failure, not a coverage gap.

This conflation **predates** this feature (the existing comment literally says "degrade to the existing no-results screen, not a crash") and the spec (`006-no-empty-results`) does not ask for a third, distinct network-error state — its FR-005 is scoped to distinguishing "weak matches" from "no sport coverage," not from "fetch failed." Adding a third state would be scope expansion beyond what was clarified and approved. **Flag this to the user/PO explicitly rather than silently building a fix or silently leaving it mislabeled** — two reasonable options, either is fine but should be a conscious choice, not an accident:

1. Leave it as-is (accept that a rare fetch failure will show the "wrong sport" message instead of a generic error message) — lowest effort, matches current behavior's precedent of degrading silently.
2. Have `finalizeMatch` set some additional in-context flag (e.g. `catalogLoadFailed: boolean`) so `Results.tsx` can show the existing generic error copy (`docs/microcopy.md`'s "Match error: 'No pude calcular tu Match en este momento. Probemos otra vez.'") instead of the new true-empty message when the cause was a fetch failure, not a genuine coverage gap.

Recommend flagging this as an open question for the user rather than picking silently — it's a legitimate judgment call about scope, not an implementation detail.

---

## 3. `Results.tsx` changes

Current structure: one `if (results.length === 0) return <...>` early-return branch, then the normal results-list render.

### 3.1 True-empty-catalog branch (was: generic "no match" branch)

Replace copy and action. Per FR-009 (clarified): primary action must be "choose a different sport," navigating specifically to the sport question, **not** a full restart. This means this branch must **not** call `resetMatch()` — the existing `answers` (goal, district, days, etc.) stay in context; only the sport question is revisited. Contrast with §3.2's action, which *does* reset everything.

```tsx
if (results.length === 0) {
  return (
    <div className="screen text-center">
      <div className="spacer" />
      <MatchGuide text="Match™" />
      <h2>Todavía no tenemos comunidades de este deporte.</h2>
      <p>No es algo que puedas resolver cambiando tus otras respuestas — elige otro deporte y sigo buscando.</p>
      <button
        className="btn btn-primary"
        onClick={() => navigate("/match", { state: { startAt: "sport" } })}
      >
        Elegir otro deporte
      </button>
      <div className="spacer" />
    </div>
  );
}
```

Notes:

- Exact copy above is a **draft matching the documented voice** (`docs/match-character.md`: clear, warm, not blaming the user; `docs/microcopy.md`'s voice principles) — not a final, product-owner-approved string. Flag it for review; treat `docs/microcopy.md` as the place it needs to land once approved (§6.2), not this plan.
- Deliberately does **not** offer "expand district" / "change schedule" — per the spec's own Assumptions section, those don't help when the catalog has literally nothing for the sport, and `docs/ux-flows.md`'s current no-results actions list needs updating to match (§6.4).
- Should NOT call `resetMatch()`. Should still fire `no_match_viewed` (§7 — no analytics schema change needed; the event's meaning narrows correctly, it now fires *only* for the genuinely-empty case instead of an ambiguous one).

### 3.2 Success-path branch — persistent "change your answers" action (FR-008)

Add a secondary action after the results list, unconditional on match quality (not just shown when results are weak):

```tsx
return (
  <div className="screen screen-tight">
    <MatchGuide text="Match™" />
    <h1>Tu Match está listo.</h1>
    <p>...</p>

    {results.map((result, index) => ( /* unchanged */ ))}

    <button
      className="link-button"
      onClick={() => {
        resetMatch();
        navigate("/match");
      }}
    >
      Cambiar mis respuestas
    </button>
  </div>
);
```

This reuses the exact `resetMatch()` + `navigate("/match")` pattern already used in the pre-fix empty-state branch (per the task brief) — this is a **full restart**, deliberately different from §3.1's sport-only jump. Two different actions, two different mechanisms, both already justified by their respective FRs:

- FR-008's "change your answers" = full restart (any answer might be the reason results feel weak).
- FR-009's "choose a different sport" = sport-only jump (only the sport is provably the blocker in that specific state).

`link-button` class already exists and is used for `SportMatch.tsx`'s "‹ Atrás" — reuse it rather than inventing a new secondary-button style; if design wants it visually distinct from a back-navigation link, flag that as a design-system question, not something to solve in this plan.

### 3.3 No component-shape change needed

`MatchResult`, `useMatchSession()`'s returned shape, and the `results.map(...)` card rendering are all untouched. This is a two-branch copy/action change, not a restructure.

---

## 4. `SportMatch.tsx` — return-to-sport-question mechanism (FR-009)

Today: `const [step, setStep] = useState(0);` — always starts at question 0 (goal), no way to initialize elsewhere.

Minimal mechanism, following the exact `location.state` pattern `OrganizationProfile.tsx` already uses for `resultRank`:

```tsx
import { useLocation, useNavigate } from "react-router-dom";
// ...

const SPORT_QUESTION_INDEX = QUESTIONS.findIndex((q) => q.key === "sport"); // 1, but derived, not hardcoded

export function SportMatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { answers, updateAnswers, finalizeMatch } = useMatchSession();
  const startAt = (location.state as { startAt?: "sport" } | null)?.startAt;
  const [step, setStep] = useState(() => (startAt === "sport" ? SPORT_QUESTION_INDEX : 0));
  // ...rest unchanged
}
```

Why this satisfies FR-009's "keeping other already-answered context if reasonably possible" without over-engineering:

- `answers` lives in `MatchSessionContext`, not local component state — it is **not** cleared just because `SportMatch` re-mounts, and `Results.tsx`'s §3.1 action deliberately does **not** call `resetMatch()`. So `answers.goal`, `answers.district`, `answers.days`, etc. from the previous run are still sitting in context when the questionnaire re-opens at the sport question.
- Stepping `step` straight to index 1 means: if the user taps "‹ Atrás" from the sport question, they land back on the goal question showing whatever they'd previously answered (not blank) — this falls out for free from the existing `QUESTIONS`/`step` architecture, no extra plumbing needed.
- This is **not** a general "jump to any question index" feature — the mechanism is a single literal (`"sport"`), not an arbitrary step number passed from outside. Adding a generic `startAtStep: number` prop/state would be over-engineering relative to what FR-009 actually asks for (per the task brief's own explicit caution against this).
- `SPORT_QUESTION_INDEX` is derived from `QUESTIONS.findIndex(...)` rather than hardcoded to `1`, so if the questionnaire's question order ever changes, this doesn't silently point at the wrong question.

No change needed to `MatchSessionContext.tsx`, no new route, no query-string parsing.

---

## 5. Test plan — `app/src/lib/matching.test.ts` (TDD, constitution Principle III — NON-NEGOTIABLE for this change)

**The file already exists** (confirm this before telling the implementer to "create" it — it has three describe blocks: `levelFit — real-data regression`, `calculateMatches — shape-integration smoke test`, `calculateMatches — no strong match`). This feature extends it; it does not start from scratch. Per `docs/base-standards.md`: write each new test failing-first against the *current* (pre-fix) `matching.ts`, confirm it fails for the right reason, then implement §1's fix and confirm it passes — do not write the fix first and back-fill tests.

### 5.1 Existing test needs a rename/refocus, not a rewrite

`describe("calculateMatches — no strong match (FR-005, research.md)")` (its `FR-005` reference is from `002-sport-match-engine`'s own spec numbering, unrelated to this feature's `FR-005` — a naming collision worth a comment update so a future reader doesn't confuse the two). Its fixture: org offers `natacion`, user asked for `triatlon` — i.e., this test is actually exercising the **wrong-sport-exclusion** case, not "weak match across the board." Its current assertion (`for (const r of results) expect(r.reasons.length).toBeGreaterThan(0)`) is vacuously true today because `results` happens to be empty for unrelated reasons (bad location/schedule too), and remains vacuously true after the fix because `eligible` correctly excludes it on `sportFit === 0` regardless of anything else.

Action: rename this describe block to something like `calculateMatches — wrong sport is always excluded (FR-002, 006-no-empty-results)`, keep the fixture, and strengthen the assertion to be non-vacuous: assert `results.length === 0` explicitly (today it's coincidentally 0; after the fix it must be 0 *because* of the sport filter, not by accident) — otherwise a future refactor could silently break the sport exclusion and this test would still pass.

### 5.2 New: sport eligibility gate (FR-002) — the bug found in §1.2

```ts
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
```

### 5.3 New: zero-reasons no longer excludes a sport-matching org (FR-001, FR-003)

```ts
describe("calculateMatches — sport-matching org is never dropped for lacking other reasons (FR-001, FR-003)", () => {
  it("includes a sport-matching org that scores weakly on every other dimension, with the sport itself as its one reason", () => {
    const weakButRightSport = fixtureOrg({
      sports: ["running"],
      districts: ["Ventanilla"], // far from user's district, not adjacent
      schedules: [],
      priceRange: "mas_300",
      trialClassAvailable: false,
      adnDeportivo: { beginnerFriendliness: 0, competitiveness: 0, socialAtmosphere: 0, trainingIntensity: 0, performanceFocus: 0, inclusiveness: 0, environments: ["alto_rendimiento"] },
    });
    const answers = fixtureAnswers({ sport: "running", district: "San Isidro", environment: "social", budget: "gratis", goal: "conocer_gente" });
    const results = calculateMatches(answers, [weakButRightSport]);
    expect(results).toHaveLength(1);
    expect(results[0].reasons).toEqual(["Ofrece running."]);
    expect(results[0].label).toBe("Weak Match"); // honest label, not upgraded — FR-004
  });

  it("does not append the sport reason when real reasons already exist (no regression)", () => {
    const strongOrg = fixtureOrg(); // fixtureOrg's defaults already produce real reasons per the existing smoke test
    const results = calculateMatches(fixtureAnswers(), [strongOrg]);
    expect(results[0].reasons.some((r) => r.startsWith("Ofrece "))).toBe(false);
  });
});
```

### 5.4 New: true-empty-catalog case is distinguishable and unambiguous (FR-005, §2)

```ts
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
```

### 5.5 New: 5-result cap unchanged (FR-007) — not currently covered by any existing test

```ts
describe("calculateMatches — 5-result cap unchanged (FR-007)", () => {
  it("still caps at 5 results when more than 5 organizations offer the requested sport", () => {
    const orgs = Array.from({ length: 7 }, (_, i) => fixtureOrg({ id: `org-${i}`, sports: ["running"] }));
    const results = calculateMatches(fixtureAnswers({ sport: "running" }), orgs);
    expect(results).toHaveLength(5);
  });
});
```

### 5.6 Regression coverage already adequate, confirm unchanged

The existing `levelFit — real-data regression` and `calculateMatches — shape-integration smoke test` blocks exercise organizations that already offer the fixture's sport (`running`, matching `fixtureAnswers().sport`) — confirm after the fix that these still pass unmodified (they should; the new `eligible` filter doesn't touch them since `sportFit` is `1` in all of their fixtures).

---

## 6. Doc-sync checklist

None of these are optional "nice to have" — `docs/matching-engine.md`, `docs/microcopy.md`, `docs/ux-flows.md`, and `docs/component-library.md` all currently describe the **pre-fix** single-empty-state model, and will actively mislead the next person who reads them once this ships if left alone.

### 6.1 `docs/matching-engine.md`

- **"Match score V1" pseudocode** — add one clarifying line under the pseudocode block: sport is not just a weighted term, it's also a hard eligibility gate (an org with `sportFit = 0` is excluded outright, not merely down-weighted 20%). This was previously implicit/unstated and, per §1.2, actually unimplemented.
- **"Match explanation" → Templates** — add a Sport row, e.g.: `- Sport — "Ofrece running." (used only as a fallback when no other dimension produced a reason — see the no-match section below).`
- **"No-match case" section** (currently: "Never show an empty dead-end state. If there are no strong matches: '...' Then offer: expand district, change schedule, include nearby sports, notify me when new communities appear.") — this section conflates the two states this feature splits apart. Rewrite to state plainly: (a) "weak-but-real matches" is no longer a no-match case at all post-fix — the closest-scoring organizations that offer the sport are always shown, honestly labeled; (b) the only remaining no-match case is zero organizations offering the requested sport, whose only actionable next step is choosing a different sport (expand-district/change-schedule no longer apply here, since the gap isn't answer-shape, it's sport coverage).
- **"Edge cases" section** — the "User selects low budget and all organizations are paid → show closest options" and "User selects beginner and only advanced groups exist" bullets are exactly what this fix now actually delivers (previously aspirational, not implemented) — could add a one-line pointer to this feature as the change that made those true.

### 6.2 `docs/microcopy.md`

- **"Empty states" → "No match" bullet** — currently single entry with the old copy and the now-inapplicable `Ampliar distrito, Cambiar horario, Probar otro deporte` actions. Replace with a true-empty-catalog-specific entry (final copy needs product-owner sign-off; §3.1 has a draft) whose only action is "Elegir otro deporte."
- **"Match explanation copy" → "Reasons pool"** — add the sport-fallback pattern, e.g. `"Ofrece {deporte}."`, so it's documented alongside the other reason templates rather than only living in code.
- **New section or bullet for the persistent "change your answers" action (FR-008)** — e.g. under "Results copy": secondary action copy `"Cambiar mis respuestas."` (draft, §3.2) — this is a new, always-visible UI element that doesn't have any documented copy today.

### 6.3 `docs/component-library.md`

- **`EmptyMatchState` (P1)** — documented today with props `onExpandDistrict`, `onChangeSchedule`, `onRestart` and the old single-state copy. This component was seemingly designed for exactly the "weak matches exist, show closest options + adjust-criteria actions" case — which, post-fix, is no longer a distinct empty state at all (it's just the normal results list). Flag this mismatch explicitly: recommend narrowing `EmptyMatchState`'s documented props to the true-empty-catalog case only (something like `onChooseAnotherSport: () => void`, dropping `onExpandDistrict`/`onChangeSchedule` since those no longer have a state to attach to), or retiring the component doc in favor of inlining its spec directly under the Results flow description. Note also: current `Results.tsx` doesn't actually implement this documented component shape at all (it's inlined) — that drift predates this feature and isn't this fix's job to resolve, but the copy fields at minimum need updating since they're directly affected.
- **No new component needed** for the persistent "change your answers" action — it's a plain secondary button on the existing results screen, not a new reusable pattern per the component-library's own "don't create components ahead of need" rule. Worth a one-line mention under `MatchResultCard`'s section or the Results flow description so it's not entirely undocumented.

### 6.4 `docs/ux-flows.md`

- **Flow 3 → "No-results flow"** (`Trigger: no organization matches criteria above minimum threshold... Actions: expand district, change schedule, try another sport, notify me...`) — rewrite trigger condition to "zero organizations in the catalog offer the requested sport" and narrow actions to "choose a different sport" only, matching FR-009's clarified single primary action. Remove `expand district`/`change schedule`/`notify me` — none of those are being built by this feature and none actually help when the gap is sport coverage, not answer shape.
- **Flow 3 → main section** — add a line noting the always-visible "change your answers" secondary action on the results screen itself (FR-008), since this is a Flow 3 behavior change even though it's not part of the "no-results" sub-flow.

### 6.5 `docs/api-contracts.md` (optional, recommended)

`POST /api/match-sessions`'s "Rules" line (`"store match session; store match results; return up to 5 results; exclude suspended or archived organizations"`) never states the sport-exclusion rule at all — which is arguably part of why it went unimplemented in `matching.ts`. Recommend appending `"; exclude organizations that don't offer the requested sport"` to make the rule explicit in the contract doc, not just implicit in code. Not required by any FR in `006-no-empty-results`'s spec, but directly closes the documentation gap this bug fix's own root cause traces back to — flag as a recommended addition, let the user decide if it's in scope for this PR or a fast-follow.

### 6.6 No changes needed

`docs/data-model.md`, `docs/database-schema.md` — confirmed no entity/column impact. `MatchResult` is persisted one row per organization per session (already true today); this fix changes *which* organizations get scored and *what* their `reasons` array can contain, not the shape of anything written to `match_sessions`/`match_results`. `app/src/lib/data/sessionMappers.ts`/`matchSessions.ts` need no changes — `buildMatchResultRows` already just serializes whatever `MatchResult[]` it's given, `rank` is derived from array index of the already-filtered/sorted/sliced results, `reasons` is stored as `jsonb` with no length/shape constraint tied to the old filter.

---

## 7. Analytics — no schema change, confirm semantics narrow correctly

`app/src/lib/analytics.ts`'s `no_match_viewed` / `results_viewed` events (fired from `Results.tsx`'s existing `useEffect`, keyed off `results.length > 0`) need **no changes**. Post-fix:

- `no_match_viewed` now fires *only* for the genuinely-empty-catalog case (previously ambiguous between that and "weak matches got filtered to nothing") — this is a semantic improvement that falls out of the fix for free, not something requiring new code.
- `results_viewed` now fires for cases that previously hit the dead-end screen (weak-but-real matches) — `resultCount` will reflect the true (possibly small, possibly all-"Weak Match") result set, which is accurate and desired (SC-001).

No new event needed to distinguish the two spec states in analytics, since the existing two events already map 1:1 onto them post-fix. If the user later wants to analyze "how often do we hit true sport-coverage gaps vs. weak matches" as a funnel metric, that's already answerable from `no_match_viewed` vs. `results_viewed` — flag as a nice-to-know, not an action item for this feature.

---

## 8. File change checklist

**Code:**

- `app/src/lib/matching.ts` — §1: add `eligible` sport filter, remove `reasons.length > 0` filter, add sport-fallback reason to `reasonsFor()`.
- `app/src/lib/matching.test.ts` — §5: extend (not create) with new describe blocks; refocus the existing "no strong match" block's name/assertion. Write failing first, per constitution Principle III.
- `app/src/pages/Results.tsx` — §3: new true-empty-catalog copy + "Elegir otro deporte" action (no `resetMatch()`); new persistent "Cambiar mis respuestas" secondary action on the success path (with `resetMatch()`).
- `app/src/pages/SportMatch.tsx` — §4: read `location.state.startAt === "sport"` to initialize `step` at the sport question index; derive the index via `QUESTIONS.findIndex`, don't hardcode.

**Docs:**

- `docs/matching-engine.md` — §6.1: sport-as-hard-gate clarification, sport reason template, rewritten "No-match case" section.
- `docs/microcopy.md` — §6.2: new true-empty-catalog empty-state copy, sport reason in "Reasons pool," new "change your answers" copy.
- `docs/component-library.md` — §6.3: flag/narrow `EmptyMatchState`'s props and copy; note the new persistent secondary action.
- `docs/ux-flows.md` — §6.4: rewrite Flow 3's "No-results flow" trigger/actions; note the persistent secondary action.
- `docs/api-contracts.md` — §6.5: optional, recommended — make the sport-exclusion rule explicit in `POST /api/match-sessions`'s Rules line.

**No changes:** `docs/data-model.md`, `docs/database-schema.md`, `app/src/context/MatchSessionContext.tsx`, `app/src/lib/data/matchSessions.ts`, `app/src/lib/data/sessionMappers.ts`, `app/src/lib/analytics.ts`, `app/src/lib/labels.ts` (only imported from, not modified), any Supabase migration.

---

## 9. Open questions / flags for the user (do not resolve silently)

1. **§2.1** — fetch-failure vs. true-empty-catalog conflation in `finalizeMatch()`'s existing `catch` block. Pre-existing, out of this feature's clarified scope, but will now surface as a *specifically wrong* message ("no communities for this sport") instead of a generic degrade. Decide: accept as-is, or add a minimal `catalogLoadFailed` flag as a fast-follow.
2. **§3.1/§3.2 copy drafts** — not product-owner-approved strings, just voice-matched drafts. Needs a real copy pass before merge (`docs/microcopy.md` is the living source of truth once approved).
3. **§6.3 `EmptyMatchState`** — component-library drift already exists between the documented component and `Results.tsx`'s actual inline implementation, independent of this fix. Recommend narrowing the doc to match what this fix actually needs, but full doc/code parity for this component is a separate, pre-existing cleanup if the user wants it done properly.
4. **§6.5 api-contracts.md** — optional addition, not required by any FR; flagging because the missing rule is arguably the documentation gap that let this bug ship unnoticed in the first place.
