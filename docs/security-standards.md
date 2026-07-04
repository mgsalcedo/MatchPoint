# Security & Privacy Standards — MatchPoint

MatchPoint handles location data and facilitates real-world contact between strangers (Users and Organizations/Coaches). Treat this as safety-critical, not just data-protection boilerplate. Referenced by the `trust-safety-review` and `security-privacy-auditor` agent/skill.

Reconciled 2026-07-03 against the imported foundation pack via `backend-architect` (`.claude/doc/matchpoint-foundation-reconciliation/backend.md` §5.1/§7), with explicit product-owner sign-off on the contact-info gate change below.

## PII & location

- Precise **User** location is never shown to an Organization directly — only distance/area or district-level location. There is no in-platform messaging/booking surface at PMV for an Organization to see a User's precise location at all.
- **Organization** contact channels (WhatsApp, Instagram, booking link) are public marketplace data once the profile is published/verified — they are shown on the Organization's profile page, not gated. What IS gated behind login + Lead creation is the *contact action* itself (the outbound click) and the resulting persisted association between a specific User and a specific Organization contact attempt. This reflects `docs/ux-flows.md` Flow 5's sequence: auth success → create Lead → open external channel (WhatsApp/Instagram/booking), in that order — the outbound click or external redirect must never fire before the Lead record is actually persisted.
- Location and contact data are excluded from logs, analytics events, and error reports by default (allow-list what's logged, don't deny-list).

## Auth & accounts

- At PMV, only **User** accounts exist (Google/Apple login, at contact-time only). Organization profiles are admin-managed (preloaded, per `docs/ux-flows.md` Flow 9) — Organizations do not log in and have no session at PMV.
- This bullet becomes active at V1.1's claim flow (`docs/ux-flows.md` Flow 8): once Organizations get self-service accounts, a User session and an Organization session must not share a token scope that allows one to act as the other.
- Organization profiles that can be published or edited need a moderation/verification gate before going live. At PMV this is satisfied by construction — only admins can create/edit Organization profiles (Flow 9). At V1.1, Flow 8's admin-review step on claim requests must continue to satisfy this — no fully open self-publish once claiming launches.

## Trust & safety (marketplace-specific)

- Users must be able to report an Organization/Coach/listing; Organizations must be able to report abusive Users (once Organizations have any surface to do so — not required at PMV, which has no messaging). Reports need a triage path even if manually reviewed at MVP.
- No unmoderated free-text fields are rendered without basic abuse filtering (impersonation, contact-info harvesting outside the platform, scam patterns) once volume grows past manual review capacity.
- Rate-limit search, Sport Match™/match-scoring, and contact-request endpoints to prevent scraping of Organization/Coach contact info or User data. Sport Match™ is the primary PMV discovery path (not free-text search), so the match-scoring endpoint itself needs the same rate-limiting attention as a search endpoint would.

## Data retention & compliance

- Peru's personal data protection law (Ley N.º 29733) governs PII handling — consent for storing location/contact data must be explicit, not bundled into generic ToS acceptance.
- Define a deletion path for **User accounts** (data must actually be erasable, not just soft-flagged) before public launch.
- Organization data needs its own correction/removal path (e.g. a claimed org wanting to be removed or corrected) — phrased separately from "account deletion" since Organizations aren't login-based accounts at PMV.

## Review trigger

- Any change touching auth, location handling, contact-info visibility, or moderation must run the `trust-safety-review` skill and, before release, a pass from the `security-privacy-auditor` agent.
- Because the contact-info gate above changed from a conservative "confirmed booking" model to a "public profile + gated contact action" model, run `security-privacy-auditor` on the first implementation of the Contact/Lead flow specifically, even if `trust-safety-review` already passed — confirm the Lead-creation ordering (auth → lead → redirect) is actually atomic in code, not just documented.
