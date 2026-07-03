# Security & Privacy Standards — MatchPoint

MatchPoint handles location data and facilitates real-world contact between strangers (Users and Providers/Coaches). Treat this as safety-critical, not just data-protection boilerplate. Referenced by the `trust-safety-review` and `security-privacy-auditor` agent/skill.

## PII & location

- Precise User location is never shown to other Users or Providers directly — only distance/area (e.g. "2.3 km away", or neighborhood-level) until a Booking is confirmed.
- Contact details (phone, exact address) are revealed only after a Booking reaches `confirmed` state, not at `requested`.
- Location and contact data are excluded from logs, analytics events, and error reports by default (allow-list what's logged, don't deny-list).

## Auth & accounts

- Separate account types (User vs. Provider) must not share a session/token scope that allows one to act as the other.
- Provider accounts that can publish public listings need a moderation/verification gate before first publish (manual at MVP is acceptable, but the workflow must exist — no fully open self-publish at launch).

## Trust & safety (marketplace-specific)

- Users must be able to report a Provider/Coach/listing; Providers must be able to report abusive Users. Reports need a triage path even if manually reviewed at MVP.
- No unmoderated free-text fields are rendered without basic abuse filtering (impersonation, contact-info harvesting outside the platform, scam patterns) once volume grows past manual review capacity.
- Rate-limit search/contact-request endpoints to prevent scraping of Provider/Coach contact info or User profiles.

## Data retention & compliance

- Peru's personal data protection law (Ley N.º 29733) governs PII handling — consent for storing location/contact data must be explicit, not bundled into generic ToS acceptance.
- Define a deletion path for User/Provider accounts (data must actually be erasable, not just soft-flagged) before public launch.

## Review trigger

- Any change touching auth, location handling, contact-info visibility, or moderation must run the `trust-safety-review` skill and, before release, a pass from the `security-privacy-auditor` agent.
