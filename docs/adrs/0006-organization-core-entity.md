# ADR-0006 — Organization as core supply entity

## Status

Accepted

## Context

MatchPoint includes teams, clubs, gyms, coaches, federations, academies, and event organizers. Modeling only "teams" would limit future expansion.

## Decision

Use `Organization` as the core supply-side entity (superseding the earlier `Provider`/`Community` split — see the reconciliation note at the top of `docs/data-model.md`).

## Rationale

Flexible across sports and business types; supports future expansion; avoids schema redesign; makes the marketplace model more scalable.

## Consequences

`organization_type` is a required field (`docs/database-schema.md`'s enum); coaches, venues, schedules, events, and sports relate to organizations rather than existing as independently matchable sub-entities (Coach's exact modeling is still open — `docs/data-model.md` open question 2).
