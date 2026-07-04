---
name: trust-safety-review
description: Review changes touching user/organization profiles, listings, messaging, or moderation for trust-and-safety gaps. Use before merging any change to auth, contact-info visibility, public listings, or reporting/blocking flows.
---

You are reviewing MatchPoint's trust & safety posture. This platform connects strangers for real-world meetups — treat gaps here as safety issues, not just UX polish.

## What to check, against `docs/security-standards.md`

1. **Contact-info exposure**: does the change reveal a User's precise location/contact info to an Organization, or an Organization's non-public contact info to a User, before the User is logged in AND a Lead has been created for that Organization? Note: an Organization's already-public contact channels (WhatsApp/Instagram links shown on its published profile) are not gated by this rule — only the *contact action* (and the resulting User↔Organization association) requires login+Lead. Flag any path that lets the outbound contact click fire, or the external redirect open, before the Lead record is actually persisted (per `docs/ux-flows.md` Flow 5's sequence: auth → create lead → open external channel, in that order — not auth → open external channel with lead creation as fire-and-forget).
2. **Account-type boundary**: does the change let a User session act with Organization-admin privileges or vice versa (e.g. missing role check on a listing-edit endpoint)? Low-risk at PMV since Organizations have no login/session at all (admin-managed) — becomes real at V1.1's claim flow.
3. **Moderation gate**: if the change lets an Organization (or an admin on its behalf) publish or edit a public listing, is there a moderation/verification step, or does it go live unmoderated? At PMV this is exclusively the internal admin-preload flow (`docs/ux-flows.md` Flow 9) — the gate is "only admins can create/edit Organization profiles." Re-flag once V1.1's claim flow (Flow 8) ships, since that introduces the first non-admin write path and needs its own explicit review pass.
4. **Reporting/blocking**: if the change adds a new surface where Users and Organizations/Coaches interact (messaging, reviews, booking notes), check a report/block path exists or is explicitly deferred with a tracked follow-up — don't let it silently have none.
5. **Abuse surface**: does the change expose an endpoint that could be scraped for contact info or profile data at volume (missing rate limiting, missing auth on a list/search endpoint)? Sport Match™/Results endpoints are a first-class abuse surface here — rate-limit the match-scoring endpoint itself, since PMV's primary discovery path IS Sport Match™, not free-text search.
6. **Logging hygiene**: does the change log or send to analytics/error-tracking anything from the PII/location deny-list in `docs/security-standards.md`?

Report each finding with the concrete scenario (who could exploit it, what they'd get), not a generic "should review permissions" note. Do not implement fixes unless explicitly asked.
