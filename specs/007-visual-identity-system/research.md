# Research: Visual Identity System

Phase 0 output for `/speckit-plan`.

## R1 — CSS-first architecture: the stylesheet carries most of the redesign, JSX changes stay surgical

Inventoried every `className` used across `app/src/pages` and `app/src/components` (27 distinct) against every selector defined in `app/src/index.css` (37). **Every className in use is already backed by a selector** — there are no ad-hoc inline-styled elements carrying the layout, and no orphan classNames.

**Decision**: rewrite `index.css` against the design tokens as the primary vehicle. Roughly 70% of the visual transformation (color, typography, spacing, radius, elevation, glass, glow, hover/press/focus states, entrance animation) lands without touching a single component file.

**Consequence**: this satisfies the spec's "minimal structural change" assumption honestly rather than by hand-waving — component churn is limited to the places where *structure or content* genuinely changes (R5, R8), not styling. It also means the whole feature can be reviewed largely as one stylesheet diff, which is far easier to verify than a scattered pass over eight page files.

JSX changes are needed only where markup must change: brand assets (R5), imagery elements (R3), results grouping (R8), and removing the now-inaccurate work-in-progress banner.

## R2 — Mobile-first press feedback: correcting a real defect in the freshly-written spec

The `Interaction & Motion` section added to `docs/design-system.md` earlier this session specified **hover states only**. The product's own design principle #2 is "mobile first," and `:hover` does not exist on touch devices — a hover-only implementation leaves the primary target platform with no interaction feedback at all. This was a genuine defect, not a scope gap.

**Decision** (already applied to `docs/design-system.md`): press feedback is the mobile baseline, hover is the desktop counterpart.
- `:active` → `transform: scale(0.96)` at `--transition-press: 80ms` (deliberately faster than `--transition-fast: 120ms`; press feedback slower than ~100ms reads as lag rather than response).
- `touch-action: manipulation` on interactive elements — without it the browser's own ~300ms tap delay hides the press animation entirely.
- All `:hover` rules scoped under `@media (hover: hover)` so a tapped element doesn't remain stuck in its hover state after the finger lifts (a classic mobile artifact).

**Haptics are not achievable and must not be promised**: the tactile click on a native iOS tab bar is `UIImpactFeedbackGenerator`, available only to native apps. The web Vibration API (`navigator.vibrate`) is unsupported in iOS Safari in every version. A PWA cannot reproduce it on iPhone. Perceived tactility comes from press-scale plus sub-100ms response instead. Recorded in `docs/design-system.md` so it isn't re-proposed later.

## R3 — Image support: no migration, no schema change, no doc drift — only an app-layer gap

Traced the full path. `organizations.logo_url` and `organizations.cover_image_url` **already exist** in the database (`docs/database-schema.md` lines 197-198) and are **already documented** in `docs/data-model.md`'s Organization table. The gap is entirely in the application layer:
- `Organization` in `app/src/types.ts` has no image fields.
- The `SELECT` constant in `app/src/lib/data/organizations.ts` doesn't request those columns.
- The mapper never reads them.
- The seed contains zero `logo_url` values.

**Decision**: add `logoUrl?: string` and `coverImageUrl?: string` to the app-level `Organization` type, add both columns to `SELECT`, and map them. **No migration, no `docs/data-model.md` or `docs/database-schema.md` update** — the data model already describes this correctly; only the code was behind.

## R4 — Fallback imagery: extend the existing sport-tinted treatment rather than inventing a placeholder

`app/src/lib/colors.ts`'s `accentColor()` already derives a per-sport color and is already used by `OrganizationProfile.tsx`'s `hero-block` (initials over a sport-colored block). That is exactly the right fallback primitive — it just isn't applied on result cards, and it's a flat color rather than a gradient.

**Decision**: promote it to the documented fallback for every image slot — initials over a **gradient** tinted by the organization's primary sport. Explicitly a deliberate design state, never an error state, and never substituted with a stock photo of a different community (BR-016 no-fabrication).

**Consequence**: the app looks intentional on day one even with an empty seed, so imagery can be backfilled incrementally without a broken interim state.

