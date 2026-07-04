# Feature Specification: Data Foundation

**Feature Branch**: `001-data-foundation`

**Created**: 2026-07-04

**Status**: Draft

**Input**: User description: "Data Foundation (Milestone 0 + Milestone 1 from docs/roadmap.md) — stand up MatchPoint's real data infrastructure so the app reads from a real database instead of the mock organizations currently in app/src/data/organizations.ts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover real sports communities (Priority: P1)

A person exploring MatchPoint can retrieve a catalog of real Lima sports communities, filtered by the sport they care about and the district where they want to train. Today the app shows a handful of hand-invented placeholder communities; after this feature, the same screens are backed by a real, curated catalog of actual communities across Lima Metropolitana and Callao. Communities that have been suspended or archived never appear.

**Why this priority**: this is the whole point of the milestone — MatchPoint cannot recommend, rank, or generate a single contact without a real supply of communities to discover. Every later milestone (matching, profiles, contact) depends on this catalog existing. Without it the product is an empty marketplace (the #1 launch risk in `docs/product-brief.md`).

**Independent Test**: query the catalog for a given sport (e.g. running) and district (e.g. Miraflores); confirm real communities are returned, that they carry the fields needed to display and later score them (sport, district, schedule, level, environment, contact channel), and that no suspended/archived community is ever included.

**Acceptance Scenarios**:

1. **Given** a seeded catalog of at least 10 real Lima communities, **When** an anonymous visitor requests communities for a specific PMV sport, **Then** only active communities offering that sport are returned.
2. **Given** communities exist across several districts, **When** the visitor filters by a specific district, **Then** only communities training in (or near) that district are returned.
3. **Given** a community whose status is `suspended` or `archived`, **When** any public catalog query runs, **Then** that community is never included in the results.
4. **Given** a community missing a required minimum field (name, sport, district/venue, contact method, schedule/availability, level, environment, short description), **When** the public catalog query runs, **Then** that community is not surfaced as discoverable.

---

### User Story 2 - Reproducible, secret-safe environment (Priority: P2)

A developer joining the project can stand up the entire database — schema and seed — from versioned files and a short runbook, using their own environment configuration, without any secret ever appearing in the repository. Anyone can clone the public repo and see exactly how the data layer is structured, but no credential, key, or connection string is exposed.

**Why this priority**: this is the "Milestone 0" foundation half — it makes the data layer reproducible and safe to keep in a public repo. It is P2 rather than P1 because the discovery value (US1) is what the product is for, but a leaked secret or an unreproducible environment would block every future contributor and create a real security incident.

**Independent Test**: from a fresh clone, follow the runbook to configure environment variables and apply migrations + seed; confirm the resulting schema matches `docs/database-schema.md`. Separately, scan the repository and its git history for secrets and confirm none are present.

**Acceptance Scenarios**:

1. **Given** a fresh clone and the documented runbook, **When** a developer sets their environment variables and runs the migrations and seed, **Then** they obtain a schema matching `docs/database-schema.md` with the seeded communities present.
2. **Given** the repository is public, **When** the repo and its history are scanned for secrets, **Then** no database URL, key, or connection string is found in version control.
3. **Given** the schema is applied, **When** it is compared to `docs/database-schema.md`, **Then** every table, enum, and RLS policy defined there exists — including `match_sessions`, `match_results`, `leads`, and `profile_claims`, even though those are not exercised in this milestone.

---

### User Story 3 - Privacy-respecting preloaded data (Priority: P3)

Because MatchPoint preloads real third-party organizations before they claim their profiles (`ADR-0005`, `BR-006`), the way those organizations' contact details are stored and versioned must respect their privacy and Peru's Ley N.º 29733 — especially given the repository is public.

**Why this priority**: it is a genuine trust-&-safety constraint (constitution Principle VI), but it governs *how* the seed is stored rather than *whether* discovery works, so it rides on top of US1/US2. Getting it wrong is a privacy issue, not a broken feature — hence P3, but non-negotiable in its own right.

**Independent Test**: inspect what is committed to the public repo versus what lives only in the private database; confirm the handling of third-party contact information matches the policy decided in `/speckit-clarify`.

**Acceptance Scenarios**:

1. **Given** the trust-&-safety policy for seed contact data (to be confirmed in clarification), **When** the seed is committed to the public repo, **Then** third-party contact information is handled exactly as that policy dictates.
2. **Given** a community is preloaded but not yet claimed, **When** its record is created, **Then** its `profile_status` reflects `preloaded` and it carries no data fabricated beyond what is publicly available (`BR-016`).

### Edge Cases

- What happens when a visitor filters by a district that has no communities yet? (Expected: an empty-but-valid result, not an error — the "expand district / no dead end" behavior is a later milestone's UX, but the query itself must return cleanly.)
- What happens when a community offers multiple sports (e.g. a triathlon club that also does running)? (Expected: it appears under each sport it genuinely offers.)
- What happens when a community has no contact channel at all? (Expected: it is not surfaced as discoverable, since contact is the product's whole point — `BR-009` / minimum launch dataset.)
- What happens when the same community would match both a selected district and an adjacent one? (Expected: it is returned; adjacency handling detail belongs to the matching milestone, but the catalog must not hide it.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST persist a catalog of sports organizations and their related data (sports, districts, venues, schedules, sport-specific environment/ADN attributes) mirroring the entity definitions in `docs/data-model.md` and the physical schema in `docs/database-schema.md` — no ad-hoc duplicate shapes.
- **FR-002**: The catalog MUST be seeded with at least 10 real sports communities located in Lima Metropolitana and Callao, spanning the PMV sports (running, trail running, cycling, swimming, triathlon, training centers).
- **FR-003**: Anonymous visitors (no login) MUST be able to retrieve active organizations filtered by sport and by district.
- **FR-004**: Organizations whose status is `suspended` or `archived` MUST NOT appear in any public read result (`BR-008`).
- **FR-005**: Only organizations meeting the minimum launch dataset (name, sport, district or venue, contact method, schedule or availability note, level, environment, short description) MUST be eligible to appear as discoverable (`docs/data-model.md` "Minimum launch dataset").
- **FR-006**: The database schema MUST match `docs/database-schema.md` exactly, including creating the `match_sessions`, `match_results`, `leads`, and `profile_claims` tables now — even though they are not written to in this milestone — so later milestones need no schema rework.
- **FR-007**: The `leads` table MUST be defined with no `status` column and no mutable lifecycle fields, per the immutable-`Lead` divergence note in `docs/data-model.md`.
- **FR-008**: Row-level security MUST allow public read of active organizations, sports, districts, venues, schedules, and ADN attributes, and MUST restrict lead creation to authenticated users — the lead write path is a later milestone, but the policy MUST be correct now.
- **FR-009**: All secrets (database URL, keys, connection strings) MUST be supplied through environment configuration excluded from version control; no secret may be committed to the repository or its history.
- **FR-010**: The environment setup MUST be documented as a runbook (create the database project, set environment variables, apply migrations, run the seed) sufficient for a new developer to reproduce the environment unaided.
- **FR-011**: The catalog MUST be consumable by the existing application through a data shape compatible with what its screens currently receive from mock data, so a later milestone can swap the data source without changing the UI component contracts.
- **FR-012**: Seed data for real third-party organizations MUST handle their contact information (WhatsApp numbers, Instagram handles) according to [NEEDS CLARIFICATION: the repo is public — confirm the trust-&-safety policy for committing real third-party contact info. Proposed default: the versioned seed uses real names, districts, sports, schedules, and ADN attributes but redacts/placeholders contact info; real contact info is loaded only into the private database, never committed].

### Key Entities *(include if feature involves data)*

- **Organization**: a discoverable sports community or supply-side entity (team, club, gym, training center, coach, academy, etc.), with a type, publish/claim status, and the descriptive fields needed to display and later score it. The central entity of this feature.
- **Sport**: a sport or training category an organization can offer (running, trail, cycling, swimming, triathlon, training center for the PMV).
- **District**: a Lima Metropolitana or Callao district used for location-based discovery.
- **Venue**: a physical training location or meeting point belonging to an organization, tied to a district.
- **Schedule**: a recurring training session for an organization (day, time, level).
- **Organization ADN**: the environment/personality attributes of an organization (beginner-friendliness, competitiveness, social atmosphere, etc.) that later power match quality.
- **Organization–Sport link**: the association between an organization and each sport it offers, with a primary flag.
- **Match session / Match result / Lead / Profile claim**: defined and created now (schema parity) but not written to in this milestone; exercised by later milestones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 10 real Lima sports communities are present and discoverable across the PMV sports and multiple districts.
- **SC-002**: Filtering the catalog by any PMV sport and any covered district returns matching active communities with no perceptible delay at seed scale (tens of records).
- **SC-003**: A repository and git-history scan finds zero committed secrets (database URL, keys, connection strings).
- **SC-004**: A new developer can reproduce the full database (schema + seed) from the runbook in under 30 minutes without help beyond the runbook.
- **SC-005**: 100% of suspended or archived communities are excluded from every public catalog result.
- **SC-006**: The application's existing screens can render the real catalog with no change to their component contracts (data-shape parity with the current mock source).

## Assumptions

- The human owner creates the Supabase project and provides its credentials via local environment configuration; Claude cannot create the account or hold the credentials.
- Supabase PostgreSQL is the persistence layer, locked per the constitution's Technology & Engineering Constraints and `docs/database-schema.md`.
- Only organization discovery (read path) is in scope this milestone; the matching/scoring engine, authentication, lead creation, and the Sport Match™ questionnaire wiring are later milestones (`docs/roadmap.md` Milestones 3 and 5).
- The 10+ real communities are curated from their own publicly available information (their public social media); accuracy verification is best-effort, appropriate to a didactic PMV, and no information is fabricated beyond what is public (`BR-016`).
- District coverage is limited to Lima Metropolitana and Callao (PMV geography per `docs/product-brief.md`).
- The read query follows the public, anonymous GET-style contract in `docs/api-contracts.md`; exact query shape is a planning-phase detail.

## Dependencies

- `docs/database-schema.md` (physical schema and migration order), `docs/data-model.md` (entities and the immutable-`Lead` note), `docs/api-contracts.md` (public read contract), `docs/business-rules.md` (BR-006, BR-008, BR-009, BR-016, minimum launch dataset), and the project constitution (Principle V scope discipline, Principle VI trust & safety).
