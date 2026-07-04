# Business Rules — MatchPoint

Living document. Non-negotiable business rules for the MatchPoint PMV (Fase 2 · Ingeniería, reconciled 2026-07-03) — treat these as constraints, not suggestions. Complements `docs/product-principles.md` (why) and `docs/data-model.md`/`docs/database-schema.md` (how it's stored).

## BR-001: User receives value before login

The user must be able to start and complete Sport Match™ without logging in. Login is only required when the user attempts to contact an organization.

## BR-002: Only Google and Apple login in PMV

The PMV supports only Continue with Google and Continue with Apple. Do not implement email/password signup unless explicitly requested.

## BR-003: Contact creates a Lead

Every contact action must create a Lead record before opening the external destination. Contact actions: WhatsApp, Instagram, booking, call, form.

## BR-004: North Star is contact

The primary product success metric is contacts generated. Views, likes, saves, and time on page are secondary.

## BR-005: No social feed in PMV

Do not implement user posts, likes, comments, followers, public user profiles, or activity feeds in PMV.

## BR-006: Organizations are preloaded first

Organizations can exist as preloaded profiles before being claimed. MatchPoint should not depend on organizations registering before launch.

## BR-007: Claimed profile requires review

An organization cannot automatically claim and edit a profile without approval. Claim status must be reviewed by admin.

## BR-008: Suspended organizations are hidden

Organizations with status `suspended` or `archived` must not appear in public results, Sport Match™, or public profile pages.

## BR-009: Contact CTA requires contact method

Do not show WhatsApp if the WhatsApp number is missing. Do not show Instagram if the Instagram URL is missing. Do not show booking if the booking URL is missing. If no contact method exists, show: "Esta comunidad todavía no tiene un canal de contacto confirmado."

## BR-010: Sport Match™ requires minimum inputs

Sport Match™ requires: goal, sport, district, days, time, level, budget, environment.

## BR-011: Sport Match™ must be fast

Sport Match™ should be completable in under 60 seconds. Avoid text inputs when possible.

## BR-012: Results must explain fit

Every match result must include at least one reason (recommended: three). Do not display recommendations without explanation.

## BR-013: Missing data reduces confidence

Missing organization data should reduce score or ranking confidence. It should not always exclude the organization unless the missing field is required.

## BR-014: Contact must preserve context

When creating a Lead, preserve: user, organization, match session, match result, contact type, source, sport, goal, district, result rank.

## BR-015: No empty dead ends

If no strong match is found, show closest options and actions to modify criteria. Never show only "No results".

## BR-016: MatchPoint does not fabricate data

Do not generate false information about organizations. If price, schedule, coach, or service is unknown, display it as unknown or omit it.

## BR-017: Verified status must be earned

Do not mark organizations or coaches as verified unless they have been manually reviewed or validated by an approved verification process.

## BR-018: Promoted results not in PMV

The PMV should not include paid ranking. Future promoted results must be clearly labeled and must not damage user trust.

## BR-019: Profile completeness influences ranking

Organizations with more complete profiles can rank slightly higher, all else equal. Completeness must not outweigh sport, location, schedule, and level.

## BR-020: User can contact multiple organizations

A user may create multiple leads from one match session. Each contact creates a separate Lead.

## BR-021: Duplicate leads are allowed with limits

Future rule: prevent a duplicate Lead for the same user + organization + contact type within 10 minutes.

## BR-022: PWA first

MatchPoint PMV is a PWA. Do not build native iOS or Android apps in PMV.

## BR-023: Mobile first

All PMV screens must be designed for mobile first.

## BR-024: Admin can manually manage initial data

For PMV, internal manual data management is acceptable. Do not overbuild dashboards before validating demand.

## BR-025: Every recommendation comes from structured data

Recommendations must be based on stored organization data and user Sport Match™ inputs. Do not recommend organizations outside the database.

## BR-026: Events are not core PMV

Events can exist in the model but should not distract from the core flow: Sport Match™ → Results → Profile → Contact.

## BR-027: Analytics required for core funnel

The app must track: open, start match, complete match, view results, open profile, click contact, login complete, lead created, external contact opened.

## BR-028: Data privacy

Only collect data needed for matching and contact. Do not request sensitive personal information in PMV.

## BR-029: PMV scope cannot expand without explicit approval

Core PMV scope: Sport Match™, Results, Community profile, Contact/Lead. All other features are V1.1+ unless explicitly approved.

## BR-030: User problem comes first

When deciding between user convenience and organization convenience in PMV, prioritize user discovery.
