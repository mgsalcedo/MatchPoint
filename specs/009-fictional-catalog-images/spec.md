# Feature Specification: Fictional Demo Catalog with Generated Imagery

**Feature Branch**: `009-fictional-catalog-images`

**Created**: 2026-08-04

**Status**: Abandoned — 2026-08-04, product owner dropped this direction before the contact-channel clarification was resolved; catalog stays the 10 real, publicly-sourced organizations.

**Input**: User description: "Replace the current 10 real, publicly-researched seed organizations (supabase/seed/002_organizations.sql) with 50 entirely fictional demo organizations, plus AI-generated logo and cover images for each via OpenRouter. This directly supersedes the prior real-org sourcing discipline since these are wholly invented entities, not real businesses — the fabrication concern that blocked AI-generated imagery earlier is specifically about representing real, identifiable businesses without consent, which no longer applies once every field is invented rather than sourced from research."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every sport has believable, varied demo organizations to match against (Priority: P1)

As someone demonstrating or testing Sport Match™, I complete the questionnaire for any of the 6 PMV sports and see multiple plausible-looking organizations with real-feeling names, districts, descriptions, and visuals — not a thin, obviously-placeholder catalog and not the 10 real businesses that used to be there.

**Why this priority**: this is the entire point of the replacement — a catalog that reads as generic ("Org 1", "Org 2") or still points at real businesses defeats the reason for doing this. The catalog must feel real enough to demo Sport Match™ convincingly while being 100% invented.

**Independent Test**: run Sport Match™ for each of the 6 PMV sports and confirm each returns at least one organization with a distinct name, description, district, and generated logo — and confirm none of the 10 previously-seeded real organizations (by name or by their old fixed UUIDs) remain in the database.

**Acceptance Scenarios**:

1. **Given** the seed is applied, **When** querying organizations by sport, **Then** every one of the 6 PMV sports has at least one organization.
2. **Given** the seed is applied, **When** listing all organizations, **Then** there are exactly 50, none matching a name or UUID from the previous real-org seed.
3. **Given** a district-based search, **When** filtering by Callao, **Then** at least one organization has a confirmed Callao venue (same structural coverage the old catalog guaranteed).
4. **Given** any seeded organization, **When** viewing its profile, **Then** it shows a generated logo and cover image styled per `docs/design-system.md`'s Imagery section, not the initials-over-gradient fallback (that fallback remains for orgs with no image, but none of the 50 should be in that state).

---

### User Story 2 - The catalog is unmistakably a teaching demo, not a real directory (Priority: P1)

As anyone encountering MatchPoint (a user, a reviewer, or someone browsing the public repo), I can tell the organizations are illustrative/fictional and not real, contactable Lima sports businesses — so no one mistakes a generated name, logo, or contact channel for a real organization's identity.

**Why this priority**: equal priority to Story 1 — this is the entire reason the replacement was requested (to stop representing real businesses without consent). If the fictional catalog is indistinguishable from a real one, it re-creates the same risk in a different form.

**Independent Test**: read the seed file's header and any in-app copy touching organization contact; confirm both are explicit that this is demo/fictional content, and confirm no generated name or image was produced by asking the image model to depict a specific named real business.

**Acceptance Scenarios**:

1. **Given** `supabase/seed/002_organizations.sql`, **When** reading its header, **Then** it states plainly that all 50 organizations are fictional, invented for demonstration, and lists no "sourced from" citations (the pattern the real catalog used, which no longer applies).
2. **Given** a fictional organization's generated name, **When** compared against known real Lima sports organizations, **Then** it does not closely reproduce an identifiable real one (per the naming discipline in Assumptions).

---

### User Story 3 - Contacting a demo organization behaves predictably, not like a broken real flow (Priority: P2)

As a user who completes the full funnel and taps "Contactar," I reach a clearly-marked demo destination rather than a dead link, a random stranger's real WhatsApp number, or something that silently fails.

**Why this priority**: lower than Stories 1–2 because it doesn't block demonstrating Sport Match™ itself, but it's the direct consequence of removing real contact channels — the existing login → create Lead → redirect flow (`docs/ux-flows.md` Flow 5) must still resolve to *something* defined, not an undefined or accidentally-real value.

**Independent Test**: complete a full funnel run (Sport Match™ → Results → profile → login → contact) for a demo organization and confirm the outbound redirect target matches whatever contact-handling approach was decided (see Clarifications) — no crash, no `undefined` URL, no accidental real phone/handle.

