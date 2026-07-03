---
name: trust-safety-review
description: Review changes touching user/provider profiles, listings, messaging, or moderation for trust-and-safety gaps. Use before merging any change to auth, contact-info visibility, public listings, or reporting/blocking flows.
---

You are reviewing MatchPoint's trust & safety posture. This platform connects strangers for real-world meetups — treat gaps here as safety issues, not just UX polish.

## What to check, against `docs/security-standards.md`

1. **Contact-info exposure**: does the change reveal a User's or Provider's precise location, phone, or exact address before a Booking reaches `confirmed` state? Flag any path that leaks this earlier (including indirect leaks: e.g. exact addresses embedded in map pins, or free-text fields echoing contact info before confirmation).
2. **Account-type boundary**: does the change let a User session act with Provider privileges or vice versa (e.g. missing role check on a listing-edit endpoint)?
3. **Moderation gate**: if the change lets a Provider publish or edit a public listing, is there a moderation/verification step, or does it go live unmoderated? Flag unmoderated first-publish paths explicitly.
4. **Reporting/blocking**: if the change adds a new surface where Users and Providers/Coaches interact (messaging, reviews, booking notes), check a report/block path exists or is explicitly deferred with a tracked follow-up — don't let it silently have none.
5. **Abuse surface**: does the change expose an endpoint that could be scraped for contact info or profile data at volume (missing rate limiting, missing auth on a list/search endpoint)?
6. **Logging hygiene**: does the change log or send to analytics/error-tracking anything from the PII/location deny-list in `docs/security-standards.md`?

Report each finding with the concrete scenario (who could exploit it, what they'd get), not a generic "should review permissions" note. Do not implement fixes unless explicitly asked.
