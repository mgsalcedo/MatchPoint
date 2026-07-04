# MatchPoint

Sports-community marketplace MVP for Peru, built with Spec-Driven Development (GitHub Spec Kit).

## Read first

- `docs/vision.md` — highest-level product direction and North Star Metric (contacts generated)
- `docs/product-brief.md` — product description (input for `/speckit-specify`)
- `docs/product-principles.md` — 30 decision-guiding principles; check features against these before building
- `docs/matching-engine.md` — Sport Match™ questionnaire, ADN Deportivo™ schema, match scoring/ranking logic
- `docs/ux-flows.md` — PMV screen-by-screen flows, navigation, error states
- `docs/base-standards.md` — engineering conventions (testing, typing, git/review rules)
- `docs/data-model.md` — core entities and relationships (living document; reconciled 2026-07-03 with the docs above via `backend-architect`, plan at `.claude/doc/matchpoint-foundation-reconciliation/backend.md`; `Lead` is deliberately immutable — see its divergence note)
- `docs/database-schema.md` — physical Supabase/PostgreSQL schema (Fase 2 · Ingeniería); mirrors `docs/data-model.md`, same immutable-`Lead` divergence applies
- `docs/business-rules.md` — 30 non-negotiable PMV constraints (BR-001…BR-030)
- `docs/api-contracts.md` — PMV endpoint contracts (Sport Match™, organizations, leads, profile claims)
- `docs/visual-direction.md` — design inspiration/positioning (Luma-quality benchmark, not a template — see its anti-copy rule)
- `docs/design-system.md` — tokens, layout, buttons, cards, match labels, component/page naming
- `docs/component-library.md` — PMV component props and rules (P0/P1/P2 priority)
- `docs/microcopy.md` — actual UI strings (screens, buttons, errors, empty states)
- `docs/match-character.md` — Match™'s voice/personality; who's "speaking" the microcopy above
- `docs/functional-requirements.md` — FR-001…FR-028, priority-ordered, acceptance criteria per requirement
- `docs/roadmap.md` — milestone-by-milestone build sequence (Fase 4 · Desarrollo); supersedes `product-brief.md` §21 for sequencing detail
- `docs/adrs/` — architecture decision records (one file per decision, indexed in `docs/adrs/README.md`)
- `docs/security-standards.md` — PII/location handling, trust & safety rules

## Before implementing

Before building any feature, check it against:

1. Does this improve Sport Match™?
2. Does this reduce time to contact?
3. Does this improve match quality?
4. Does this preserve the no-login-before-value rule (ADR-0003)?
5. Does this support the PMV scope (`docs/business-rules.md` BR-029)?

If not, don't build it unless explicitly requested — flag the mismatch instead of building around it.

## Recommended stack

- **Frontend**: Vite + React 19 + TypeScript + React Router — already in place in `/app` (see `app/package.json`); this is a fact, not a pending decision, so don't reach for Next.js or another framework without an explicit reason and a matching ADR.
- **Backend/data**: Supabase PostgreSQL, per `docs/database-schema.md`.
- **Auth**: Google/Apple OAuth (Supabase Auth or a compatible provider) — see BR-002.
- **Styling**: no library committed yet — style with the tokens in `docs/design-system.md` (plain CSS custom properties or a utility library are both fine); don't introduce Tailwind or another system without checking this section is still accurate.
- **Deploy target**: not yet decided; any static/edge host that supports a Vite PWA build works (Vercel, Netlify, Cloudflare Pages) — pick one when Milestone 0 of `docs/roadmap.md` needs it, don't block on it now.

## Code standards

