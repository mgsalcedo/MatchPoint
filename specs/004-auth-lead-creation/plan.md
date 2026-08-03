# Implementation Plan: Real Auth & Lead Creation (North Star)

**Branch**: `004-auth-lead-creation` | **Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-auth-lead-creation/spec.md`

## Summary

Replace the fully-mocked login/contact flow with the real thing: Google OAuth via Supabase Auth (Apple deferred, research.md R1), a real `users` row provisioned on first login, and a real, permanent `leads` row created before any external contact (WhatsApp/Instagram/booking) opens — the PMV's North Star event. The hard technical problem this feature actually solves is state survival across OAuth's full-page redirect (the pending contact action, and everything needed to complete it, is persisted to `sessionStorage` and resumed on a new `/auth/callback` route) plus two RLS gaps that must close for any of this to work (`users` had zero policies; `match_sessions`/`match_results` had no `authenticated`-role policy, a real regression risk for 002's shipped functionality once login persists across reloads). No UI redesign, no schema changes — this is a mock-to-real swap under already-built screens (Login.tsx, ContactSuccess.tsx, OrganizationProfile.tsx's contact CTA).

## Technical Context

**Language/Version**: TypeScript (existing `app/` toolchain), React 19, Vite

**Primary Dependencies**: `@supabase/supabase-js` (already a dependency — this feature is the first to use its Auth module, no new package).

**Storage**: Supabase PostgreSQL — same project as prior milestones; two new migrations (`0010`, `0011`), RLS policies only, no schema/column changes.

**Testing**: Vitest — unit tests (pure logic: `leadMappers.ts`, `pendingContact.ts`, `sessionMappers.ts`'s extensions) test-first per constitution Principle III. The RLS-gated authenticated write path (`createLead`, `ensureUserRow`) is verified manually/E2E against real Google OAuth, not via an automated integration test — deliberately, to avoid ever using the `service_role` key (research.md R13).

**Target Platform**: Web (mobile-first PWA), evergreen browsers. Relies on a real external OAuth redirect round-trip and `sessionStorage` (both already-standard, no new browser API surface).

**Project Type**: Single existing web app (`/app`) — no new project/package created.

**Performance Goals**: No new target. One extra single-row read (`getOrganizationContactSnapshot`) per contact attempt — negligible.

**Constraints**: Constitution Principle VI (Trust & Safety) is triggered — this feature touches auth, real user PII, and contact-info visibility, so `trust-safety-review` and a `security-privacy-auditor` pass are mandatory before release, not optional. `service_role` key is never used anywhere in this feature, including test setup (research.md R13). `leads` remains fully immutable — enforced at the RLS level (no `UPDATE`/`DELETE` policy exists for any role), not merely by application-code discipline.

**Scale/Scope**: ~9 new files, ~10 modified files (backend plan `.claude/doc/auth-lead-creation/backend.md` §11); two new migrations; one feature branch.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still passes.*

| Principle | Status | Notes |
|---|---|---|
| I. No Login Before Value (NON-NEGOTIABLE) | ✅ PASS | Confirmed by backend plan §9: `login()`/`signInWithOAuth` only ever fires from inside a contact-attempt branch. The new `onAuthStateChange` boot listener (session persistence) only *recognizes* a pre-existing session — it never prompts a new login. |
| II. Sport Match™ First — centralized matching | ✅ PASS (not applicable) | No matching/ranking code touched. `geo-matching-review` is not a required gate for this feature. |
| III. Test-First for Business Logic (NON-NEGOTIABLE) | ⚠️ GATE — scoped, enforced in tasks.md | `leadMappers.ts` and `pendingContact.ts` are pure, small, and test-first (TDD) — a wrong enum string or a sessionStorage bug fails silently otherwise. The FR-013 re-verification *decision logic* (is this org still contactable, does this specific channel still exist) is extracted into a pure, unit-testable function separate from its I/O wrapper. `createLead`/`ensureUserRow` themselves are RLS-gated I/O, not business/ranking logic — verified manually/E2E instead (research.md R13), which is a deliberate, documented scope boundary, not a skipped gate. |
| IV. Contact/Lead Is the North Star | ✅ PASS | This feature is what actually implements it. No field added to `leads`; no code path anywhere calls `.update()`/`.delete()` on it; immutability is enforced by RLS (no such policy exists), not just convention. |
| V. PMV Scope Discipline | ✅ PASS | Apple deferred (owner-confirmed, research.md R1); no logout flow; no retroactive session-linking; no lead de-duplication (BR-021) — all correctly left out. |
| VI. Trust & Safety | 🔒 TRIGGERED — mandatory gates | This feature touches auth, real user PII (name/email/avatar), and contact-info visibility. `trust-safety-review` skill **and** the `security-privacy-auditor` agent are required before release (not the conditional "only if" case — this is squarely the case the constitution names). Scheduled as a tasks.md phase, not an afterthought. |

No unjustified violations — Complexity Tracking table below is empty by design.

## Project Structure

### Documentation (this feature)

```text
specs/004-auth-lead-creation/
├── plan.md              # This file
├── research.md          # Phase 0 output — R1-R13, incl. 1 owner-confirmed product decision (Google-only)
├── data-model.md         # Phase 1 output — users/leads write mapping, RLS closure
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── lead-creation.md
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