## R5 — Brand assets: CSS-rendered wordmark, image-derived mark

`logo.png` (repo root) is 1254×1254, 936KB, RGB — far too heavy to ship as-is for a favicon or an in-app mark. It contains two separable elements: a 4-pointed iridescent star inside a rounded-square glass tile, and the word "MatchPoint" rendered as gradient text.

**Decision, split by element**:
- **Wordmark → pure CSS.** The logo's wordmark is gradient text, and the brand typeface (DM Sans) is already the system's chosen family. Rendering it as text with `background-clip: text` over the brand gradient reproduces it faithfully, scales infinitely, weighs zero bytes, and stays selectable/accessible as real text. Strictly better than shipping a raster of a word.
- **Mark → derived raster.** Crop the star tile from `logo.png` and emit web-appropriate sizes into `app/public/`. Python's Pillow is available in this environment for the crop/resize (verified); ImageMagick is not — note that `convert` on PATH is Windows' filesystem utility, **not** ImageMagick, and must not be invoked.

## R6 — Favicon: replace, because the palette genuinely conflicts

The existing `app/public/favicon.svg` uses `#863bff`/`#7e14ff`/`#47bfff` — none of which appear in the locked brand palette (`#2E9FE5`, `#3A48DB`, `#6A3DE5`, `#C93AC9`, `#E2A757`), and its shape is unrelated to the logo's 4-pointed star.

**Decision**: replace it with a mark derived from `logo.png` (R5). Leaving a competing purple in the browser tab while the app renders the real brand gradient would be a visible inconsistency at the exact moment brand identity is being established (FR-002).

## R7 — No new dependencies

`CLAUDE.md` is explicit that no CSS framework is committed. Everything this feature needs — custom properties, `backdrop-filter`, `background-clip: text`, keyframe entrance animation, `@media (hover: hover)`, `prefers-reduced-motion` — is native CSS. **No package is added.** DM Sans continues to load via the Google Fonts `@import` already specified in `docs/design-system.md`.

## R8 — Results grouping is the one genuine structural JSX change

`Results.tsx` currently renders a flat `results.map(...)`. The design system now specifies the top result as a standout (glass surface, always-on glow, larger treatment) with the remainder under a section heading framing them as alternatives.

**Decision**: split the array at render time (`results[0]` vs `results.slice(1)`) — a presentational change only. **No change to matching logic, ordering, scoring, or the 5-result cap** (FR-010): `calculateMatches` already returns results sorted by score, so "first element" is already "top match" with no new computation.

**Guard**: the empty-catalog branch shipped in `006-no-empty-results` must keep working untouched, and a single-result case must not render an empty "alternatives" heading.

## R9 — Accessibility is a build constraint here, not a review afterthought

Three specific risks this particular redesign introduces, each with its guard:
1. **Contrast over glass/gradient** — translucent surfaces over an aurora wash can drop text contrast below threshold depending on what's behind. Guard: body text never sits directly on the gradient; glass surfaces keep a high-opacity white floor (`rgba(255,255,255,0.7)` minimum) so text contrast is computed against near-white, not against the wash.
2. **Glow as a focus indicator** — a colored glow is not a reliable focus indicator (invisible to some low-vision users, and it's the same visual language as hover). Guard: `:focus-visible` always pairs glow with a real `outline`, never glow alone (FR-005).
3. **Glow as match-quality signal** — glow intensity scaling with match strength must never become the only carrier of that meaning. Guard: the label text always states it (FR-006), already true today.

`design:accessibility-review` runs before merge as the verification gate.

## R10 — Seed imagery is a content task, explicitly outside code scope

Making the app *capable* of showing imagery (R3, R4) is code and lands here. *Sourcing* logos and photos for the seeded organizations is neither — the images belong to real Peruvian sports communities and cannot be invented, generated, or scraped from their social accounts without an owner decision (BR-016, and a rights question beyond it).

**Decision**: this feature ships the capability plus the fallback. Organizations with no imagery render the fallback indefinitely and correctly. Backfilling real imagery is a separate content task, flagged for the owner, not a blocker for this feature.
