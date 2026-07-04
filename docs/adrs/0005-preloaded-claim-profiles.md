# ADR-0005 — Preloaded profiles with claim flow

## Status

Accepted

## Context

A marketplace that launches empty has little user value. Waiting for organizations to create their own profiles would slow launch.

## Decision

MatchPoint will preload organization profiles and allow organizations to claim them later.

## Rationale

Creates immediate supply; allows users to discover value from day one; helps prove demand to organizations; reduces the cold-start problem.

## Consequences

Admin/manual data collection is required (`docs/ux-flows.md` Flow 9); profile status must support `preloaded, claimed, verified, rejected, suspended, archived` (`docs/database-schema.md`'s `profile_status` enum); the claim review flow is V1.1, not PMV (`docs/ux-flows.md` Flow 8, `docs/roadmap.md`'s V1.1 milestone).
