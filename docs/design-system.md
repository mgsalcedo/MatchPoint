# Design System — MatchPoint

Living document (Fase 3 · Diseño, added 2026-07-03; palette/typography concretized 2026-07-04). Use this when implementing UI components, layout, styling, and design tokens for the PMV. Inspired by clean, curated products like Luma (see `docs/visual-direction.md`), but original to MatchPoint.

Brand identity is now locked, grounded in `logo.png` (repo root) — the color values below were extracted by pixel sampling from that file (hue-clustered, not eyeballed), not invented. If the logo file changes, re-derive these values rather than hand-editing them.

The PMV interface must support the core flow: Sport Match™ → Results → Community Profile → Contact.

## Design principles

1. **One primary action per screen** — every screen has a clear next step.
2. **Mobile first** — design for phone usage first.
3. **Curated, not crowded** — avoid dense directory-like layouts.
4. **Visual hierarchy over decoration** — use spacing, typography, and cards to guide attention.
5. **Match explanations are part of the UI** — recommendations must explain fit clearly.
6. **Contact must always be easy** — profile pages should have visible contact CTAs.

## Color direction

### Brand gradient (from `logo.png`, accent-only — never a full-surface background)

| Stop | Hex | Role |
|---|---|---|
| Cyan | `#2E9FE5` | Gradient start |
| Indigo | `#3A48DB` | |
| Violet | `#6A3DE5` | Primary brand accent (closest single-color stand-in when a flat color is needed) |
| Magenta | `#C93AC9` | |
| Warm gold | `#E2A757` | Gradient end |

Use this 5-stop gradient for: the logo/wordmark itself, the primary CTA button background, the match-quality badge glow, and a subtle blurred "aurora" wash behind hero sections (Welcome, Community profile top). Never apply it as a background behind body text or dense UI (forms, lists) — it must stay an accent, not wallpaper, to protect contrast and keep the interface feeling fast.

