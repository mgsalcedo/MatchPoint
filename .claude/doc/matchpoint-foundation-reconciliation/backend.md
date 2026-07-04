# Backend Plan — Reconcile `docs/data-model.md` with the imported foundation pack

Status: PLAN ONLY. No code exists yet in this repo (verified — only `docs/`, `.claude/`, `.specify/` are present; no `app/`, `src/`, or migrations). This is a pure documentation-reconciliation pass that must land before `/speckit-plan` fixes a schema for any feature. The calling session applies these edits directly.

Scope of this plan: (1) rewrite `docs/data-model.md`, (2) edit four other docs/config files as a consequence, (3) preserve genuinely open questions.

---

## 1. Resolution of the two conflicts

### 1.1 Provider → Organization

Adopt `Organization` as the sole supply-side entity, per Product Principle 29 and the ADN Deportivo™ schema in `docs/matching-engine.md`. `Provider` is retired from the data model (kept only as a note that "provider" may still appear in internal/technical shorthand per Product Principle 21, but the entity name is `Organization`).

**Community-as-sub-entity: confirmed dead for PMV.** Checked every imported doc for a case where one Organization needs multiple distinct sub-programs with separate profiles/URLs/match-eligibility:

- `docs/matching-engine.md`'s ADN Deportivo™ schema puts `Schedule` as an attribute bag directly on the organization (`days, start time, end time, session type, level per session`) — i.e., an array of session objects, not a foreign-keyed sub-entity with its own identity.
- The match score pseudocode (`scheduleFit(user.days, user.time, organization.schedules)`) reads schedules straight off the organization, never off a child entity.
- `docs/ux-flows.md` Flow 3/4 result cards and profile show one org = one profile = one "Ver comunidad" target. There's no UI concept of picking among an org's sub-programs.
- Lead fields reference `organization ID` + `match session ID` (the user's Sport Match session), never a "community ID" distinct from organization ID.
- The one place multiple session types coexist is *within* `Organization.schedules[]` (e.g., a club can have a beginner Tuesday session and an advanced Thursday session as two array entries), which the match engine already treats as attributes to score against, not separate matchable/contactable entities.

Conclusion: for PMV, one Organization profile = one matchable/contactable unit; `schedules` is an embedded array of session objects (days, start, end, session type, level), not a standalone entity with its own ID, relationships, or lifecycle. This directly answers the "does Community collapse into Organization" question — yes, fully, for PMV. Flag this as a **resolved former open question**, not silently deleted (see §4).

Residual open question to keep (do not silently resolve): whether V1.1+ will need a true sub-entity once organizations want distinct sub-program profiles (e.g., a training center with a running team AND a swim academy under one legal entity, each needing its own ADN Deportivo™, its own lead attribution, its own claim status). Nothing in the imported docs rules this out for later — it's just out of scope now. Keep this explicitly in "Open questions."

### 1.2 Booking state machine → Lead model

Adopt `Lead` as the PMV entity for the contact event, per `docs/ux-flows.md` Flow 5 and Product Principle 25. `Booking` and its state machine (`requested → confirmed → attended/no-show/cancelled`) are removed from the PMV data model entirely and explicitly deferred to V2 (`docs/product-brief.md` §21 roadmap: "V2: ... booking management").

Lead attributes (union of Product Principle 25 and Flow 5's lead-fields list — identical sets, cross-checked, no conflict): `id, userId, organizationId, matchSessionId, contactType, source, timestamp, sport, goal, district, resultRank`.

- `contactType` — enum: `whatsapp | instagram | booking_link | call | contact_form | trial_class_request` (from `docs/vision.md` North Star "valid contact actions" + `docs/product-brief.md` §14).
- `source` — where the contact button was clicked (e.g. `results_card`, `organization_profile`) — needed for analytics per Principle 25 but not spelled out in exact enum values anywhere in the imported docs; implementer should pick a small fixed enum and document it inline in code, not invent new persisted taxonomy without updating this doc.

No in-platform booking/attendance/no-show state exists at PMV. `docs/matching-engine.md`'s "Learning loop" section explicitly lists "booking completed, attendance confirmed" as **future** signals, confirming V2 scope.

### 1.3 SearchQuery/Match → SportMatchSession

The old doc's vague "SearchQuery / Match" placeholder becomes a proper `SportMatchSession` entity, because `Lead.matchSessionId` is a foreign key — it must reference something with a persisted ID even though the PMV doesn't need long-term analytics on it. This resolves the old doc's open question "is Match a persisted, explainable ranking or ephemeral?" — it must be persisted at least long enough (and with a stable ID) to be referenced by any Lead created downstream, even if just written once at questionnaire-completion time and never updated again.

Attributes: `id, userId (nullable — user may not be authenticated yet when the session is created, per "no login before contact" principle), goal, sport, district, days, time, level, budget, environment, createdAt`. Match results (ranked organization list + scores + reasons) are derived/computed from this input, not necessarily persisted per-result at PMV — the doc should note that persisting full result sets is optional/future (needed for "returning user / continue previous Match" in Flow 6, but Flow 6 says PMV may simplify by always starting fresh, so this is explicitly optional now).

### 1.4 Coach and Event — still standalone or fold in?

**Coach**: keep as a standalone entity, but lightweight and Organization-scoped, not folded into Organization the way Community did. Rationale: `docs/vision.md` explicitly lists "Coaches with potential students" as a distinct connection MatchPoint makes; ADN Deportivo™ has `Community profile → coach involvement` and `Trust → verified coach` as attributes of the *organization's* profile, but `docs/product-principles.md` Principle 29's Organization *types* list includes `Coach` itself as one of the types an Organization can be (an independent coach IS an Organization). This means:
- A Coach can BE an Organization (type=`coach`) — a solo coach profile with their own ADN Deportivo™, contactable and leadable directly.
- A Coach can also be a named attribute/reference INSIDE another Organization's profile (e.g., a club listing "Coach: Juan Pérez" without that coach having their own separate contactable profile).

For PMV, do not build a separate `Coach` table with its own relationships to multiple Organizations (the old doc's `N---N Community/Coach` relationship). Instead: `Coach` becomes an **optional embedded field** on `Organization` (name, specialties, certifications — self-reported, per old doc) for display/trust purposes, OR a standalone Organization of type `coach` if the coach is independently discoverable/contactable. Do not model a coach who "belongs to multiple organizations with shared identity" at PMV — that was the old doc's speculative N---N relationship and nothing in the imported docs requires it now. Keep as an explicit open question (see §4) rather than asserting this is fully closed, since it's an inference, not a direct doc statement.

**Event**: keep as a standalone entity for PMV. Unlike Community, Event has clear independent justification in the imported docs:
- `docs/vision.md`: "Event organizers with participants" is a distinct connection.
- `docs/product-principles.md` Principle 29: `Event organizer` is an Organization *type*, but an event itself (a race, a clinic, a one-off training day) is a temporal, discoverable thing distinct from the organizing Organization's ongoing profile — a user matches to organizations for recurring communities, but might also want to discover a specific upcoming event.
- However: **`Event` is not in the PMV functional scope.** `docs/product-brief.md` §11 "PMV functional scope" lists exactly four capabilities (Sport Match™, Results, Community profile, Contact) — no event discovery flow. `docs/ux-flows.md` navigation rules list only `/`, `/match`, `/match/results`, `/organizations/[id]`, `/login`, `/contact/success` as PMV routes — no `/events` route (it's explicitly listed under "Optional future routes"). `docs/product-brief.md` §21 roadmap puts "events calendar" under V2.

Conclusion: keep `Event` in the data model doc as a defined-but-deferred entity (documented shape, not built in PMV), same treatment as Booking, so the doc doesn't need another rewrite when V2 starts. Mark it explicitly "V2 — do not implement in PMV" rather than omitting it, since Organizations of type `event_organizer` will need it and the FK target (`organizationId`) is worth fixing now.

### 1.5 User entity

Unaffected by either conflict — carries over as-is from the old doc, but cross-check attributes against `docs/matching-engine.md`'s V1 matching inputs. Old doc: "sport interests, objective, location, availability, skill level." Imported docs' actual required Sport Match inputs are more specific: `goal, sport, district, days, time (time of day), level, budget, environment`. These live on `SportMatchSession`, not on `User` directly (a user might run Sport Match™ multiple times with different answers per Principle 27 "repeat discovery"). `User` itself should be minimal at PMV: `id, authProvider (google|apple), authProviderId, email, createdAt` — since login only happens at contact-time (Principle 1) and there's no persisted user profile/preferences UI in PMV scope. Flag this as a data-model simplification versus the old doc's implication that User carries persistent sport/objective/location fields.

---

## 2. Proposed entity list (for `docs/data-model.md`)

Keep the doc's existing brevity/style. Draft text below — implementer should adapt wording, not necessarily paste verbatim.

```
## Core entities

- **User** — a person looking for a sports community. Attributes: id, authProvider (google|apple), authProviderId, email, createdAt. Login only happens at contact-time (no persisted profile/preferences UI at PMV) — sport/goal/schedule preferences live on SportMatchSession, not User, since a user may repeat Sport Match™ with different answers over time.
- **Organization** — any supply-side entity with a discoverable profile: team, club, gym, training center, coach, federation, event organizer, academy, or community (see `type` enum). Attributes: id, name, type, sports[], description, districts[], venues[], coordinates, schedules[] (embedded: day, startTime, endTime, sessionType, level — NOT a sub-entity), priceRange, trialClassAvailable, whatsapp, instagram, website, bookingLink, adnDeportivo (community profile: beginnerFriendliness, competitiveness, socialAtmosphere, trainingIntensity, groupSize, ageRange, genderMix, coachInvolvement, eventFrequency), services[], profileStatus (preloaded|claimed|verified|incomplete|suspended), completenessScore, lastUpdatedAt. One Organization profile = one matchable/contactable unit at PMV (Community does not exist as a separate sub-entity — see reconciliation note below).
- **Coach** — optional, lightweight. Either (a) an embedded attribute on Organization (name, specialties, certifications, self-reported) when the coach has no independent profile, or (b) modeled as its own Organization with type=`coach` when independently discoverable/contactable. No standalone Coach table with N—N ties to multiple Organizations at PMV. [Open question — see below.]
- **Event** — a one-off or recurring activity (race, clinic, open training day) published by an Organization (typically type=`event_organizer`), discoverable independent of an ongoing Organization profile. Attributes: id, organizationId, name, sport, date, district, description. **Defined but not implemented in PMV** — no event discovery flow, no `/events` route, per `docs/product-brief.md` §21 (V2 roadmap) and `docs/ux-flows.md` navigation rules.
- **SportMatchSession** — a persisted record of one Sport Match™ questionnaire completion. Attributes: id, userId (nullable — session can exist before login, since login only happens at contact-time), goal, sport, district, days[], time, level, budget, environment, createdAt. Persisting full ranked result sets per session is optional/future (not required for PMV; Flow 6 lets PMV always start a fresh Match instead of resuming).
- **Lead** — the PMV's sole conversion/contact record, replacing Booking entirely. Created when a logged-in user clicks a contact CTA. Attributes: id, userId, organizationId, matchSessionId, contactType (whatsapp|instagram|booking_link|call|contact_form|trial_class_request), source, timestamp, sport, goal, district, resultRank. No state machine — a Lead is a single immutable event, not a workflow. Booking/attendance/confirmation tracking is explicitly V2 scope (see reconciliation note).
```

## 3. Relationships (draft, same `A 1---N B` style)

```
User               1---N SportMatchSession
User               1---N Lead
Organization       1---N Lead
Organization       1---N Event
SportMatchSession  1---N Lead
```

Notes on what's intentionally absent versus the old doc:
- No `Organization 1---N Community` — Community is gone.
- No `Community N---N Coach` — Coach is either embedded or itself an Organization; no separate join needed at PMV.
- No `Community 1---N Booking` / `Event 1---N Booking` — Booking is gone at PMV; Lead attaches to Organization (and optionally Event once Event ships in V2 — flag `Event 1---N Lead` as a V2 addition, not needed now since Event isn't buildable yet).

---

## 4. Open questions for /speckit-clarify (updated, not silently deleted)

Carry forward and update the old doc's list:

1. **Organization self-service auth** (was: "Does a Provider need its own auth/login?") — still open. `docs/product-brief.md` §19/§21 confirms preloaded-then-claimed profiles, and `docs/ux-flows.md` Flow 8 sketches a claim flow (form → admin review → approve/reject) for **V1.1, explicitly not PMV**. The claim-flow auth model (how a claimed org authenticates to edit thereafter) is still unspecified — keep open.
2. **Coach modeling** (new, replaces old "do Coaches exist as a distinct entity" question, now more specific) — is a Coach ever both (a) attached to a parent Organization AND (b) independently contactable/leadable with its own Lead attribution, at the same time? The imported docs don't give a concrete example of this dual case. Resolve before building any Coach-specific profile UI.
3. **Community-as-sub-entity for V1.1+** (narrowed from "resolved" in §1.1 above) — confirmed dead for PMV, but will a single legal Organization ever need multiple distinct sub-program profiles (own ADN Deportivo™, own claim status, own Lead attribution) once the marketplace matures? Nothing in the imported docs rules this out for later; explicitly deferred, not designed against.
4. **Match result persistence** (narrowed from old doc's "is Match persisted or ephemeral") — resolved that `SportMatchSession` (the input/questionnaire answers) must be persisted with a stable ID because `Lead.matchSessionId` references it. Still open: are the *ranked results themselves* (scores + reasons shown to the user) persisted alongside the session, or purely recomputed at request time? Needed if MatchPoint ever wants to audit "what did we actually show this user" independent of algorithm changes later.
5. **Trial class / attendance definition** (carried over) — still open, and now explicitly out of scope until V2 per the Booking→Lead reconciliation; `docs/matching-engine.md`'s "Learning loop" section lists "booking completed, attendance confirmed" only as a **future** signal.
6. **Lead `source` enum values** (new) — Product Principle 25 and Flow 5 require `source` on every Lead but no imported doc enumerates its allowed values (e.g. `results_card` vs `organization_profile` vs deep link). Implementer should propose a small fixed enum during `/speckit-plan` for this feature and this doc should be updated once decided — don't let it drift into an untyped free-text field.
7. **Multiple simultaneous contacts** (carried over from `docs/product-brief.md` §23 open question 6) — "Should the user be able to contact more than one community at once?" Still unanswered; affects whether Lead creation is single-select or allows a batch flow from Results.

---

## 5. Other files requiring edits as a consequence

### 5.1 `docs/security-standards.md`

- **§ PII & location, bullet 1**: replace "Providers" → "Organizations" throughout. Also re-scope: "until a Booking is confirmed" no longer applies — there is no Booking/confirmed state in PMV. The correct PMV gate, per `docs/ux-flows.md` Flow 5, is: precise location/contact info may be revealed once the user is **logged in AND a Lead has been created** for that Organization (i.e., after the "Create Lead" step in the sequence diagram, right before redirecting to the external channel). Before that point (browsing Results/Community profile pre-login or pre-contact-click), only district-level/approximate location should show — this is already consistent with `docs/ux-flows.md` Community profile rules ("If WhatsApp is missing, do not show WhatsApp" implies contact channels are shown on-profile pre-login in some form, so clarify precisely: the *organization's* contact channel visibility on the profile page itself is separate from *user's own* location/contact privacy — the rule in security-standards.md is primarily protecting the **User's** PII from the Organization, and vice versa is less of a concern since Organization contact info (WhatsApp/Instagram) is meant to be public-ish once a profile exists. Flag this nuance explicitly for whoever edits: the original bullet conflated "User's location hidden from Organization" with "Organization's contact info hidden from User," and only the latter needs the login+lead gate; the former (User's precise location) is arguably never shown to an Organization at all in PMV since there's no in-platform messaging/booking surface for an Organization to see it.
- **§ PII & location, bullet 2**: rewrite from "Contact details ... revealed only after a Booking reaches `confirmed` state, not at `requested`" to something like: "Organization contact details (WhatsApp, Instagram, booking link) are shown on the Organization's public profile once published/verified — this is expected public marketplace data, not gated. What IS gated behind login+Lead-creation is the act of contacting (the outbound click) and the persisted association between a specific User and a specific Organization contact attempt." This is a meaningfully different rule than the old Booking-based one and needs explicit owner sign-off — flag as a conflict for the calling session to confirm rather than silently deciding, since it changes what "gated" means.
- **§ Auth & accounts, bullet 1**: replace "User vs. Provider" → "User vs. Organization" (only if/when Organization gets self-service auth — see open question 1 above; until then this bullet may be moot for PMV since Organizations don't log in at all yet, only User does via Google/Apple). Add a note: at PMV, only User accounts exist (Organization profiles are admin-managed, no Organization login) — this bullet becomes forward-looking for V1.1's claim flow.
- **§ Auth & accounts, bullet 2**: replace "Provider accounts that can publish public listings" → "Organization profiles" and align with `docs/ux-flows.md` Flow 8/9: PMV publishes via internal admin preload (Flow 9), not self-publish, so the moderation gate is inherently satisfied by "admin preloads it" for PMV; the gate becomes relevant again at V1.1's claim flow (Flow 8's admin review step already satisfies "no fully open self-publish").
- **§ Trust & safety, bullet 1**: replace "Provider/Coach" → "Organization/Coach" (Coach may or may not be independently reportable — ties to open question 2 above).
- **§ Trust & safety, bullet 3**: replace "Provider/Coach contact info or User profiles" → "Organization/Coach contact info or User data."
- **§ Data retention**: replace "User/Provider accounts" → "User accounts" (Organizations aren't accounts at PMV — see auth note above) — but keep "Organization data" as something that needs its own deletion/correction path (e.g. a claimed org wanting to be removed), phrased separately from "account" deletion since it's not a login-based account at PMV.
- **Header sentence**: "facilitates real-world contact between strangers (Users and Providers/Coaches)" → "Users and Organizations/Coaches."

### 5.2 `docs/base-standards.md`

- **§ Testing discipline, bullet 1**: "TDD for business logic (matching/ranking, availability, booking state transitions)" → replace "booking state transitions" with "lead creation" for PMV scope. Suggested: "TDD for business logic (matching/ranking, availability, lead creation): write the failing test first. Booking-state-machine testing is deferred to V2 per `docs/data-model.md`'s reconciliation note — do not build test scaffolding for booking states until that entity actually exists."
- **§ Testing discipline, bullet 2**: "Pure domain logic (matching score, distance calc, booking rules)" → "matching score, distance calc, lead-eligibility rules" (rename "booking rules"; there's no booking to have rules about at PMV — the closest PMV equivalent is validating a Lead can be created, e.g. user must be authenticated, organization must have at least one contact channel per the "missing contact info → do not show contact CTA" rule in `docs/matching-engine.md`).
- **§ Testing discipline, bullet 4**: "Critical paths (search → match → booking → confirmation) need integration-level coverage" → "Critical paths (search → match → contact → lead) need integration-level coverage, not just unit tests. The full booking/confirmation path is V2 scope and gets its own critical-path definition when that entity ships."
- **§ Typing & code quality, bullet 2**: "Domain entities (see `docs/data-model.md`)" — no name change needed, just confirm it still points at the rewritten doc.
- **§ Git & review conventions**: no entity-name changes needed, these bullets reference skill names (`data-model-review`, `geo-matching-review`, `trust-safety-review`), not entity names directly — no edits required here beyond what the skill files themselves need (§5.4–5.6 below already cover reflecting new terminology into skill trigger descriptions).

### 5.3 `.claude/agents/backend-architect.md` (this agent's own definition)

- **Header paragraph**: "Users looking for communities; Providers — clubs, gyms, coaches, event organizers — offering them" → "Users looking for communities; Organizations — clubs, gyms, coaches, training centers, federations, event organizers, academies, teams — offering them."
- **Core expertise bullet 1**: "Users, Providers, Communities, Coaches, Events, Bookings and their state machines" → "Users, Organizations, Coaches, Events (V2), SportMatchSessions, and Leads." Drop "Bookings and their state machines" as current expertise (move to a "V2-future" note) since Booking isn't part of the PMV model anymore.
- **Core expertise bullet 3**: "User-facing and Provider-facing capabilities" → "User-facing and Organization-facing capabilities" (note: at PMV, Organization-facing capabilities barely exist — admin-managed only — so this bullet is currently mostly forward-looking to V1.1's claim flow).
- **Principle 3** (centralize matching/ranking logic): unchanged, still correct and now has a concrete home — `docs/matching-engine.md`'s match score module.
- **Principle 4**: "Booking state machine is explicit (`requested → confirmed → attended/no-show/cancelled`); plans touching Booking must account for every state" → replace with something like: "Lead creation is a single immutable event, not a state machine, at PMV — plans touching Lead must ensure it's created atomically with the login step per `docs/ux-flows.md` Flow 5's sequence (auth success → lead created → external redirect), and must not be lost if the external redirect fails. Booking's full state machine (`requested → confirmed → attended/no-show/cancelled`) is deferred to V2; do not design it prematurely, but do keep `Lead.organizationId`/`Lead.userId` FK shapes stable so V2's Booking can reference the originating Lead."
- **Principle 5**: "between User and Provider sessions" → "between User and Organization sessions" (with the same PMV caveat that Organization sessions mostly don't exist yet).
- **Final "Flag anything" sentence**: no name change needed, but note it should now also flag the security-standards.md gate confusion identified in §5.1 above if a future plan touches contact-info visibility, since that rule is being redefined by this very change.

### 5.4 `.claude/skills/data-model-review/SKILL.md`

- **Frontmatter `description`**: "adds/modifies entities (User, Provider, Community, Coach, Event, Booking)" → "adds/modifies entities (User, Organization, Coach, Event, SportMatchSession, Lead)."
- **Step 3, "Broken relationships" bullet**: example "changing Booking's owner from User to something else" → "changing Lead's owner from User to something else, or Organization's `schedules[]` shape in a way that breaks `scheduleFit()` in the matching engine."
- **Step 3, "Missing state handling" bullet**: "Booking has an explicit state machine (...). Any change touching Booking must handle all states" → replace with: "Lead has no state machine at PMV (single immutable event) — flag any change that tries to add mutable state to Lead without an explicit decision to build V2's Booking entity instead. If a change does introduce Booking (V2), it must handle the full `requested → confirmed → attended/no-show/cancelled` state machine, not just the happy path."
- **Step 3, "Open questions" bullet**: no structural change, just ensure it points at the updated open-questions list in the rewritten `docs/data-model.md`.

### 5.5 `.claude/skills/geo-matching-review/SKILL.md`

- **Frontmatter `description`**: "location-based queries ... between Users and Communities/Events/Coaches" → "between Users and Organizations/Events/Coaches."
- **Step 2, "Missing-location handling" bullet**: "a User or Provider/Community has no location set" → "a User or Organization has no location/district set" — and cross-reference `docs/matching-engine.md`'s explicit missing-data rule: "Missing district → exclude from location-based recommendations" (this is now a documented product rule, not just an engineering edge case — the skill should check the implementation actually follows that specific behavior, not just "degrades gracefully" generically).
- **Step 3**: "no Provider within radius" → "no Organization within radius" — and note PMV's location model is **district-level matching**, not lat/lng radius search (`docs/matching-engine.md`: "V1 uses district matching ... future versions use distance radius"). This is an important correctness note for whoever implements: flag if a PMV implementation builds haversine/radius search when the spec only calls for district-equality/adjacency matching — that would be over-building ahead of the documented V1 approach. Distance-radius geo math becomes relevant only in a future version.
- **Step 4, "Ranking transparency" bullet**: "per `docs/data-model.md`'s open question on whether Match is explainable" → this is now **resolved**, not open (per `docs/matching-engine.md`: match is always explainable with 3-5 generated reasons, human labels, never raw percentages) — reword to state the resolved rule directly: "Match results must always include 3-5 human-readable reasons per `docs/matching-engine.md`; flag any ranking change that returns a bare score without regenerating explanations, or that reimplements the weighted-scoring formula (goal 25%, sport 20%, schedule 15%, location 15%, level 10%, environment 10%, budget 5%) outside the centralized matching module."

### 5.6 `.claude/skills/trust-safety-review/SKILL.md`

- **Frontmatter `description`**: "touching user/provider profiles" → "touching user/organization profiles."
- **Step 1, "Contact-info exposure" bullet**: "reveal a User's or Provider's precise location, phone, or exact address before a Booking reaches `confirmed` state" → rewrite per the corrected gate from §5.1: "reveal a User's precise location/contact info to an Organization, or an Organization's private (non-public) contact info to a User, before the User is logged in AND a Lead has been created for that Organization? Note: an Organization's already-public contact channels (WhatsApp/Instagram links shown on its published profile) are not gated by this rule — only the *contact action* (and its resulting User↔Organization association) requires login+Lead. Flag any path that lets the outbound contact click fire, or the external redirect open, before the Lead record is actually persisted (race condition risk per the Flow 5 sequence diagram: auth → create lead → open external channel, in that order, not auth → open external channel with lead creation as fire-and-forget)."
- **Step 2, "Account-type boundary" bullet**: "User session act with Provider privileges or vice versa" → "User session act with Organization-admin privileges or vice versa" — note this is currently low-risk at PMV since Organizations have no login/session at all (admin-managed), but becomes real at V1.1's claim flow; flag as forward-looking until then.
- **Step 3, "Moderation gate" bullet**: "if the change lets a Provider publish or edit a public listing" → "if the change lets an Organization (or an admin on its behalf) publish or edit a public listing" — at PMV this is exclusively the internal admin preload flow (`docs/ux-flows.md` Flow 9), so the moderation gate = "only admins can create/edit Organization profiles"; re-flag once V1.1's claim flow (Flow 8) ships, since that introduces the first non-admin write path and needs its own explicit review pass.
- **Step 4, "Reporting/blocking" bullet**: "Users and Providers/Coaches" → "Users and Organizations/Coaches."
- **Step 5, "Abuse surface" bullet**: "scraped for contact info or profile data at volume" → add explicit note that Sport Match™/Results endpoints are a new abuse surface not present in the old model (rate-limit the match-scoring endpoint itself, not just a hypothetical search endpoint, since PMV's primary discovery path IS Sport Match™, not free-text search).
- **Step 6**: no entity-name change needed, still points at `docs/security-standards.md`'s deny-list, which is being edited per §5.1.

---

## 6. Sequencing note for the calling session

Suggested order of edits to keep the docs internally consistent at every intermediate commit:

1. Rewrite `docs/data-model.md` first (§2–§4 above) — it's the source of truth every other file defers to.
2. Edit `docs/security-standards.md` (§5.1) — highest risk file since it redefines a safety-relevant gate; consider flagging the redefinition to the product owner explicitly rather than treating it as a mechanical rename, per this agent's standing instruction to surface security-standard conflicts rather than silently design around them.
3. Edit `docs/base-standards.md` (§5.2).
4. Edit the three skill files + the backend-architect agent file (§5.3–5.6) — mechanical terminology passes once the above three are settled, since they just cross-reference the docs rather than define new rules.

## 7. Flag to the user (per this agent's standing instructions)

The redefinition in §5.1 (Organization contact info being public-on-profile rather than gated-until-confirmed) is a **material change to the security posture**, not a pure rename — the old rule was conservative (nothing revealed until a mutual-commitment state), the new rule is more permissive (org contact channels are public once profile is live; only the user-initiated contact *action* is gated). This matches the product's explicit design (`docs/ux-flows.md` Community profile rules assume WhatsApp/Instagram buttons are visible on the profile page, not hidden until after login) but should get explicit sign-off before `docs/security-standards.md` is edited, since it's a safety-relevant scope decision, not just terminology drift. Recommend running `security-privacy-auditor` after the doc edits land, before any code implements contact/lead endpoints.
