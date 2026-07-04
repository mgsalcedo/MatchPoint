<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0 (Development Workflow section slimmed from 16-step to lean 7-step cycle)
Modified principles: none — all six core principles unchanged, including Principle III (Test-First) which
  was explicitly kept NON-NEGOTIABLE for matching/ranking logic when the workflow was lightened
Added sections: none
Removed sections: none (the Development Workflow section was rewritten shorter, not removed)
Rationale for MINOR bump: the Development Workflow section's guidance materially changed (16 gates → 7),
  but no principle was removed or redefined, so this is MINOR not MAJOR per the versioning policy below.
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" reads gates dynamically; no change needed
  ✅ CLAUDE.md — Workflow section slimmed to the same lean 7-step cycle in the same edit pass; in sync
Follow-up TODOs: none.

Prior report (v1.0.0):
  TEMPLATE → 1.0.0 initial ratification; Core Principles (I-VI), Technology & Engineering Constraints,
  Development Workflow, Governance all filled from the ratified living docs (docs/vision.md,
  docs/product-principles.md, docs/base-standards.md, docs/security-standards.md, docs/business-rules.md,
  CLAUDE.md).
-->

# MatchPoint Constitution

## Core Principles

### I. No Login Before Value (NON-NEGOTIABLE)

Users MUST be able to complete Sport Match™, view ranked results, and open organization
profiles without authenticating. Login MUST appear only when the user attempts to contact
an organization, and MUST offer only Google and Apple sign-in — no password signup, no
email form (BR-001, BR-002). Any feature that requires login earlier in the funnel is
rejected by design, not flagged for later removal.

**Rationale**: the user is more likely to authenticate after seeing a relevant match and
deciding to act on it than before receiving any value (ADR-0003, Product Principle 1).

### II. Sport Match™ First — Recommend, Don't Search

The product MUST start with the user's goal, not a search bar or a manual filter list
(Product Principle 2-3). Every result MUST include a human-readable reason it was
recommended (BR-012); raw scores are never the primary UI. Matching/ranking logic MUST
live in one centralized module — no reimplementing scoring rules per endpoint or per
screen (`docs/base-standards.md`, `docs/matching-engine.md`).

**Rationale**: MatchPoint's differentiation is fit, not information (`docs/vision.md`) — a
directory with filters is a regression to what already exists on Instagram and Google Maps.

### III. Test-First for Business Logic (NON-NEGOTIABLE)

Business logic — matching/ranking, availability, lead-eligibility rules — MUST be covered
by a failing test written before the implementation (TDD), and MUST be isolated from
framework/IO code so it is unit-testable without a database or network
(`docs/base-standards.md`). Every bug fix MUST ship with a regression test that fails
before the fix. Critical paths (search → match → contact → lead) require integration-level
coverage, not unit tests alone.

**Rationale**: MatchPoint's defensibility is its matching quality; untested scoring logic
erodes the one thing the product cannot regress on without users noticing immediately.

### IV. Contact/Lead Is the North Star