**Accessibility exception, magenta stop** (found during `007-visual-identity-system`'s accessibility review): white text placed directly on the true `#C93AC9` fails WCAG AA (4.26:1, needs 4.5:1) at that stop. Any gradient carrying **white text** (the primary CTA background, `.option.selected`) uses a darkened `#B336B3` in its place — `--brand-magenta-cta` alongside `--brand-magenta`, not a replacement of it. The true `#C93AC9` stays exactly as sampled from `logo.png` everywhere the gradient renders as a surface behind non-text content or as gradient-clipped text itself (the wordmark, the aurora wash, the full 5-stop `--gradient-brand`) — those have no white-text-contrast requirement to satisfy.

### Neutral scaffold (semantic tokens — implement as CSS variables)

```css
--color-background: #FAFAFA;
--color-surface: #FFFFFF;
--color-surface-elevated: #FFFFFF; /* + shadow, see Elevation */
--color-text-primary: #1A1A2E;   /* near-black with a violet undertone, not pure black */
--color-text-secondary: #4A4A5E;
--color-text-muted: #6B6B7D;
--color-border: #E5E7EB;
--color-primary: #6A3DE5;         /* violet stop, for flat-color contexts (icons, links, focus rings) */
--color-primary-hover: #5730C4;
--color-primary-soft: #EEEDFE;    /* violet-tinted light fill, e.g. selected option background */
--color-accent: #C93AC9;          /* magenta stop, sparing use (secondary highlights) */
--color-success: #1D9E75;
--color-warning: #BA7517;
--color-error: #DC2626;
```

Avoid: harsh/saturated neon (the kind that reads as a casino or crypto app), all-black gym aesthetic, overly corporate blue, too many competing flat colors, using more than 2-3 of the 5 gradient stops as flat solids on the same screen. **Do** lean into the gradient as a genuinely vivid, glowing accent (amplified 2026-08 per product direction) — the ceiling moved up from "sparing" to "confident," not down toward neon. The difference from neon: MatchPoint's glow is soft-edged, gradient-based, and always an accent on a light surface — never a saturated flat color used as wallpaper, and never competing with body text for attention.

### Per-sport tag colors

Distinct accent per sport tag (cards, chips) — same family as the brand gradient so tags read as "on-brand," not borrowed: Running `#D85A30` (coral), Trail `#639922` (green), Ciclismo `#1D9E75` (teal), Natación `#378ADD` (blue), Triatlón `#7F77DD` (violet, closest to primary), Centro de entrenamiento `#BA7517` (amber).

## Typography

**DM Sans** (Google Fonts, single family, avoids licensing/self-hosting overhead) — one clean modern sans across headings and body. Rejected alternatives: elegant luxury serif pairings (Playfair Display, Cormorant — read spa/editorial, not sports) and condensed athletic pairings (Barlow Condensed — reads generic gym app, which `docs/visual-direction.md` explicitly avoids).

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
```

Type scale: Display 36-44px, H1 30-36px, H2 24-30px, H3 20-24px, Body 16px, Small 14px, Caption 12px.

Font weight: headings 700, body 400-500, buttons 700, labels 500.

## Spacing system

8px scale: `4, 8, 12, 16, 24, 32, 40, 48, 64` px.

Rules: mobile screens should have at least 20-24px horizontal padding; cards should have 16-24px internal padding; sections should breathe; avoid cramped filter-heavy layouts.

## Border radius

Soft and modern: Small 8px, Medium 12px, Large 20px, XL 28px, Pill 999px.

Usage: buttons medium or pill; cards large; hero containers XL; tags pill.

## Elevation

Subtle neutral shadows for structure; a distinct colored glow token for interaction/emphasis (see Interaction & Motion). Tokens: `--shadow-sm`, `--shadow-md`, `--shadow-lg` (neutral, e.g. `rgba(26,26,46,0.08)`), `--shadow-glow` (colored, gradient-based, e.g. `0 0 24px rgba(106,61,229,0.25)`). Usage: result cards small/medium (+ glow on hover/top result), modals large, sticky CTA medium, primary button glow on hover/focus.

## Named style: Iridescent Glass

MatchPoint's style, tempered from the "Liquid Glass" pattern (heavy morphing blur + full-rainbow surfaces, common in Web3/fintech apps) down to something that stays fast and WCAG-compliant — amplified 2026-08 for a more futuristic, higher-energy read while staying on a light surface (product decision: light background + amplified glow, not a shift to dark-mode-first branding; see `docs/visual-direction.md`'s Design positioning for the fuller rationale).

- **Glass surfaces**: semi-transparent white background (`rgba(255,255,255,0.7)`), `backdrop-filter: blur(8-14px)`, 1px border at low opacity (`rgba(255,255,255,0.5)` on colored backgrounds, `var(--color-border)` on plain ones). Reserve for brand moments — hero sections, the standout top match result — not every card. Dense UI (forms, schedule lists, the results list beyond the top card) stays flat and opaque for legibility and performance.
- **Gradient accents**: a 2-3 stop slice of the brand gradient (not all 5 stops at once — that reads as a rainbow slider, not a premium accent), used on the primary CTA, the match-quality badge glow, and now also hover/focus states (see Interaction & Motion below).
- **Aurora wash**: a large, heavily blurred, gradient blob behind hero content — opacity 12-20% (up from the original 8-12%, still capped well below "wallpaper"), blur 60-100px. Slow drift by default (14-22s loop), must respect `prefers-reduced-motion` (drop to fully static). Present on Welcome, Community profile hero, and now also the Results screen's top match — previously hero-only.
- **Glow shadows** (new token, `--shadow-glow`): a soft, colored `box-shadow` using 1-2 gradient stops at low-to-medium opacity (e.g. `0 0 24px rgba(106, 61, 229, 0.25)`), used on hover/focus for the primary button, the top match result card, and selected Sport Match™ options. This is the primary lever for "the interface feels alive" — a glow that brightens on interaction, not a static decoration.

This is an accent treatment, not a redesign of every surface — see Color direction above for where the gradient may and may not appear. "Amplified" means more confident and more present at the moments that already call for the gradient (hero, primary CTA, top result, hover/focus) — it does not mean spreading the gradient into new surfaces that were previously flat (body text backgrounds, dense lists, forms stay untouched).

## Interaction & Motion

Previously under-specified — this section replaces the single "hover" label that used to appear with no actual values. Motion is no longer just "subtle" everywhere (see `docs/visual-direction.md`'s Motion section for the updated framing); it's confident at interaction points, still restrained on ambient/background motion.

**Timing**: `--transition-fast: 120ms`, `--transition-base: 200ms`, both `ease-out`. Hover/focus feedback uses `--transition-fast`; layout shifts (card entrance, page transitions) use `--transition-base`. Press feedback is faster still — see below.

### Touch & press feedback (mobile-first — read this before the hover states below)

Design principle #2 is **mobile first**, and on touch devices **`:hover` does not exist** — a tap either does nothing until release, or fires hover-then-click in one confusing burst. Hover states alone therefore leave the primary target platform with *no* interaction feedback at all. Press feedback is the mobile equivalent and is **not optional**; the hover specs below are the desktop counterpart, not the baseline.

- **Every tappable element** (buttons, cards, options, links-as-buttons) gets an `:active` state: `transform: scale(0.96)` with `--transition-press: 80ms` (faster than `--transition-fast` — press feedback must feel instantaneous or it reads as lag, not response), springing back on release.
- **Minimum tap target 44px** (already in `docs/visual-direction.md`'s accessibility direction) — press feedback on a too-small target reads as a mis-tap, not a confirmation.
- **`touch-action: manipulation`** on interactive elements to remove the ~300ms tap delay; without it, the 80ms press animation is invisible behind the browser's own latency.
- **No `:hover` styles that persist after tap on touch devices** — scope hover rules under `@media (hover: hover)` so a tapped card doesn't stay stuck in its hover state after the finger lifts.

**On haptics**: the tactile "click" some native apps produce on tap is iOS's `UIImpactFeedbackGenerator`, available only to native apps. The web Vibration API (`navigator.vibrate`) is **not supported in iOS Safari at all** — a PWA cannot reproduce it on iPhone. The press-scale + instant-response timing above is what delivers that perceived tactility on the web; do not spec or promise haptics that the platform cannot deliver.

### Hover & focus (desktop / pointer devices)

**Buttons (primary)**: `hover` → background gradient shifts toward its brighter end + `--shadow-glow` appears + `transform: translateY(-1px)`; `pressed` → `translateY(0)`, glow softens; `focus-visible` → same glow as hover plus a 2px `--color-primary` outline (glow alone is not an accessible focus indicator — always pair with a visible outline/ring). `disabled` → no glow, no transform, 50% opacity.

**Buttons (secondary/link)**: `hover` → text color shifts to `--color-primary`, underline or subtle background tint (`--color-primary-soft`), no glow (glow is reserved for primary actions and top-tier moments, so it stays meaningful rather than becoming ambient noise).

**Cards (result cards, especially the top/first result)**: `hover` → `translateY(-2px)`, shadow deepens from `--shadow-sm` to `--shadow-md`, border tints toward the brand gradient at low opacity. The top result additionally gets `--shadow-glow` at rest (not just on hover) — it's the one card allowed to look "always on," reinforcing it as the standout recommendation.

**Selectable options (Sport Match™ questions)**: `hover` → border tints toward `--color-primary`, background shifts to `--color-primary-soft`; `selected` → filled with a 2-stop gradient slice + `--shadow-glow`, so choosing an answer feels like a genuine, energetic confirmation, not just a color swap.

**Match-quality badges**: glow intensity scales with match quality — "Excelente Match"/"Muy buen Match" get a visible `--shadow-glow`; "Match posible"/"Baja compatibilidad" stay flat (no glow) — glow as a signal of strength, not decoration applied uniformly (reinforces, never replaces, the label text itself — accessibility direction still applies: never communicate match quality by color/glow alone).

**Page/section entrance**: cards and hero content fade + rise in on mount (`opacity 0→1`, `translateY(8px→0)`, `--transition-base`, slight stagger for lists — 40-60ms between cards, capped at the first 5-6 items). Aurora wash drift is the only continuous/looping animation; everything else is triggered by mount or interaction, never ambient-looping, per `docs/visual-direction.md`'s "avoid gamification-heavy motion."

**Respect `prefers-reduced-motion`** everywhere in this section: transforms/entrance animations collapse to instant or opacity-only; aurora drift stops; glow and color-shift feedback on hover/focus are unaffected (they're not motion, just static state changes) and remain the primary interactive feedback for users with reduced motion.

## Layout

**Mobile**: single column, sticky bottom CTA where relevant, one question per screen, cards stacked vertically, bottom safe area respected.

**Desktop**: centered content max-width, profile can use two-column layout, results remain card-based. Recommended widths: question flow max-width 520px, results max-width 760px, profile max-width 960px.

## Buttons

**Primary** — main action (Comenzar Sport Match™, Continuar, Ver comunidad, Contactar). States: default, hover, pressed, disabled, loading — see Interaction & Motion for the actual hover/pressed/focus spec (glow, lift, transition timing).

**Secondary** — alternative but not competing actions (Cambiar respuestas, Probar de nuevo). See Interaction & Motion — deliberately no glow, so glow stays a signal reserved for primary actions.

**Social auth** — Continue with Google, Continue with Apple. Large tap area, clear provider icon, no email/password option in PMV.

## Tags and pills

Communicate sport, level, district, environment, trial class, verified, claimed (e.g. `Running`, `Principiante`, `Surco`, `Social`, `Clase de prueba`, `Verificado`). Should not overwhelm the card.

## Match labels

Use labels instead of percentages as primary UI.

| Score | Label |
|---:|---|
| 85-100 | Excelente Match |
| 70-84 | Muy buen Match |
| 55-69 | Buen Match |
| 40-54 | Match posible |
| 0-39 | Baja compatibilidad |

Visual treatment: a compact **status pill** — pill radius, small-caps-weight label text, tinted background at low opacity with a matching text color (not a saturated fill with white text, which reads as an alert). Strong matches ("Excelente"/"Muy buen") additionally carry `--shadow-glow`; weaker ones stay flat (see Interaction & Motion). Not too gamified, and never rely on color or glow alone — the label text always carries the meaning on its own.

## Cards

- **Match Result Card** — organization image/logo (see Imagery, with the initials-on-sport-gradient fallback), organization name, match label pill, sport and district, 2-3 match reasons, CTA "Ver comunidad". Hover/press/entrance behavior and the top-result's always-on glow are specified in Interaction & Motion.

**Results list grouping**: the results screen is not a flat, undifferentiated list. The top result is presented as the standout recommendation (larger treatment, glass surface, always-on glow); the remainder sit under a lighter section heading that frames them honestly as alternatives rather than runners-up. Section headings give the screen rhythm and make the ranking legible without exposing raw scores (which stay out of the primary UI per Match labels above).
- **Community Profile Card** — used for schedule, coach, services, ADN.
- **Event Card** — future V2; should share visual language with community cards.

## Imagery

Added 2026-08 — previously the system described *what* imagery should look like (`docs/visual-direction.md`: real, candid, community-based) but gave no implementable spec, and the app shipped with zero images. Content is the largest single lever on perceived quality: a card carrying a real community photo reads premium at any level of CSS polish; a card carrying a colored block with initials does not.

**Sources**: `Organization.logoUrl` (square mark) and `Organization.coverImageUrl` (wide community photo) — both already exist as columns in the database (`organizations.logo_url`, `organizations.cover_image_url`).

**Aspect ratios**: logo/avatar `1:1` (rendered at 40-56px in list contexts, 72-96px on a profile); cover `16:9` in hero contexts, `4:3` when used as a card thumbnail.

**Fallback when an image is missing** — this is the common case at PMV, and it must never look broken or fabricated (BR-016): render the organization's initials on a **subtle gradient block tinted by its primary sport's accent color** (see Per-sport tag colors), not on a flat gray placeholder and never on a stock photo of a different community. The fallback is a deliberate, on-brand state, not an error state.

**Loading**: reserve the image's box before it loads (fixed aspect ratio) so cards don't reflow — a list that jumps as images arrive undoes the premium feel the images were added for. Use `loading="lazy"` below the fold.

**Never**: stretch/distort to fit, use a stock photo the organization didn't provide, or let a failed image load collapse the layout — an image that 404s falls back to the initials treatment above.

## Icons

Use sparingly. Categories: sport, location, calendar, clock, people, coach, price, verified, contact. Avoid too many icons in one screen, icons without labels, overly playful icon sets.

## Forms

PMV forms are tap-based. Sport Match™ avoids text input except district search and "Other". Rules: one question per screen, large selectable options, clear selected state, simple back navigation, progress indicator.

## Loading states

Use skeletons for content loading. For match calculation, don't use only a spinner — use branded loading copy ("Estoy buscando comunidades que realmente encajen contigo...") with subtle animated symbols. See `docs/microcopy.md` for alternates.

## Empty states

Never show dead-end empty states. As of `006-no-empty-results`, "weak-but-real matches" is no longer an empty state at all — those are always shown, honestly labeled. The one remaining true empty state is zero organizations offering the requested sport: "Todavía no tenemos comunidades de este deporte." Single action: "Elegir otro deporte" (returns to the sport question, not a full restart — see `docs/microcopy.md`/`docs/ux-flows.md`).

## Error states

Calm and helpful tone. Examples: "No pudimos cargar tus matches. Inténtalo nuevamente.", "Esta comunidad todavía no tiene un canal de contacto confirmado.", "No pudimos iniciar sesión. Prueba otra vez."

## Component naming

`WelcomeHero, SportMatchQuestion, SportMatchProgress, SelectableOption, MatchResultCard, MatchReasonList, CommunityHero, CommunityADN, ScheduleCard, ContactCTA, AuthGate, EmptyMatchState` — see `docs/component-library.md` for full props/rules.

## Page naming

Routes: `/`, `/match`, `/match/results`, `/organizations/[slug]`, `/login`, `/contact/success` — matches `docs/ux-flows.md`'s navigation rules exactly.

## Final design rule

MatchPoint should not look like a generic startup template. It should feel like a curated sports discovery experience where each screen helps the user move closer to belonging.
