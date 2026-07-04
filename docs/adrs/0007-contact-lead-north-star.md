# ADR-0007 — Contact/Lead as North Star

## Status

Accepted

## Context

Downloads, profile views, or time spent do not prove marketplace value.

## Decision

The North Star Metric is contacts generated between users and sports organizations. Each contact creates a `Lead` — a single immutable event, not a workflow (reaffirmed 2026-07-03 against an imported engineering pack that proposed a mutable `status` field; see `docs/data-model.md`'s divergence note for why that was rejected).

## Rationale

Represents user intent; creates value for organizations; supports future monetization; easy to measure; tied directly to the product promise.

## Consequences

Every contact must create a Lead before the external redirect (BR-003); analytics must track the contact funnel (BR-027); product decisions should improve contact quality and volume; attendance/booking-outcome tracking is explicitly deferred to V2's `Booking` entity, not bolted onto `Lead` (`docs/roadmap.md`'s V2 milestone).
