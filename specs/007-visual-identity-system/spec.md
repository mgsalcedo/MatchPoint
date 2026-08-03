# Feature Specification: Visual Identity System

**Feature Branch**: `007-visual-identity-system`

**Created**: 2026-08-03

**Status**: Draft

**Input**: User description: "Implement MatchPoint's visual identity system in the app — the already-locked 'Iridescent Glass' design system (docs/design-system.md, docs/visual-direction.md) across every existing screen, plus wiring up the real logo (favicon, wordmark, page title). This is 'build what's already specified,' not a new design decision-making exercise — palette, typography, and named style are locked; only their implementation across the app is in scope."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The app looks and feels like MatchPoint, not an unstyled shell (Priority: P1)

As a first-time visitor, when I open the app, I see MatchPoint's real brand identity — its name, its logo, its color gradient, its typography — on every screen I move through, not a generic, unbranded prototype.

**Why this priority**: this is the literal gap being closed — today the word "MatchPoint" doesn't appear anywhere in the rendered app, the page title is the default "app", and the stylesheet has essentially no brand tokens applied. Nothing else in this feature matters if this foundational layer isn't in place.

**Independent Test**: open every screen in the existing flow (Welcome, Sport Match™ questions, matching transition, Results, Community profile, Login, Contact success) and confirm each one uses the documented brand colors, typography, and spacing — not default browser styling or ad-hoc values — and that the browser tab shows MatchPoint's name and icon.

**Acceptance Scenarios**:

1. **Given** a visitor opens the app for the first time, **When** the Welcome screen loads, **Then** they see MatchPoint's name and mark presented as a real brand moment, the browser tab shows MatchPoint's name and a MatchPoint-derived icon, and the screen uses the documented color/typography/spacing tokens.
2. **Given** a visitor moves through Sport Match™, Results, a Community profile, Login, and Contact success, **When** each screen renders, **Then** every one uses the same consistent token set — no screen looks visually disconnected from the others or reverts to unstyled defaults.
3. **Given** the existing "sin diseño final" work-in-progress banner is still present in the app shell, **When** this feature is complete, **Then** that banner not being accurate anymore is treated as a signal this feature is actually done — the banner's continued presence or removal is a natural checkpoint, not a separate requirement.

---

### User Story 2 - The interface responds and feels alive, not static (Priority: P1)

As a user interacting with buttons, cards, and selectable options — **on a phone as much as on a desktop** — I get immediate, energetic feedback the moment I touch or hover something, so the interface feels responsive and physical rather than flat and inert.

**Why this priority**: this is the specific, explicitly-requested gap ("más interactiva, más hovers") — today's interface has almost no defined interaction feedback at all. Equal priority to User Story 1 because a beautifully-colored but static interface wouldn't satisfy what was actually asked for. Critically, this story covers **touch press feedback**, not only pointer hover: the product is mobile-first by its own first principles, and hover does not exist on touch devices — a hover-only implementation would leave the primary platform with no feedback whatsoever.

**Independent Test**: on a touch device, tap-and-hold every button, card, and selectable option and confirm each visibly responds at the moment of contact; separately, on a pointer device, hover and focus the same elements and confirm the documented hover feedback; then disable motion at the OS level and confirm the experience degrades gracefully rather than breaking.

**Acceptance Scenarios**:

1. **Given** a user on a touch device presses any button, card, or selectable option, **When** their finger makes contact, **Then** the element visibly responds immediately (before release), and springs back when the finger lifts — with no hover state left stuck on the element afterward.
2. **Given** a user hovers or focuses the primary call-to-action on a pointer device, **When** the interaction occurs, **Then** they see a visible glow and lift effect, distinct from the element's resting state.
3. **Given** a user hovers a result card on the Results screen, **When** the interaction occurs, **Then** the card visibly lifts and its shadow deepens; the top-ranked result additionally shows a persistent glow even before any interaction, marking it as the standout recommendation.
4. **Given** a user selects an answer while completing Sport Match™, **When** the selection is made, **Then** the chosen option shows a clearly different, energized visual state from the unselected options — not just a subtle color change.
5. **Given** a user has reduced-motion enabled in their operating system, **When** they use the app, **Then** entrance animations and the background aurora effect are removed or minimized, while press/glow/color-shift feedback (which are not motion) continue to work normally.
6. **Given** a user navigates by keyboard only, **When** they tab to any interactive element, **Then** a clearly visible focus indicator appears — glow alone is never the only signal, since it must also work for users who can't perceive it as clearly.

---

### User Story 3 - Communities are shown with real imagery, not colored placeholders (Priority: P1)

As a user browsing my match results and opening a community profile, I see each community's actual logo and photography — so the recommendations feel like real places with real people, not database rows rendered as colored squares with initials.

