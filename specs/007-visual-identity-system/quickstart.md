# Quickstart: Visual Identity System — validation

No migration, no owner action, no new dependency. `npm install && npm run dev` in `app/` (unchanged).

## Validate (proves the feature works)

| Check | Action | Expected | Proves |
|---|---|---|---|
| Brand presence | Open the app | Browser tab shows MatchPoint's name and a logo-derived icon; the Welcome screen shows the mark and wordmark as a real brand moment | US1, FR-002, SC-002 |
| Token coverage | Walk every screen: Welcome → Sport Match™ → matching transition → Results → Community profile → Login → Contact success | Every screen uses brand color/typography/spacing — none falls back to unstyled defaults or looks disconnected from the others | US1, FR-001, SC-001 |
| Press feedback (mobile) | On a **real touch device**, tap-and-hold every button, result card, and Sport Match™ option | Each responds visibly at the moment of contact (before release) and springs back; no element stays stuck in a hover state after the tap | US2, FR-003a, SC-003a |
| Hover/focus (desktop) | On a pointer device, hover and keyboard-focus every primary/secondary button and result card | Documented glow + lift on hover; focus shows a visible outline **in addition to** glow, never glow alone | US2, FR-003/FR-005, SC-003 |
| Top-result emphasis | View Results with 2+ matches | The top result is visibly distinguished (glass, always-on glow) from the alternatives below it, which sit under their own heading | US2, FR-004 |
| Imagery + fallback | View Results and a profile for an org **with** imagery, then one **without** | Real logo/photo renders undistorted where available; where absent, initials over a sport-tinted gradient — never a broken image, gray box, or another community's photo | US3, FR-003b, SC-006 |
| No layout shift | Reload Results on a throttled connection | Image space is reserved in advance — cards don't jump or reflow as images arrive | US3, FR-003c |
| Reduced motion | Enable reduced-motion at the OS level, reload | Entrance animation and aurora drift stop; press/hover/focus feedback still works normally | US2, FR-007, SC-005 |
| Accessibility | Run `design:accessibility-review` across the redesigned screens | No contrast, keyboard-navigation, or tap-target regression vs. the pre-redesign baseline; match quality still readable without perceiving glow | US4, FR-006/FR-008, SC-004 |
| Regression | Complete a full funnel run end to end, including the empty-catalog path from `006-no-empty-results` | Matching, results ordering, contact flow, and the "no communities for this sport" branch all behave exactly as before | FR-010 |

## Out of scope (do not do this feature)

- Changing the palette, typography, or named style (locked).
- A dark-mode variant (deferred by explicit decision).
- Persistent multi-destination navigation / bottom tab bar (FR-012 — the PMV funnel has no parallel destinations).
- Native haptic feedback (platform-impossible on iOS web — research.md R2).
- Match™ tone/wording changes (separate feature).
- Sourcing real imagery for seeded organizations (content task — research.md R10).
