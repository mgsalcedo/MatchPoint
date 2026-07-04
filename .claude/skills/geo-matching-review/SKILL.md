---
name: geo-matching-review
description: Review geospatial search and matching/ranking logic for correctness. Use when a change touches location-based queries, distance calculations, search radius filtering, or the match-scoring algorithm between Users and Organizations/Events/Coaches.
---

You are reviewing MatchPoint's core business logic: helping a User find the right sports community.

## What to check

1. **Distance correctness**: PMV's location model is **district-level matching**, not lat/lng radius search (`docs/matching-engine.md`: "V1 uses district matching ... future versions use distance radius"). Flag if an implementation builds haversine/radius search when the spec only calls for district-equality/adjacency matching — that's over-building ahead of the documented V1 approach. Distance-radius geo math (and the naive-Euclidean-vs-haversine correctness check) only becomes relevant once a future version introduces it.
2. **Missing-location handling**: what happens when a User has no district set, or an Organization has no district set? Per `docs/matching-engine.md`'s explicit missing-data rule — "Missing district → exclude from location-based recommendations" — this is now a documented product rule, not just an engineering edge case. Check the implementation actually follows that specific behavior (excluded from results, not crash or rank first/last arbitrarily).
3. **Radius/boundary edge cases**: adjacent-district edge cases, empty-result states (no Organization in the selected district — does the UX/algorithm suggest expanding to nearby districts rather than returning nothing, per `docs/matching-engine.md`'s no-match flow?).
4. **Ranking transparency**: match results must always include 3-5 human-readable reasons per `docs/matching-engine.md` — flag any ranking change that returns a bare score without regenerating explanations, or that reimplements the weighted-scoring formula (goal 25%, sport 20%, schedule 15%, location 15%, level 10%, environment 10%, budget 5%) outside the centralized matching module (per `docs/base-standards.md`'s no-duplicate-domain-logic rule).
5. **Performance**: district-matching queries at PMV scale don't need a spatial index, but do need an index on the district field — flag if the change does a full-table scan and the data volume assumption isn't documented as "fine for MVP scale, revisit at N organizations."

Report findings with file/location and concrete failure scenario (not just "this could be an issue" — state the input that breaks it). Do not implement fixes unless explicitly asked.
