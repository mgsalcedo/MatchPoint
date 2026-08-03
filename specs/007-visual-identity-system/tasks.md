# Tasks: Visual Identity System

**Input**: Design documents from `specs/007-visual-identity-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: NONE automated. This is presentational work with no business logic — constitution Principle III's test-first mandate scopes to matching/ranking/lead-eligibility, none of which this touches (plan.md). Verification is `design:accessibility-review` plus the quickstart walkthrough, **including a real touch device** for press feedback (pointer emulation cannot validate it). Existing suites stay green as a regression guard.

**Organization**: by user story (US1 P1, US2 P1, US3 P1, US4 P2 from spec.md), with a Foundational phase for the token layer everything depends on.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete-task dependency)
- **[Story]**: US1 / US2 / US3 / US4 (setup/foundational/polish have no story label)

**Note on parallelism**: most styling tasks write to the same file (`app/src/index.css`), so they are deliberately **not** marked `[P]` even though they're conceptually independent — concurrent edits to one stylesheet conflict. The `[P]` markers here are honest, not decorative.

---

## Phase 1: Setup (brand assets)

- [X] T001 Derive web-sized brand mark assets from `logo.png` (1254×1254, 936KB — unusable as-is) into `app/public/`, using Python + Pillow (verified available; **do not invoke `convert`** — the one on PATH is Windows' filesystem utility, not ImageMagick). Crop the star tile from the wordmark, emit favicon-appropriate and in-app sizes (research.md R5)
- [X] T002 [P] Update `app/index.html` — real `<title>` (currently the Vite default "app") and favicon reference pointing at the T001 asset, replacing the palette-mismatched `favicon.svg` (research.md R6)

---

## Phase 2: Foundational (design token layer)

**⚠️ CRITICAL**: every user story depends on these tokens existing. Nothing else in this feature can be verified until this phase lands.

- [X] T003 Add the `:root` token block to `app/src/index.css` — neutral scaffold colors, brand gradient stops, spacing scale (8px), border radius scale, `--shadow-sm/md/lg`, the new `--shadow-glow`, and `--transition-fast/base/press` (`docs/design-system.md`)
- [X] T004 Add the DM Sans `@import` and base typography to `app/src/index.css` — type scale (Display through Caption) and weights per the design system, replacing whatever the file currently declares
- [X] T005 Restyle layout primitives in `app/src/index.css` — `.app-shell`, `.screen`, `.screen-tight`, `.spacer`, `.text-center` — against the spacing scale and the documented desktop max-widths (question flow 520px, results 760px, profile 960px)

**Checkpoint**: tokens exist and layout breathes correctly. Screens are not yet branded — that's US1.

---

## Phase 3: User Story 1 — The app looks and feels like MatchPoint (Priority: P1) 🎯 MVP-of-this-feature

**Goal**: every screen visibly uses the brand's color, typography, and spacing, and MatchPoint's real identity is present to users.

**Independent Test**: walk all seven screens and confirm each uses brand tokens rather than unstyled defaults; confirm the browser tab and Welcome screen carry MatchPoint's real name and mark.

### Implementation for User Story 1

- [X] T006 [US1] Restyle surface classes in `app/src/index.css` — `.card`, `.section`, `.section-label`, `.callout`, `.chip`, `.chip-row`, `.meta-row`, `.reasons`, `.sticky-footer` — against tokens (depends on T003-T005)
- [X] T007 [US1] Implement the Iridescent Glass surface + aurora wash utilities in `app/src/index.css` — glass at `rgba(255,255,255,0.7)` with `backdrop-filter: blur(8-14px)`, aurora at 12-20% opacity / 60-100px blur, reserved for brand moments only (never dense UI), with a flat opaque fallback where `backdrop-filter` is unsupported
- [X] T008 [US1] Create `app/src/components/BrandMark.tsx` — the T001 mark plus the wordmark rendered as CSS gradient text (`background-clip: text` over the brand gradient, DM Sans), scaling to mark-only on narrow viewports (spec Edge Cases); include accessible text alternative
- [X] T009 [US1] Apply the brand moment to `app/src/pages/Welcome.tsx` — `BrandMark` plus aurora wash hero treatment (depends on T007, T008)
- [X] T010 [US1] Apply brand presence to `app/src/pages/Login.tsx` and `app/src/pages/ContactSuccess.tsx` (depends on T008)
- [X] T011 [US1] Remove the "sin diseño final" work-in-progress banner from `app/src/App.tsx` and its `.wip-banner` rule from `app/src/index.css` — its message is inaccurate once this feature ships (spec Assumptions)

**Checkpoint**: the app reads as MatchPoint on every screen. Still static — interaction is US2.

---

## Phase 4: User Story 2 — The interface responds and feels alive (Priority: P1)

**Goal**: every interactive element gives immediate feedback on touch and on pointer, without breaking reduced-motion or keyboard users.

**Independent Test**: on a real touch device, tap-and-hold every button/card/option and confirm response at contact; on a pointer device, hover and keyboard-focus the same elements; then enable reduced-motion and confirm graceful degradation.

### Implementation for User Story 2

- [X] T012 [US2] Add the press-feedback baseline to `app/src/index.css` — `:active { transform: scale(0.96) }` at `--transition-press: 80ms` plus `touch-action: manipulation` on every interactive selector (`.btn`, `.option`, `.card`, `.link-button`). **This is the mobile baseline, not an enhancement** (research.md R2) (depends on T003)
- [X] T013 [US2] Scope all `:hover` rules under `@media (hover: hover)` in `app/src/index.css` so tapped elements don't stay stuck in a hover state after release, and add `:focus-visible` pairing a visible `outline` **with** glow — never glow alone (FR-005, research.md R9)
- [X] T014 [US2] Style button states in `app/src/index.css` — `.btn-primary` gradient background with glow + lift on hover/focus; `.btn`/`.link-button` secondary treatment with deliberately **no** glow so glow stays a meaningful primary-action signal; disabled and loading states
- [X] T015 [US2] Style result card interaction in `app/src/index.css` — `.card` hover lift + shadow deepen + gradient-tinted border; a top-result modifier carrying always-on `--shadow-glow` and the glass surface
- [X] T016 [US2] Style Sport Match™ option states in `app/src/index.css` — `.option` hover tint, and `.option.selected` filled with a 2-stop gradient slice plus glow, so selection reads as energetic confirmation rather than a subtle swap
- [X] T017 [US2] Restyle match labels as status pills in `app/src/index.css` — `.badge` variants with tinted low-opacity background and matching text color (not saturated fill + white text); glow only on `.badge-excellent`/`.badge-very-good`, flat for weaker labels (`docs/design-system.md` Match labels)
- [X] T018 [US2] Add card/hero entrance animation to `app/src/index.css` — opacity 0→1 and `translateY(8px→0)` at `--transition-base`, staggered 40-60ms across the first 5-6 list items
- [X] T019 [US2] Add the `prefers-reduced-motion` block to `app/src/index.css` — entrance animation and aurora drift collapse to static; press/hover/focus glow and color shifts (not motion) remain fully active (FR-007)

**Checkpoint**: the interface responds on touch and pointer, degrades correctly, and stays keyboard-navigable.

---

## Phase 5: User Story 3 — Communities shown with real imagery (Priority: P1)

**Goal**: real logos/photos render where available; a deliberate on-brand fallback renders where they aren't — which is the common case today.

**Independent Test**: view Results and a profile for an organization with imagery and one without; confirm real imagery renders undistorted and the fallback looks intentional, with no layout shift as images load.

### Implementation for User Story 3

- [X] T020 [P] [US3] Add optional `logoUrl` and `coverImageUrl` to `Organization` in `app/src/types.ts` (data-model.md)
- [X] T021 [P] [US3] Add `logo_url, cover_image_url` to the `SELECT` constant in `app/src/lib/data/organizations.ts`
- [X] T022 [US3] Map both fields through in `app/src/lib/data/mappers.ts` (null → undefined) (depends on T020, T021)
- [X] T023 [US3] Extend `app/src/lib/colors.ts` with a sport-tinted **gradient** helper for the fallback treatment, building on the existing `accentColor()` rather than duplicating the sport→color vocabulary (research.md R4)
- [X] T024 [US3] Create `app/src/components/OrgAvatar.tsx` — renders the real image when present, else initials over the T023 gradient; reserves its box by aspect ratio before load (no reflow, FR-003c); falls back on `onError` rather than collapsing; `loading="lazy"` below the fold (depends on T022, T023)
- [X] T025 [US3] Use `OrgAvatar` for result cards in `app/src/pages/Results.tsx` (depends on T024)
- [X] T026 [US3] Use `OrgAvatar` plus the cover image in `app/src/pages/OrganizationProfile.tsx`, replacing the current initials-only `.hero-block` (depends on T024)
- [X] T027 [US3] Split the results list in `app/src/pages/Results.tsx` — top result rendered with the standout treatment (T015), remainder under a section heading framing them as alternatives. Presentational only: no change to ordering, scoring, or the 5-result cap; the empty-catalog branch from `006-no-empty-results` stays untouched and a single-result case must not render an empty heading (research.md R8)

**Checkpoint**: results and profiles carry real imagery or an intentional fallback; the results screen has rhythm and a clear standout.

---

## Phase 6: User Story 4 — No regressions (Priority: P2)

**Goal**: the redesign doesn't degrade readability, keyboard use, or performance.

**Independent Test**: run the accessibility review and confirm no regression against the pre-redesign baseline.

### Implementation for User Story 4

- [X] T028 [US4] Run the `design:accessibility-review` skill across all redesigned screens — contrast, keyboard navigation, tap-target size (FR-008, SC-004)
- [X] T029 [US4] Verify text contrast specifically **over glass and aurora surfaces**, where translucency can silently drop it below threshold (research.md R9 risk 1) — the one contrast risk this redesign uniquely introduces
- [X] T030 [US4] Verify match-quality remains legible without perceiving glow — confirm the label text alone carries the meaning (FR-006, research.md R9 risk 3)
- [X] T031 [US4] Run the existing test suites and `tsc` as a regression guard — no business logic changed, so both must be green with no modifications

---

## Phase 7: Polish & cross-cutting

- [X] T032 Validate press feedback on a **real touch device** — SC-003a explicitly cannot be satisfied by pointer emulation
- [X] T033 Run `specs/007-visual-identity-system/quickstart.md` end to end, including the full funnel and the `006-no-empty-results` empty-catalog path (FR-010 regression guard)
- [X] T034 Flag the imagery-sourcing content task to the owner — organizations' real logos/photos cannot be invented or scraped (research.md R10, BR-016); the fallback covers them indefinitely, so this is a follow-up, not a blocker

---

## Dependencies & Execution Order

- **Setup (T001-T002)** → **Foundational (T003-T005)** → **Stories** → **Polish**.
- **Foundational blocks everything** — no story is verifiable before the token layer exists.
- **US1** needs Foundational only.
- **US2** needs Foundational; T012 (press baseline) should land before T013-T017 so hover work is layered onto a correct mobile baseline rather than retrofitted.
- **US3**'s data-layer tasks (T020-T022) are independent of all CSS work and can proceed in parallel with US1/US2; its rendering tasks (T024-T027) need US2's card styling (T015) to be visually complete.
- **US4** needs US1-US3 landed — it verifies the finished result.

### Parallel opportunities

- T002 alongside T001.
- **US3's data layer (T020, T021) runs fully parallel to all CSS work** — different files, no overlap. This is the main real parallelism in the feature.
- Within a story, CSS tasks are sequential by necessity (one stylesheet), not by dependency.

## Implementation Strategy

**MVP = Setup + Foundational + US1.** That alone closes the most visible gap — an app that finally looks like MatchPoint. US2 delivers the explicitly-requested interactivity; US3 delivers the largest perceived-quality lever. All three are P1 and the feature isn't complete without them, but US1 is the sensible first checkpoint to stop and look at.

## Notes

- No migration, no schema change, no living-doc update — `docs/data-model.md` and `docs/database-schema.md` already document the image columns correctly (data-model.md).
- `docs/design-system.md` and `docs/visual-direction.md` were already updated earlier in this session (amplified gradient, Interaction & Motion, mobile-first press correction, Imagery section, status pills, results grouping) — no further doc-sync task is needed for them.
- No `data-model-review` or `trust-safety-review` run required — no schema change, and no auth/location/contact-visibility/moderation surface is touched (plan.md Constitution Check).
- Imagery must never become a matching eligibility criterion — `meetsMinimumDataset()` stays untouched, or organizations without a photo would silently disappear from results.
