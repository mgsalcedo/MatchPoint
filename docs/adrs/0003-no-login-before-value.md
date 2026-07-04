# ADR-0003 — No login before value

## Status

Accepted

## Context

Asking users to register before they understand MatchPoint's value would reduce conversion.

## Decision

Users can complete Sport Match™, view results, and open profiles without login. Login is required only before contact.

## Rationale

Reduces friction; lets users experience value first; increases motivation to authenticate; aligns login with a meaningful action.

## Consequences

Anonymous match sessions must be supported (`MatchSession.user_id` nullable, per `docs/data-model.md`); sessions should be linkable after login; the Auth Gate appears only on contact (`docs/component-library.md`'s `AuthGate`).