**Why this priority**: content is the single largest lever on perceived quality — a card carrying a real community photo reads premium regardless of how polished the surrounding CSS is, and a colored block with initials does not. The database already has columns for this imagery, but the application layer never surfaced them and no imagery was ever loaded, so today the app contains zero images. Equal priority to Stories 1-2 because without it, the visual refresh is a well-styled but visibly empty shell.

**Independent Test**: view the Results list and a Community profile for organizations that have imagery available and confirm real logos/photos render; then view one that has none and confirm it falls back to an on-brand treatment that looks deliberate rather than broken or missing.

**Acceptance Scenarios**:

1. **Given** a community has a logo and/or cover image available, **When** its result card or profile renders, **Then** that real imagery is displayed at a consistent, non-distorted aspect ratio.
2. **Given** a community has no imagery available, **When** its card or profile renders, **Then** it falls back to an on-brand treatment (its initials over a gradient tinted by its sport) that reads as an intentional design state — never a broken image, an empty gray box, or a stock photo of a different community.
3. **Given** images are still loading, **When** the list renders, **Then** each image's space is reserved in advance so content does not visibly jump or reflow as images arrive.
4. **Given** an image fails to load entirely, **When** that failure occurs, **Then** the layout stays intact and the fallback treatment is shown instead of a collapsed or broken element.

---

### User Story 4 - The redesign doesn't break what already works (Priority: P2)

As any user, including one relying on assistive technology or a slower device, the visual refresh doesn't make the app harder to read, use, or navigate than it was before.

**Why this priority**: lower priority than Stories 1-3 only because it's a safeguard on top of them, not new value on its own — but a visually striking redesign that regresses readability or accessibility would undermine the whole effort, so it's still required before this feature is considered done.

**Independent Test**: run an accessibility check across the redesigned screens (contrast ratios, keyboard navigation, touch target size) and confirm no regression from the pre-redesign baseline; confirm match-quality information is never communicated by glow/color alone.

**Acceptance Scenarios**:

1. **Given** any text on any redesigned screen, **When** checked against its background (including text over the glass/gradient treatment in hero sections), **Then** contrast remains at or above the level already required by the product's accessibility direction.
2. **Given** a result's match-quality badge now has a glow effect for strong matches, **When** a user cannot perceive that glow (e.g. due to low vision or a colorblindness condition), **Then** the match-quality label text itself still fully communicates the information — glow is reinforcement, never the only signal.
3. **Given** the app is used on a lower-end device or slower connection, **When** glass/blur/glow effects render, **Then** the app remains usable and responsive — visual richness does not come at the cost of the app becoming sluggish.

### Edge Cases

