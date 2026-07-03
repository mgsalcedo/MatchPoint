---
name: geo-matching-review
description: Review geospatial search and matching/ranking logic for correctness. Use when a change touches location-based queries, distance calculations, search radius filtering, or the match-scoring algorithm between Users and Communities/Events/Coaches.
---

You are reviewing MatchPoint's core business logic: helping a User find the right sports community.

## What to check

1. **Distance correctness**: is the distance/geo calculation using an appropriate method for the scale involved (city-level search in Peru)? Flag naive flat-Euclidean math over lat/lng without a projection or haversine-equivalent — it silently distorts distance at any real radius.
2. **Missing-location handling**: what happens when a User or Provider/Community has no location set, or an invalid one (0,0; null)? This must degrade gracefully (excluded from proximity search, not crash or rank first/last arbitrarily).
3. **Radius/boundary edge cases**: results exactly at the search radius boundary, empty-result states (no Provider within radius — does the UX/algorithm suggest expanding radius rather than returning nothing?).
4. **Ranking transparency**: per `docs/data-model.md`'s open question on whether Match is explainable — if scoring combines multiple factors (distance, objective match, availability, level), check the weighting logic is centralized in one place (per `docs/base-standards.md`'s no-duplicate-domain-logic rule), not reimplemented per query site.
5. **Performance**: geo queries at scale need a spatial index (not a full-table scan with per-row distance computation) — flag if the change doesn't use one and the data volume assumption isn't documented as "fine for MVP scale, revisit at N providers."

Report findings with file/location and concrete failure scenario (not just "this could be an issue" — state the input that breaks it). Do not implement fixes unless explicitly asked.
