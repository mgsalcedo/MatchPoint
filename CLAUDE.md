# MatchPoint

Sports-community marketplace MVP for Peru, built with Spec-Driven Development (GitHub Spec Kit).

## Read first

- `docs/product-brief.md` — product description (input for `/speckit-specify`)
- `docs/base-standards.md` — engineering conventions (testing, typing, git/review rules)
- `docs/data-model.md` — core entities and relationships (living document)
- `docs/security-standards.md` — PII/location handling, trust & safety rules

## Workflow

Spec Kit cycle per feature: `/speckit-constitution` (once) → `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.

## Specialized agents (`.claude/agents/`)

- `backend-architect` — plans data model/API/matching changes against `docs/data-model.md`
- `qa-test-engineer` — plans test coverage for critical flows (booking state machine, matching)
- `security-privacy-auditor` — audits implemented code against `docs/security-standards.md` before release

## Specialized skills (`.claude/skills/`)

- `data-model-review` — flags drift between code and `docs/data-model.md`
- `geo-matching-review` — checks geospatial/matching logic correctness
- `trust-safety-review` — checks PII exposure, moderation gates, abuse surfaces

Run the relevant skill/agent per the trigger rules in `docs/base-standards.md` before merging changes to those areas.