- What happens on a very small mobile viewport where the wordmark and other brand elements compete with limited space? The brand moment scales down gracefully (e.g. mark-only instead of mark+wordmark) rather than being cropped or forcing horizontal scroll.
- What happens if a browser doesn't support a visual effect used here (e.g. `backdrop-filter`)? The screen degrades to its flat/opaque fallback rather than looking broken or unstyled.
- What happens to the existing "sin diseño final" work-in-progress banner text? It's addressed as part of this feature's completion (removed once it's no longer accurate), not left contradicting the finished work.
- What happens where existing copy doesn't fit a redesigned element (e.g. a longer button label doesn't fit a pill-shaped button)? The visual treatment adapts (wrapping, sizing) before any copy is shortened, and only copy that is strictly a UI-fit problem (not tone/wording) may be trimmed — broader tone/voice changes are explicitly a separate, not-yet-started effort.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every screen in the existing user flow (Welcome, Sport Match™ questions, matching transition, Results, Community/Organization profile, Login, Contact success) MUST use the already-documented brand color, typography, spacing, and border-radius tokens — no screen may remain on unstyled/default browser presentation.
- **FR-002**: The app MUST present MatchPoint's real name and mark as a genuine brand moment visible to users, not only in code comments or internal tooling — at minimum on the Welcome screen, and the browser tab (page title and icon) MUST reflect MatchPoint's real identity instead of placeholder defaults.
- **FR-003**: Primary interactive elements (primary buttons, result cards, selectable Sport Match™ options) MUST provide the documented hover, focus, pressed/selected feedback (glow, lift, color shift) — not just a bare color change.
- **FR-003a**: Every tappable element MUST provide immediate press feedback on touch devices, visible at the moment of contact rather than only on release — hover-only feedback is insufficient, since the product is mobile-first and hover does not exist on touch. Hover-specific styling MUST NOT remain stuck on an element after a tap ends.
- **FR-003b**: Where a community's imagery is available it MUST be displayed at a consistent, undistorted aspect ratio; where it is unavailable, an on-brand fallback (initials over a sport-tinted gradient) MUST be shown instead — never a broken image, an empty placeholder box, or imagery belonging to a different community (no fabricated content, per the product's existing no-fabrication rule).
- **FR-003c**: Image space MUST be reserved before loading completes so lists do not reflow as imagery arrives, and a failed image load MUST fall back gracefully without collapsing the layout.
- **FR-004**: The top-ranked Results card MUST be visually distinguished from the rest of the list as the standout recommendation.
- **FR-005**: Keyboard focus MUST always be visibly indicated on interactive elements, independent of and in addition to any glow effect.
- **FR-006**: Match-quality information MUST remain fully communicated through label text at all times — glow/color intensity may reinforce but never replace it.
- **FR-007**: The experience MUST degrade gracefully for users with reduced-motion preferences enabled — looping/entrance animation is removed or minimized, while non-motion interaction feedback (glow, color shift on hover/focus) continues to function.
- **FR-008**: Text contrast on every redesigned screen, including over any glass/gradient treatment, MUST meet the same accessibility bar already established for the product (no regression from pre-redesign contrast levels).
- **FR-009**: The redesign MUST NOT change the underlying color palette, typography choice, named style, or introduce a dark-mode variant — those are already locked product decisions, out of scope for this feature.
- **FR-010**: The redesign MUST NOT alter matching/business logic, add new pages or routes, or change Match™'s tone/wording, except where a visual treatment strictly requires a copy adjustment to fit (e.g. label length for a redesigned badge).
- **FR-011**: The redesign MUST NOT reproduce another product's proprietary layouts, colors, type treatments, icons, components, or brand assets — competitor products serve as a quality benchmark only, per the product's existing anti-copy rule. Adopting widely-used interaction patterns (press feedback, status pills, section grouping, image-forward cards) is in scope; replicating a specific competitor's visual identity is not.
- **FR-012**: The redesign MUST NOT introduce persistent multi-destination navigation (e.g. a bottom tab bar). The PMV flow is a linear funnel with no parallel top-level destinations; adding such navigation would require inventing destinations that do not exist, which is out of PMV scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of screens in the existing flow visibly use the documented brand tokens (color, typography, spacing) when reviewed screen-by-screen — zero screens remain on unstyled defaults.
- **SC-002**: A first-time visitor can identify the product as "MatchPoint" within the first screen they see, without needing to read a URL or external context.
- **SC-003**: Every primary button, every result card, and every Sport Match™ selectable option demonstrates a distinct, visible state change on hover/focus/selection, verified by direct interaction across all affected screens.
- **SC-003a**: Every tappable element responds visibly at the moment of touch contact on a touch device — verified by direct interaction on a real phone, not only by pointer-based emulation.
- **SC-006**: Every community shown in results or on a profile displays either its real imagery or the on-brand fallback treatment — zero broken images, zero empty placeholder boxes, and zero layout shifts caused by images loading.
- **SC-004**: Zero accessibility regressions from the pre-redesign baseline — contrast, keyboard navigation, and touch target size all remain at or above their current level.
- **SC-005**: With reduced-motion enabled, zero looping or entrance animations remain active, while all hover/focus feedback remains fully functional.

## Assumptions

- The favicon currently in the app was not derived from the locked logo palette; this feature replaces or aligns it with a logo-derived asset as part of establishing real brand presence (FR-002) — not left as a lingering mismatch.
- Visual implementation prefers minimal structural change: existing screens are restyled within their current structure wherever possible; a reusable presentational component is only extracted where the interaction/visual requirement genuinely calls for one (e.g. a badge or button used identically in several places), not as a wholesale refactor to match every component named in the component library reference document.
- "Confident" motion and glow, per the already-updated design direction, still means restrained and accent-only relative to a full neon/Web3 aesthetic — this feature implements what's already documented, it does not push further than that document's stated intensity.
- No new dependency (e.g. a CSS/animation framework) is introduced — implementation uses the same plain CSS approach already established in the codebase.
- Native-style haptic feedback (the physical "click" some native apps produce on tap) is **not achievable** here: it requires platform APIs available only to native applications, and the web vibration API is unsupported on iOS entirely. The perceived tactility is delivered through press-scale and sub-100ms response timing instead. This is a platform limitation, not a scope decision — a native wrapper would be required to change it, which is far outside this feature.
- Surfacing community imagery requires exposing image fields that already exist in the database but were never carried through to the application layer, and loading real imagery into seed data — this feature includes that work, since the visual goal is unachievable without it. Sourcing imagery for organizations that have none is a content task that may extend beyond this feature; the fallback treatment covers those cases indefinitely without looking broken.
- The existing "sin diseño final" work-in-progress banner is removed as part of this feature, since its message becomes inaccurate once the feature is complete.