**Acceptance Scenarios**:

1. **Given** a demo organization's contact channel, **When** a Lead is created and the external redirect fires, **Then** the destination is a value that was deliberately chosen for demo contact handling (not a randomly-generated, potentially-real-looking phone number or handle).

### Edge Cases

- What happens if the image-generation model produces an image that looks like a real, recognizable brand or logo (accidental resemblance from model training data)? The output must be spot-checked before committing; anything recognizable as an existing real brand is regenerated with a more generic prompt.
- What happens to any test fixtures or documentation examples that reference the old real organization names (e.g., "Peru Runners") by name? They are updated to reference the new fictional catalog or genericized, so no doc/test still implies the old real businesses are in the live catalog.
- What happens if OpenRouter image generation fails or is rate-limited partway through 50 organizations? Partial progress is acceptable — the seed can be applied incrementally per organization; a failed image falls back to the existing initials-over-gradient treatment until regenerated, it does not block the whole catalog.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST replace all 10 existing real seed organizations (and their associated venues, sports, schedules, ADN Deportivo™ scores) with 50 entirely fictional organizations — no real organization's name, contact channel, or sourced data may remain in the seed.
- **FR-002**: The 50 fictional organizations MUST collectively cover all 6 PMV sports (at least one per sport) and include at least one organization with a confirmed Callao venue, matching the structural coverage the prior real catalog guaranteed (FR-002/SC-001 pattern).
- **FR-003**: Fictional organization names MUST be clearly invented and MUST NOT closely reproduce the name of an identifiable real Lima/Callao sports organization.
- **FR-004**: Each fictional organization MUST have a generated logo image and a generated cover image, styled per `docs/design-system.md`'s Imagery section (aspect ratios, brand-aligned treatment).
- **FR-005**: Generated images MUST be spot-checked and MUST NOT depict a recognizable real brand, logo, or identifiable person.
- **FR-006**: `supabase/seed/002_organizations.sql`'s header MUST be rewritten to state the catalog is fictional/for demonstration, removing the FR-012 privacy-gating language and the BR-016 "sourced from" citation pattern that no longer apply.
- **FR-007**: Every fictional organization's contact channel MUST resolve per the approach defined in Clarifications — the Lead-creation → external-redirect flow (`docs/ux-flows.md` Flow 5) MUST NOT be left pointing at an undefined, random, or accidentally-real value. [NEEDS CLARIFICATION: what should a fictional organization's contact channel actually be — a clearly-fake on-brand handle, the product owner's own real accounts as demo stand-ins, or something else?]
- **FR-008**: Any documentation or test fixture that names one of the 10 previously-real organizations MUST be updated to no longer imply that organization exists in the live catalog.
- **FR-009**: The matching algorithm's logic, the Lead-creation flow's logic, and design-system token values MUST NOT change as part of this feature — this is a data and asset replacement only.

### Key Entities

- **Organization**: existing entity (see `docs/data-model.md`) — this feature changes only the *data* seeded into it (name, description, district, contact channel, schedule, ADN Deportivo™ scores, logo/cover image URLs), not its schema.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 50 seeded organizations have a distinct generated logo and cover image (zero relying on the initials fallback at time of launch).
- **SC-002**: 0 of the 10 previously-real organizations (by name or UUID) remain queryable in the live database after the seed replacement.
- **SC-003**: All 6 PMV sports return at least one organization when running Sport Match™ end to end.
- **SC-004**: A full funnel run (Sport Match™ → Results → profile → login → contact) completes for a demo organization without an undefined or broken redirect target.

## Assumptions

- Real Lima Metropolitana/Callao **district names** are reused (they are geography, not business identity) — only the organizations placed within them are fictional.
- Fictional names are generated to sound plausible for a Peruvian sports-community context (e.g., invented club/gym/academy names) without targeting or lightly disguising any specific real organization; if a generated name is later found to coincidentally resemble a real one, it gets regenerated.
- ADN Deportivo™ scores, descriptions, and schedules for the 50 organizations are editorially invented for this feature, consistent with how the prior catalog already allowed manual/editorial curation of ADN scores (`docs/data-model.md`).
- This feature does not change how a *future* real, claimed organization (V1.1's claim flow, ADR-0005) would onboard — it only replaces the PMV's admin-preloaded demo data.
- OpenRouter is used only as an external image-generation API called from a local script using a key the product owner supplies outside of committed code (already gitignored); no OpenRouter credential is committed or exposed in the repo.