Existing single Vite app (`/app`) — no new project or package. Additive files under the established `app/src/lib/data/` data-access layer, plus targeted edits to the already-built (but fully mocked) auth/contact screens:

```text
supabase/
└── migrations/
    ├── 0010_users_rls_policies.sql        # NEW — RLS only
    └── 0011_authenticated_match_write.sql  # NEW — RLS only, closes a 002-era gap

app/src/
├── lib/
│   ├── pendingContact.ts        # NEW — sessionStorage read/save/clear, pure
│   ├── pendingContact.test.ts   # NEW — test-first
│   ├── analytics.ts             # MODIFIED — 4 new event variants
│   └── data/
│       ├── users.ts              # NEW — ensureUserRow()
│       ├── leadMappers.ts        # NEW — pure, test-first
│       ├── leadMappers.test.ts   # NEW
│       ├── leads.ts              # NEW — createLead()
│       ├── organizations.ts      # MODIFIED — + getOrganizationContactSnapshot()
│       ├── sessionMappers.ts     # MODIFIED — export GOAL_MAP; buildMatchResultRows gains id
│       ├── matchSessions.ts      # MODIFIED — accepts userId, returns matchResultIds
│       └── types.ts              # MODIFIED — + DbContactType, DbLeadSource
├── context/
│   └── MatchSessionContext.tsx  # MODIFIED — real login(), performContact(), completePendingContact(),
│                                  #            onAuthStateChange listener, lastContactedOrganization
├── pages/
│   ├── Login.tsx                 # MODIFIED — real signInWithOAuth; Apple button hidden (research.md R1)
│   ├── AuthCallback.tsx          # NEW — /auth/callback route target
│   ├── OrganizationProfile.tsx   # MODIFIED — async handleContact; "booking_link" → "booking"
│   └── ContactSuccess.tsx        # MODIFIED — prefers lastContactedOrganization when present
├── App.tsx                       # MODIFIED — + /auth/callback route
└── types.ts                      # MODIFIED — ContactType trimmed; + LeadSource; Lead simplified; MatchResult + id
```

**Structure Decision**: continues the existing single-app structure unchanged — this feature only adds to `app/src/lib/data/` (the pattern established across 001/002) and wires already-built UI screens to it. No new frontend/backend split, no new package.

## Complexity Tracking

*No entries — Constitution Check has no unjustified violations. Principle III's scope boundary (manual/E2E over an automated integration test for the RLS-gated write path) is a documented, deliberate decision (research.md R13), not a gate skipped for convenience.*
