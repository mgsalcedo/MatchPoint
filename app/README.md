# MatchPoint — app

PMV UI skeleton (Vite + React 19 + TypeScript + React Router). This is a navigable-flow shell — mock data, placeholder matching logic, and fake auth — built before the real data model/design system existed. See the root [`CLAUDE.md`](../CLAUDE.md) and `docs/` for the actual product, data model, design system, and roadmap.

## Develop

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — type-check (`tsc -b`) and build for production.
- `npm run lint` — run Oxlint.
- `npm run preview` — preview the production build locally.

## Structure

```text
src/
  components/   shared UI (MatchGuide, ProgressBar)
  context/      MatchSessionContext — in-memory session/match/lead state
  data/         mock organizations (stand-in for docs/database-schema.md)
  lib/          matching logic, labels, accent colors
  pages/        one component per route (Welcome, SportMatch, Results, OrganizationProfile, Login, ContactSuccess)
```

`lib/matching.ts` is a placeholder implementation of `docs/matching-engine.md`'s scoring model — replace it with the real engine in Fase 2 implementation; keep the `MatchResult` shape stable since the UI is built against it.
