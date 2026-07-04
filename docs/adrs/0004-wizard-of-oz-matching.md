# ADR-0004 — Wizard of Oz matching for PMV

## Status

Accepted

## Context

A full AI recommendation system would be expensive and unnecessary before validating demand.

## Decision

The PMV will use Wizard of Oz matching: a simple rule-based and curated matching system that feels intelligent to the user.

## Rationale

Faster validation; lower technical complexity; allows manual curation of initial data; lets the team learn before investing in ML/AI; still creates a strong user experience.

## Consequences

The matching service must be modular and centralized (`docs/base-standards.md`'s no-duplicate-domain-logic rule); explanations must be generated from real data, never fabricated (BR-016); future AI can replace or augment the rules (see `docs/matching-engine.md`'s "Future AI layer").
