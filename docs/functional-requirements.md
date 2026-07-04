# Functional Requirements — MatchPoint

Living document (Fase 4 · Desarrollo, added 2026-07-03). Development-ready functional spec for the PMV — implement in priority order. Complements `docs/business-rules.md` (constraints), `docs/data-model.md`/`docs/database-schema.md` (entities), `docs/component-library.md` (UI), and `docs/roadmap.md` (sequencing).

Core funnel: `Open PWA → Sport Match™ → Results → Community Profile → Contact/Login → Lead Created → External Contact`. Do not implement non-PMV features unless explicitly requested.

## Priority definitions

| Priority | Meaning |
|---|---|
| P0 | Required for PMV launch |
| P1 | Important after PMV core works |
| P2 | Future / nice to have |

## Product constraints

PWA first; mobile-first; no login before value; login only before contact; only Google and Apple auth in PMV; no social feed; no payments in PMV; no chat in PMV; every recommendation must include reasons; every contact must create a Lead (immutable — see `docs/data-model.md`'s divergence note).

# Epic 1 — App entry

## FR-001 — Open PWA

Priority: P0. As a visitor, I want to open MatchPoint from a link so I can immediately start discovering a sports community.

Acceptance criteria: user can open `/` successfully; welcome screen is visible; app is usable on mobile viewport; no authentication required.

## FR-002 — Welcome screen with Match™

Priority: P0. As a new user, I want to understand what MatchPoint does quickly so I feel confident starting the experience. Copy per `docs/microcopy.md`'s Welcome section.

Acceptance criteria: Match™ is introduced; only one main CTA is visible; CTA starts Sport Match™; no menu, registration, or secondary flow distracts the user.

# Epic 2 — Sport Match™

## FR-003 — Start Sport Match™

Priority: P0. As a user, I want to begin Sport Match™ without creating an account so I can receive value first.

Acceptance criteria: clicking CTA navigates to Sport Match™; no login required; a temporary anonymous session ID can be created if needed.

## FR-004 — Show one question per screen

Priority: P0. As a user, I want to answer simple questions one at a time so the experience feels easy and fast.

Acceptance criteria: one question per screen; progress indicator visible; user selects by tapping; continue enabled only after a valid answer; back navigation available after the first question.

## FR-005 — Capture goal

Priority: P0. Question: "¿Qué quieres lograr?" Options per `docs/microcopy.md`. Acceptance criteria: one answer required; selected answer is stored; user can proceed.

## FR-006 — Capture sport

Priority: P0. Question: "¿Qué deporte te interesa?" Acceptance criteria: one answer required in PMV; selected sport maps to the `sports` table; user can proceed.

## FR-007 — Capture district

Priority: P0. Question: "¿Dónde te gustaría entrenar?" Searchable district selector, Lima Metropolitana and Callao only. Acceptance criteria: user can search/select district; district maps to the `districts` table; user can proceed after a valid selection.

## FR-008 — Capture available days

Priority: P0. Question: "¿Qué días puedes entrenar?" Multi-select weekdays, at least one required. Acceptance criteria: user can select one or more days; stored as an integer array; user can proceed.

## FR-009 — Capture preferred time

Priority: P0. Question: "¿En qué horario prefieres entrenar?" Acceptance criteria: one answer required in PMV; stored as preferred time value; user can proceed.

## FR-010 — Capture level

Priority: P0. Question: "¿Cuál es tu nivel?" Acceptance criteria: one answer required; stored as `user_level`; user can proceed.

## FR-011 — Capture budget

Priority: P0. Question: "¿Cuánto quieres invertir al mes?" Acceptance criteria: one answer required; "No estoy seguro" is valid; user can proceed.

## FR-012 — Capture environment

Priority: P0. Question: "¿Qué ambiente buscas?" Acceptance criteria: one answer required; stored as `match_environment`; completing this step triggers matching.

# Epic 3 — Match calculation

## FR-013 — Create match session

Priority: P0. After completing Sport Match™, the app creates a `match_session`. Acceptance criteria: session stores all answers; session can be anonymous; session can be linked to the user after login; match session ID is available for results and lead creation.

## FR-014 — Calculate match results

Priority: P0. System ranks organizations using the matching rules in `docs/matching-engine.md`. Acceptance criteria: returns up to 5 organizations; excludes suspended/archived organizations; excludes organizations without required minimum data; calculates score 0-100; assigns match label; generates reasons; stores results in `match_results`.

## FR-015 — Show branded matching loading

Priority: P0. Copy: "Estoy buscando comunidades que realmente encajen contigo..." Acceptance criteria: loading state appears between questionnaire and results; duration feels intentional; avoid a generic spinner-only experience.

# Epic 4 — Results

## FR-016 — Display match results

Priority: P0. Page: `/match/results`. Content: headline "Tu Match está listo.", subheadline, up to 5 result cards (name, sport, district, match label, reasons, CTA). Acceptance criteria: results ordered by rank; each result has at least 1 reason; CTA "Ver comunidad" opens the organization profile.

## FR-017 — Handle no strong results

Priority: P0. Copy: "No encontré un match perfecto todavía, pero estas son las opciones más cercanas." Acceptance criteria: no dead-end empty screen; user can restart or adjust criteria; closest options shown if available.

# Epic 5 — Organization profile

## FR-018 — View community profile

Priority: P0. Page: `/organizations/[slug]`. Required sections: hero, name, sport, district, match label if entered from results, why this is a match, description, schedule, location, level, environment, price or unknown, contact CTA.

Acceptance criteria: public profile loads without login; suspended/archived profiles are not visible; contact CTA visible if at least one contact method exists.

## FR-019 — Display ADN Deportivo™

Priority: P1. Profile shows available ADN Deportivo™ attributes. Acceptance criteria: missing attributes are hidden; values shown with clear labels; ADN feels like personality, not judgment.

## FR-020 — Display schedule

Priority: P0. Profile shows training schedules. Acceptance criteria: day and time visible; venue/district visible when available; if schedule missing, show "Horario por confirmar".

# Epic 6 — Contact and auth

## FR-021 — Contact CTA

Priority: P0. User can attempt to contact an organization. Acceptance criteria: available contact methods are shown; missing methods are hidden; clicking contact checks auth status; if unauthenticated, show the Auth Gate.

## FR-022 — Auth Gate before contact

Priority: P0. Copy: "Continúa para contactar. Así podremos guardar tu Match y ayudarte a medir si encontraste una comunidad para entrenar." Auth options: Continue with Google, Continue with Apple. Acceptance criteria: no email/password; no long form; after successful login, continue the pending contact flow.

## FR-023 — Create Lead

Priority: P0. System creates a Lead before opening the external contact channel. Required Lead data: `user_id, organization_id, match_session_id, match_result_id, contact_type, source, sport_id, goal, district_id, result_rank, created_at`.

Acceptance criteria: Lead exists before redirect; **Lead is immutable once created — no status field** (see `docs/data-model.md`'s divergence note: an earlier draft of this requirement proposed a `status` starting at `initiated`, which was deliberately rejected to avoid reintroducing Booking's state machine through Lead); external URL opens only after the Lead row is committed.

## FR-024 — Open external contact

Priority: P0. After Lead creation, the app opens the external contact channel. Acceptance criteria: WhatsApp opens the correct `wa.me` link; Instagram opens the correct URL; booking opens the correct URL; the `external_contact_opened` **analytics event** fires (not a Lead status mutation — Lead has no `opened` state, per the divergence note above).

# Epic 7 — Analytics

## FR-025 — Track core funnel

Priority: P0. Required events: `app_opened, welcome_viewed, sport_match_started, sport_match_question_answered, sport_match_completed, results_viewed, result_card_clicked, organization_profile_viewed, contact_clicked, login_started, login_completed, lead_created, external_contact_opened`.

Acceptance criteria: events contain `anonymous_id` or `user_id` when available; events include `match_session_id` where relevant; lead events include `organization_id`.

# Epic 8 — Organization data management

## FR-026 — Preload organizations

Priority: P0. Initial organizations can be created manually or via seed data. Minimum required fields: name, slug, organization type, sport, district/venue, contact method, level, schedule or availability note, environment.

Acceptance criteria: preloaded profiles can appear in results; preloaded profiles can later be claimed; incomplete profiles are not recommended.

## FR-027 — Claim profile

Priority: P1. Organization can request to claim a profile. Acceptance criteria: claim form captures requester information; claim status is `pending`; admin can later approve or reject.

# Epic 9 — Admin

## FR-028 — Admin data management

Priority: P1. Admin can manage initial organization data. A full admin interface is optional for PMV — the Supabase dashboard or manual seed data is acceptable at earliest launch.

Acceptance criteria: admin can create/edit organizations; admin can add schedules, venues, sports, ADN; admin can suspend an organization.

# Explicit non-requirements for PMV

Do not build: chat, feed, likes, comments, payments, native apps, full marketplace checkout, advanced organization dashboard, public athlete profiles, wearables, reviews at scale, AI chatbot.

# Definition of done for PMV

1. User opens PWA.
2. User starts Sport Match™ without login.
3. User completes questionnaire.
4. System creates match session.
5. System displays ranked results.
6. User opens profile.
7. User clicks contact.
8. User logs in with Google or Apple.
9. System creates Lead.
10. External contact opens.
11. Core analytics are tracked.
