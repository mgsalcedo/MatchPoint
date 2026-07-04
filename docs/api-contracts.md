# API Contracts — MatchPoint

Living document. Recommended API contracts for the MatchPoint PMV (Fase 2 · Ingeniería, reconciled 2026-07-03). Can be implemented as Next.js server actions, route handlers, or Supabase queries. Cross-reference `docs/data-model.md`/`docs/database-schema.md` for the entities these operate on and `docs/business-rules.md` for the constraints they must enforce.

**Divergence from the originally imported pack:** no `PATCH /api/leads/:id/opened` endpoint, and `POST /api/leads`'s response omits a `status` field — `Lead` is a deliberately immutable single event once created (see `docs/data-model.md`'s divergence note), so there is nothing to patch.

## API principles

1. APIs support Sport Match™ first.
2. Public organization data can be read anonymously.
3. Lead creation requires an authenticated user.
4. All contact actions must create a Lead.
5. Do not expose suspended or archived organizations.
6. Match explanations must be based on real data.

## GET /api/sports

Returns active sports.

Auth: public.

```json
{
  "sports": [
    { "id": "uuid", "name": "Running", "slug": "running" }
  ]
}
```

## GET /api/districts

Returns active Lima and Callao districts.

Auth: public.

## POST /api/match-sessions

Creates a Sport Match™ session and calculates results.

Auth: anonymous allowed.

Request:

```json
{
  "anonymousId": "optional-string",
  "goal": "prepare_race",
  "sportId": "uuid",
  "districtId": "uuid",
  "availableDays": [2, 4, 6],
  "preferredTimes": ["night"],
  "level": "beginner",
  "budget": "100_200",
  "environment": "social"
}
```

Response:

```json
{
  "matchSession": { "id": "uuid" },
  "results": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "rank": 1,
      "score": 91,
      "label": "excellent_match",
      "reasons": [
        "Entrena cerca de tu distrito.",
        "Tiene horarios nocturnos.",
        "Acepta principiantes."
      ],
      "organization": {
        "name": "Team Example",
        "slug": "team-example",
        "logoUrl": "url",
        "districts": ["Miraflores"],
        "sport": "Running"
      }
    }
  ]
}
```

Rules: store match session; store match results; return up to 5 results; exclude suspended or archived organizations.

## GET /api/organizations/:slug

Returns public organization profile.

Auth: public.

```json
{
  "organization": {
    "id": "uuid",
    "name": "Team Example",
    "slug": "team-example",
    "organizationType": "running_team",
    "description": "string",
    "profileStatus": "preloaded",
    "sports": [{ "id": "uuid", "name": "Running" }],
    "venues": [],
    "schedules": [],
    "adn": {
      "beginnerFriendly": 5,
      "competitiveness": 3,
      "socialAtmosphere": 5
    },
    "contact": {
      "hasWhatsapp": true,
      "hasInstagram": true,
      "hasBooking": false
    }
  }
}
```

Rules: suspended or archived profiles return 404; only show contact options that exist.

## POST /api/leads

Creates a Lead before external contact. Immutable once created — no follow-up mutation endpoint (see divergence note above).

Auth: required.

Request:

```json
{
  "organizationId": "uuid",
  "matchSessionId": "uuid",
  "matchResultId": "uuid",
  "contactType": "whatsapp",
  "source": "organization_profile"
}
```

Response:

```json
{
  "lead": { "id": "uuid" },
  "redirect": { "type": "whatsapp", "url": "https://wa.me/..." }
}
```

Rules: create the Lead before returning the redirect URL; validate the requested contact method exists; validate the user is authenticated; preserve match context (BR-014).

## POST /api/profile-claims

Submits a request to claim an organization profile. Priority: P1 (not PMV — see `docs/ux-flows.md` Flow 8).

Request:

```json
{
  "organizationId": "uuid",
  "requesterName": "string",
  "requesterEmail": "email",
  "requesterPhone": "string",
  "requesterRole": "Coach / Founder / Admin",
  "evidenceUrl": "url",
  "message": "string"
}
```

## Error format

```json
{
  "error": {
    "code": "ORGANIZATION_NOT_FOUND",
    "message": "Organization not found."
  }
}
```

Common error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `ORGANIZATION_NOT_FOUND`, `CONTACT_METHOD_UNAVAILABLE`, `MATCH_SESSION_NOT_FOUND`, `LEAD_CREATION_FAILED`, `INTERNAL_ERROR`.

## Final API rule

Build the PMV funnel first: Sport Match™ → Results → Profile → Contact → Lead.
