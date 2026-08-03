# Implementation Plan: Visual Identity System

**Branch**: `007-visual-identity-system` | **Date**: 2026-08-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-visual-identity-system/spec.md`

## Summary

Implement the already-locked "Iridescent Glass" design system across every screen of the existing flow, wire up the real brand identity (logo mark, wordmark, favicon, page title), and close the three gaps that keep the app looking like an unstyled prototype: no design tokens applied, no interaction feedback, and no imagery anywhere.

The architecture is CSS-first (research.md R1): all 27 classNames used across pages/components are already backed by the 37 selectors in `index.css`, so rewriting that stylesheet against the design tokens delivers most of the transformation with zero component churn. JSX changes stay surgical — brand assets, image elements, results grouping, banner removal.

Three findings shaped this plan. **Imagery is the largest lever and it's an app-layer gap, not a schema one**: `logo_url`/`cover_image_url` already exist in the database and are already documented, but the app type, query, and mapper never surfaced them, so the app contains zero images (R3). **The freshly-written Interaction & Motion spec had a real defect** — hover-only states on a mobile-first product, where hover doesn't exist; corrected with a press-feedback baseline (R2). **Native haptics are platform-impossible on iOS web** and must not be promised; perceived tactility comes from press-scale plus sub-100ms timing instead (R2).

## Technical Context

**Language/Version**: TypeScript (React 19, Vite) — unchanged.

**Primary Dependencies**: none new (research.md R7). Everything needed is native CSS: custom properties, `backdrop-filter`, `background-clip: text`, keyframes, `@media (hover: hover)`, `prefers-reduced-motion`.

**Storage**: no schema change, no migration — two existing columns get surfaced to the app layer (data-model.md).

**Testing**: no new automated tests. This is presentational work with no business logic — constitution Principle III's test-first mandate scopes to matching/ranking/lead-eligibility, none of which this touches. Verification is the `design:accessibility-review` gate plus the quickstart's manual walkthrough, including a **real touch device** for press feedback (SC-003a) since pointer emulation cannot validate it. Existing suites must stay green as a regression guard.

**Target Platform**: PWA, mobile-first — the primary validation surface, not an afterthought.

**Performance Goals**: no layout shift from images (reserved boxes, R3/FR-003c); glass/blur/glow must not make the app feel sluggish on mid-range phones (`backdrop-filter` capped at 8-14px per the design system, glass reserved for brand moments rather than every surface).

**Constraints**: palette/typography/named style locked; no dark mode; no new routes or navigation (FR-012); no competitor visual identity reproduced (FR-011); no matching/business logic touched (FR-010); text contrast never regresses, including over glass (FR-008).

**Scale/Scope**: 1 stylesheet rewritten, ~8 page/component files touched for structure, 3 data-layer files for image fields, 2 brand assets derived, design-system doc already updated in-session.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- **I. No Login Before Value** — ✅ Pass / N/A. Purely presentational; no auth gate moves.
- **II. Sport Match™ First** — ✅ Pass, and actively defended. FR-012 rejects a bottom tab bar partly because browse/filter navigation contradicts "recommend, don't search"; the competitor's category-chip pattern was deliberately **not** adopted for the same reason. Matching logic untouched.
- **III. Test-First for Business Logic** — ✅ Pass / N/A. No business logic changes; the mandate is scoped to matching/ranking/lead-eligibility. Existing tests act as the regression guard.
- **IV. Contact/Lead Is the North Star** — ✅ Pass. The contact CTA gets *stronger* visual treatment (primary-button glow, sticky footer emphasis). No change to Lead creation or its ordering guarantee.
- **V. PMV Scope Discipline** — ✅ Pass, with two scope refusals recorded as requirements: no tab bar / new destinations (FR-012), and imagery *sourcing* explicitly excluded as a content task (R10). The one scope *addition* — image support in the app layer — is justified as the largest lever on the feature's own stated goal, and is small in code (three files, no migration).
- **VI. Trust & Safety** — ✅ Pass. No auth, location-precision, contact-visibility, or moderation surface changes. One relevant guard: the imagery fallback must never substitute another community's photo (BR-016 no-fabrication), enforced in FR-003b.

**Accessibility gate**: not a formal constitution principle, but `docs/visual-direction.md` carries an explicit accessibility direction and this redesign introduces three specific risks (contrast over glass, glow-as-focus-indicator, glow-as-sole-signal) — each has a documented guard in research.md R9, and `design:accessibility-review` runs before merge.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/007-visual-identity-system/
├── plan.md              # This file
├── research.md          # Phase 0 output (R1-R10)
├── data-model.md        # Phase 1 output (two optional fields, no migration)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not yet created)
```

No `contracts/` — no new or changed external interface.

### Source Code (repository root)

```text
app/
├── index.html                        # MODIFIED — real <title>, favicon reference
├── public/
│   └── (brand mark assets)           # NEW — derived from logo.png via Pillow (R5)
└── src/
    ├── index.css                     # REWRITTEN — the primary vehicle (R1): tokens, glass,
    │                                  #   glow, press/hover/focus, entrance, reduced-motion
    ├── types.ts                      # MODIFIED — logoUrl/coverImageUrl on Organization
    ├── App.tsx                       # MODIFIED — remove the now-inaccurate wip-banner
    ├── lib/
    │   ├── colors.ts                 # MODIFIED — sport-tinted gradient for the fallback (R4)
    │   └── data/
    │       ├── organizations.ts      # MODIFIED — add both columns to SELECT
    │       └── mappers.ts            # MODIFIED — map both fields through
    ├── components/
    │   ├── BrandMark.tsx             # NEW (if needed) — mark + CSS-gradient wordmark (R5)
    │   └── OrgAvatar.tsx             # NEW — image-or-fallback, used by cards and profile (R4)
    └── pages/
        ├── Welcome.tsx               # MODIFIED — brand moment
        ├── Results.tsx               # MODIFIED — top-result split + section heading (R8)
        ├── OrganizationProfile.tsx   # MODIFIED — cover image, avatar via OrgAvatar
        ├── SportMatch.tsx            # MODIFIED — selection state (mostly CSS)
        ├── Login.tsx                 # MODIFIED — brand presence
        └── ContactSuccess.tsx        # MODIFIED — brand presence
```

**Structure Decision**: same single-project layout as 001-006. Two new components are proposed rather than assumed — `OrgAvatar` earns its place because the image-or-fallback logic would otherwise be duplicated across result cards and the profile (the spec's "only extract where genuinely required" test); `BrandMark` only if the mark+wordmark appears in more than one place. Everything else stays inline, per the spec's minimal-structural-change assumption.

## Complexity Tracking

*No entries — no Constitution Check violations requiring justification.*