The primary success metric is contacts generated between users and sports organizations,
not views, saves, or time on page (`docs/vision.md`, ADR-0007). Every contact action MUST
create a `Lead` record before the external redirect opens (BR-003). `Lead` is a single
immutable event, not a state machine — no `status` or mutable field may be added to it
without an explicit, documented decision to reintroduce the deferred `Booking` entity
instead (`docs/data-model.md`'s divergence note). Every feature proposal MUST be checked
against: does this improve Sport Match™, reduce time to contact, improve match quality, or
preserve no-login-before-value? If not, it is out unless explicitly requested
(`CLAUDE.md`).

**Rationale**: contacts are the only funnel event that proves value was created for both
sides of the marketplace; optimizing for engagement instead would misalign the product.

### V. PMV Scope Discipline

Core PMV scope is exactly: Sport Match™, Results, Community profile, Contact/Lead
(BR-029). No social feed, payments, chat, native apps, or advanced organization dashboards
without explicit approval (BR-005, Product Principle 7). Friction must earn its place —
allowed friction is Sport Match™ questions, login before contact, and district/schedule
refinement; anything else (long signup, mandatory onboarding slides, unnecessary fields) is
rejected (Product Principle 9). A simple rule-based match that users trust beats a complex
algorithm they don't understand — do not over-engineer before validating demand
(`docs/matching-engine.md`, Product Principle 22).

**Rationale**: the PMV is a learning machine, not a finished marketplace (Product
Principle 10) — scope creep before validation wastes the one thing a pre-launch product
cannot recover, time to learn.

### VI. Trust & Safety Is Non-Negotiable

MatchPoint handles location data and facilitates real-world contact between strangers —
this is safety-critical, not data-protection boilerplate (`docs/security-standards.md`).
Precise User location is never shown to an Organization directly. Organization contact
channels are public once a profile is published, but the contact *action* is gated behind
login + Lead creation, in that order — never fire the external redirect before the Lead
record is persisted. Organization profiles are admin-managed at PMV (no self-publish);
any future self-service claim flow requires a moderation/verification gate before first
publish. Data must never be fabricated — unknown price, schedule, or coach information is
displayed as unknown or omitted, never invented (BR-016).

**Rationale**: this product creates real-world meetups between people who don't know each
other yet; a trust or privacy failure here is a safety incident, not a UX defect.

## Technology & Engineering Constraints

Stack facts are locked, not open design questions per feature: Vite + React 19 +
TypeScript + React Router (`/app`, already in place — do not introduce Next.js or another
framework without an explicit reason and a matching ADR), Supabase PostgreSQL per
`docs/database-schema.md` for persistence, Google/Apple OAuth for authentication. Styling
has no committed library yet — style with the tokens in `docs/design-system.md`. Domain
entities in `docs/data-model.md` (conceptual) and `docs/database-schema.md` (physical) are
the single definition of truth; no ad-hoc duplicate shapes per layer
(`docs/base-standards.md`). Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`,
`refactor:`); one feature per branch, named from its `/speckit-specify` slug.

## Development Workflow

Every feature that moves past exploration into real engineering follows the lean SDD cycle
documented in `CLAUDE.md` (slimmed 2026-07-04 for this didactic PMV): Idea (optional
GitHub issue) → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` (+
`backend-architect` agent for data-model/API/matching changes; ADR only when a decision is
worth recording) → `/speckit-tasks` → `/speckit-implement` → `/verify` → one `/code-review`
pass + conditional security/trust-safety review (only for auth/location/contact/moderation
changes, per Principle VI) → PR (human-approved merge). A throwaway/shell-only pass may skip
directly to the build step and defer the rest, but that exception must be stated explicitly,
not assumed by default.

Lightening the workflow did not lighten the principles: Principle III (Test-First) remains
NON-NEGOTIABLE for matching/ranking logic even though the rest of the UI is not test-gated,
and Principle VI (Trust & Safety) still triggers the security/trust-safety review whenever a
change touches auth, location, contact-info visibility, or moderation.

The Golden Rules in `CLAUDE.md` govern how artifacts are edited: the spec is the source of
truth; generated Markdown (`spec.md`/`plan.md`/`tasks.md`) is changed by re-running the
relevant `speckit-*` skill, never hand-edited outside its designated placeholders; if a
generated artifact is wrong, iterate by chat through `/speckit-clarify`, don't patch the
file directly; the agent does not invent missing requirements, data points, or business
rules — it asks or flags an open question; any out-of-band code change requires a
`/speckit-analyze` sync pass before the next feature starts.

## Governance

This constitution supersedes ad-hoc practice for any conflict between the two. It does not
supersede or restate `docs/product-principles.md`, `docs/business-rules.md`,
`docs/security-standards.md`, or `docs/base-standards.md` — those remain the detailed
living references; this document is the distilled, non-negotiable subset every feature
plan is checked against at the "Constitution Check" gate in `/speckit-plan`.

**Amendment procedure**: propose the change in conversation with its rationale, record a
new ADR in `docs/adrs/` if it reflects an architecture decision, then update this file and
bump the version below. Amendments are not made by silently editing this file without a
recorded rationale.

**Versioning policy**: semantic versioning for this document. MAJOR — a principle is
removed or redefined in a backward-incompatible way. MINOR — a principle or section is
added, or existing guidance is materially expanded. PATCH — wording clarifications, typo
fixes, non-semantic refinements.

**Compliance review**: every `/speckit-plan` run must pass its Constitution Check gate
before implementation starts; every `/code-review` and `/security-review` pass checks
compliance with the principles above, not just code quality in isolation. Complexity that
appears to violate Principle V (PMV Scope Discipline) must be justified in the plan's
Complexity Tracking section or removed.

**Version**: 1.1.0 | **Ratified**: 2026-07-04 | **Last Amended**: 2026-07-04
