# Design System — MatchPoint

Living document (Fase 3 · Diseño, added 2026-07-03). Use this when implementing UI components, layout, styling, and design tokens for the PMV. Inspired by clean, curated products like Luma (see `docs/visual-direction.md`), but must be original to MatchPoint — final brand identity is not locked yet, so use semantic tokens, not hardcoded final brand colors.

The PMV interface must support the core flow: Sport Match™ → Results → Community Profile → Contact.

## Design principles

1. **One primary action per screen** — every screen has a clear next step.
2. **Mobile first** — design for phone usage first.
3. **Curated, not crowded** — avoid dense directory-like layouts.
4. **Visual hierarchy over decoration** — use spacing, typography, and cards to guide attention.
5. **Match explanations are part of the UI** — recommendations must explain fit clearly.
6. **Contact must always be easy** — profile pages should have visible contact CTAs.

## Color direction

Semantic tokens (final brand palette not locked):

```css
--color-background
--color-surface
--color-surface-elevated
--color-text-primary
--color-text-secondary
--color-text-muted
--color-border
--color-primary
--color-primary-hover
--color-primary-soft
--color-accent
--color-success
--color-warning
--color-error
```

Recommended mood: warm neutral background, dark readable text, soft elevated cards, energetic but not neon primary color, subtle accent for Match™ moments, soft success green for match confirmation.

Avoid: aggressive neon, all-black gym aesthetic, overly corporate blue, too many competing colors.

## Typography

Clean sans-serif, strong headings, highly readable body text, friendly but premium.

Type scale: Display 36-44px, H1 30-36px, H2 24-30px, H3 20-24px, Body 16px, Small 14px, Caption 12px.

Font weight: headings 600-700, body 400-500, buttons 600, labels 500-600.

## Spacing system

8px scale: `4, 8, 12, 16, 24, 32, 40, 48, 64` px.

Rules: mobile screens should have at least 20-24px horizontal padding; cards should have 16-24px internal padding; sections should breathe; avoid cramped filter-heavy layouts.

## Border radius

Soft and modern: Small 8px, Medium 12px, Large 20px, XL 28px, Pill 999px.

Usage: buttons medium or pill; cards large; hero containers XL; tags pill.

## Elevation

Subtle shadows only — avoid heavy card shadows. Tokens: `--shadow-sm`, `--shadow-md`, `--shadow-lg`. Usage: result cards small/medium, modals large, sticky CTA medium.

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