- TypeScript: avoid `any` unless absolutely necessary; define clear types for domain models (mirror `docs/data-model.md`); use enums or union types for controlled values (match label, contact type, etc.).
- React: prefer small components; keep components readable; separate UI components from business logic; avoid overengineering.
- Data: keep matching logic isolated in one module (`docs/base-standards.md`'s no-duplicate-domain-logic rule); keep API/database calls isolated from components.
- Suggested folders (adapt to what already exists in `/app` rather than restructuring for its own sake): `lib/matching`, `lib/data`, `lib/analytics`, `components/match`, `components/organizations`, `components/ui`.

## Implementation behavior

When asked to implement a feature: check the relevant docs above first; preserve PMV scope (don't quietly expand it); make small, testable changes; reuse an existing P0/P1 component from `docs/component-library.md` before inventing a new one; keep UI mobile-first; wire up analytics if the feature is part of the core funnel (`docs/business-rules.md` BR-027); don't introduce new product behavior without documenting it in the relevant living doc.

## Workflow

Full SDD cycle per feature ("Flujograma Nivel 4 · Crear una aplicación con SDD", codified 2026-07-03). Applies once a feature moves past exploration into real engineering (Fase 2+) — a throwaway/shell-only pass (like the current PMV UI skeleton in `/app`) can skip straight to step 8 and defer the rest. `/speckit-constitution` runs once for the whole project, before step 1 of the first feature.

1. **Idea** — define objective, problem, target user, MVP scope, success criteria in conversation, grounded in `docs/product-brief.md`/`docs/vision.md`. Gate: is the problem clearly stated? If no → redefine before continuing.
2. **Issue** — create a simple GitHub user-story issue (`gh issue create`). Gate: readable in under 2 minutes? If no → simplify the issue.
3. **Enrich US** — `/speckit-specify` (reads the issue plus repo context/docs, produces `spec.md`).
4. **Revisar spec** — `/speckit-clarify` to resolve ambiguity; review scope, business rules, inputs/outputs, expected UX, constraints. Gate: does `spec.md` represent exactly what should be built? If no → iterate by chat through `/speckit-clarify`, never hand-edit `spec.md`.
5. **Proposal** — why the change exists, modules impacted, new capabilities, risks/dependencies — captured in `/speckit-plan`'s rationale; for a significant architecture decision, also record an ADR (`docs/adrs/NNNN-title.md`, indexed in `docs/adrs/README.md` — one per notable decision, never overwritten — superseded by a new ADR instead).
6. **Diseño técnico** — `/speckit-plan` (architecture, DB, components, APIs, states/navigation, interfaces); for data-model/API/matching changes, also invoke the `backend-architect` agent.
7. **Definir DoD** — `/speckit-checklist` to generate this feature's Definition of Done (functionality complete, tests pass, errors handled, accessible, responsive, secure). Gate: is the DoD measurable? If no → tighten it.
8. **Apply** — `/speckit-tasks` then `/speckit-implement` (branch, code, implement logic, keep `tasks.md` updated as work lands).
9. **Verificación automática** — the `/verify` skill (drives the real app through the Preview/browser tools, not just reads code) plus the project's test suite. Gate: do all tests pass and does the behavior match the spec? If no → fix and re-run, don't proceed on red.
10. **Peer Review** — `/code-review` (quality, architecture, malpractice, duplication).
11. **Security Review** — `/security-review`, plus this project's `security-privacy-auditor` agent and `trust-safety-review` skill for anything touching auth, location, contact-info visibility, or moderation.
12. **Accessibility Review** — `design:accessibility-review` (contrast, keyboard nav, screen readers, labels).
13. **Autofix** — `/code-review --fix` to apply review findings automatically where safe.
14. **Simplify** — `/simplify` (remove redundancy, reduce complexity, improve readability — quality only, not bug-hunting).
15. **Sync** — `/speckit-analyze` to catch drift across `spec.md`/`plan.md`/`tasks.md`/code; update `docs/data-model.md` and other living docs by hand per its findings (see Golden rules — never auto-regenerate markdown). Gate: do spec and code actually match? If no → resync before archiving.
16. **Archive** — open a PR (`gh pr create`); a human approves and merges it (I don't merge or push without being explicitly asked, and merging is always the user's call — see "Sending to GitHub" below); then close the feature/change.

### Golden rules

- **El spec es la fuente de verdad** — `spec.md`/`plan.md`/`tasks.md` govern implementation, not ad-hoc decisions made mid-chat and forgotten.
- **No editar Markdown generado manualmente** — change `spec.md`/`plan.md`/`tasks.md` by re-running the relevant `speckit-*` skill, not by hand-editing outside their designated placeholders (per `docs/base-standards.md`).
- **Iterar por chat con el agente** — if a generated artifact doesn't represent what you want, say so and re-run `/speckit-clarify` (or the relevant step), rather than patching the file directly.
- **El agente no debe inventar** — if a requirement, data point, or business rule is missing, ask or flag it as an open question (see the "Open questions" pattern in `docs/data-model.md`) instead of fabricating one.
- **Si cambia el código fuera de este ciclo, ejecutar Sync** — any out-of-band code change (hotfix, manual patch) needs a `/speckit-analyze` pass before the next feature starts, so drift doesn't compound silently.

### Sending to GitHub

I never push, open, or merge anything on my own initiative — every git action that touches the remote (`git push`, `gh pr create`, `gh pr merge`, `gh issue create`) happens only when explicitly asked in that turn, per the Git Safety Protocol in my base instructions. Concretely: I create commits only when asked; I create a PR (step 16) only when asked, and even then I don't merge it — "PR aprobado por humano" means you review and merge it (or explicitly tell me to merge), not that opening the PR implies approval to land it. Force-push, `--no-verify`, and skipping signing are off the table unless you explicitly ask for that specific action.

## Specialized agents (`.claude/agents/`)

- `backend-architect` — plans data model/API/matching changes against `docs/data-model.md`
- `qa-test-engineer` — plans test coverage for critical flows (lead creation, matching; booking state machine once that V2 entity ships)
- `security-privacy-auditor` — audits implemented code against `docs/security-standards.md` before release

## Specialized skills (`.claude/skills/`)

- `data-model-review` — flags drift between code and `docs/data-model.md`
- `geo-matching-review` — checks geospatial/matching logic correctness
- `trust-safety-review` — checks PII exposure, moderation gates, abuse surfaces

Run the relevant skill/agent per the trigger rules in `docs/base-standards.md` before merging changes to those areas.
