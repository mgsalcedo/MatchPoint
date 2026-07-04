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

Avoid: aggressive neon, all-black gym aesthetic, overly corporate blue, too many competing colors, using more than 2-3 of the 5 gradient stops as flat solids on the same screen.

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

Subtle shadows only — avoid heavy card shadows. Tokens: `--shadow-sm`, `--shadow-md`, `--shadow-lg`. Usage: result cards small/medium, modals large, sticky CTA medium.

## Named style: Iridescent Glass

MatchPoint's style, tempered from the "Liquid Glass" pattern (heavy morphing blur + full-rainbow surfaces, common in Web3/fintech apps) down to something that stays fast and WCAG-compliant:

- **Glass surfaces**: semi-transparent white background (`rgba(255,255,255,0.7)`), `backdrop-filter: blur(8-12px)` (not 20px+), 1px border at low opacity (`rgba(255,255,255,0.4)` on colored backgrounds, `var(--color-border)` on plain ones). Reserve for brand moments — hero sections, the standout top match result — not every card. Dense UI (forms, schedule lists, the results list beyond the top card) stays flat and opaque for legibility and performance.
- **Gradient accents**: a 2-3 stop slice of the brand gradient (not all 5 stops at once — that reads as a rainbow slider, not a premium accent), used on the primary CTA and the match-quality badge glow.
- **Aurora wash**: a large, heavily blurred, low-opacity (8-12%) blob of the gradient behind hero content — motion optional (slow drift, 10-20s loop), must respect `prefers-reduced-motion`.

This is an accent treatment, not a redesign of every surface — see Color direction above for where the gradient may and may not appear.

## Layout

**Mobile**: single column, sticky bottom CTA where relevant, one question per screen, cards stacked vertically, bottom safe area respected.

**Desktop**: centered content max-width, profile can use two-column layout, results remain card-based. Recommended widths: question flow max-width 520px, results max-width 760px, profile max-width 960px.

## Buttons

**Primary** — main action (Comenzar Sport Match™, Continuar, Ver comunidad, Contactar). States: default, hover, pressed, disabled, loading.

**Secondary** — alternative but not competing actions (Cambiar respuestas, Probar de nuevo).

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

Visual treatment: soft badge, friendly icon, not too gamified, do not rely only on color.

## Cards

- **Match Result Card** — organization image/logo, organization name, match label, sport and district, 2-3 match reasons, CTA "Ver comunidad".
- **Community Profile Card** — used for schedule, coach, services, ADN.
- **Event Card** — future V2; should share visual language with community cards.

## Icons

Use sparingly. Categories: sport, location, calendar, clock, people, coach, price, verified, contact. Avoid too many icons in one screen, icons without labels, overly playful icon sets.

## Forms

PMV forms are tap-based. Sport Match™ avoids text input except district search and "Other". Rules: one question per screen, large selectable options, clear selected state, simple back navigation, progress indicator.

## Loading states

Use skeletons for content loading. For match calculation, don't use only a spinner — use branded loading copy ("Estoy buscando comunidades que realmente encajen contigo...") with subtle animated symbols. See `docs/microcopy.md` for alternates.

## Empty states

Never show dead-end empty states. Good: "No encontré un match perfecto todavía, pero estas son las opciones más cercanas." Actions: expand district, change schedule, try another sport.

## Error states

Calm and helpful tone. Examples: "No pudimos cargar tus matches. Inténtalo nuevamente.", "Esta comunidad todavía no tiene un canal de contacto confirmado.", "No pudimos iniciar sesión. Prueba otra vez."

## Component naming

`WelcomeHero, SportMatchQuestion, SportMatchProgress, SelectableOption, MatchResultCard, MatchReasonList, CommunityHero, CommunityADN, ScheduleCard, ContactCTA, AuthGate, EmptyMatchState` — see `docs/component-library.md` for full props/rules.

## Page naming

Routes: `/`, `/match`, `/match/results`, `/organizations/[slug]`, `/login`, `/contact/success` — matches `docs/ux-flows.md`'s navigation rules exactly.

## Final design rule

MatchPoint should not look like a generic startup template. It should feel like a curated sports discovery experience where each screen helps the user move closer to belonging.
