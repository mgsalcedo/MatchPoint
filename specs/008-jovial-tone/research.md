# Research: Match™ Jovial Tone Recalibration

Phase 0 output for `/speckit-plan`. No `backend-architect` invocation — this feature touches no data model, API, or matching/ranking logic (CLAUDE.md's trigger for that agent), so planning is done directly.

## R1 — FR-007 decision: add Sport Match™ helper text, scoped as a plain `<p>` under each title

**Decision**: build it. `docs/microcopy.md` already documents a helper line per question (e.g. "Arranquemos por tu objetivo — el deporte viene después."), and it's one of the clearest places Match™'s new personality can show up — a second, more specific touch beyond the guide line already above the title. It was never rendered ("technical debt" against the doc, not a deliberate PMV cut noted anywhere).

**Scope discipline**: this is a plain `<p>` reusing the existing paragraph typography already styled in `index.css` (`--color-text-secondary`, existing spacing) — no new component, no new CSS class, no new design token. `QUESTIONS` in `SportMatch.tsx` gains an optional `helper?: string` field per question; when present, render it directly under the `<h2>`. This satisfies the spec's "deliberate decision, not silently skipped or silently over-built" requirement without turning a copy feature into a component-architecture feature.

## R2 — Full string mapping (old → new), source of truth is `docs/microcopy.md` as already rewritten this session

| Screen / state | File | Old | New |
|---|---|---|---|
| Welcome greeting | `Welcome.tsx` | "Hola, soy Match™." | "Hola, soy Match™, tu cómplice deportivo." |
| Welcome body | `Welcome.tsx` | "Te ayudo a encontrar una comunidad deportiva que encaje contigo. Tomará menos de un minuto." | "Te ayudo a encontrar una comunidad que encaje contigo. Toma menos de un minuto, lo prometo." |
| Guide line 1 (goal) | `SportMatch.tsx` `GUIDE_MICROCOPY` | "Empecemos por lo más importante: tu meta." | "Arranquemos por lo importante: ¿qué quieres lograr?" |
| Guide line 2 (sport) | same | "Ahora cuéntame qué deporte tienes en mente." | "Ahora sí, hablemos de deporte. ¿Cuál tienes en mente?" |
| Guide line 3 (district) | same | "Vamos a ubicarte." | "Ubiquémonos. ¿Por dónde te queda bien entrenar?" |
| Guide line 4 (days) | same | "Cuadremos esto con tu semana." | "El horario también cuenta. ¿Qué días te sirven?" |
| Guide line 5 (time) | same | "Casi listos." | "Ya casi. Solo falta el horario." |
| Guide line 6 (level) | same | "Quiero recomendarte algo a tu nivel." | "Acá no hay respuesta incorrecta — esto es para cuidarte, no para juzgarte." |
| Guide line 7 (budget) | same | "Sin sorpresas de presupuesto." | "Hablemos de presupuesto, sin sorpresas." |
| Guide line 8 (environment) | same | "Última pregunta, lo prometo." | "Última pregunta, lo prometo — y es una importante." |
| Question titles | `SportMatch.tsx` `QUESTIONS` | unchanged (factual questions, e.g. "¿Qué quieres lograr?") | **unchanged** — titles stay neutral/scannable; the jovial voice lives in the guide line above and the new helper line below, not in the question itself (keeps the tappable options the clear focal point) |
| Question helpers (new, R1) | `SportMatch.tsx` `QUESTIONS` | *(not rendered)* | Per `docs/microcopy.md`'s Sport Match™ questions section, one helper string per question |
| Matching transition | `SportMatch.tsx` | "Estoy buscando comunidades que realmente encajen contigo..." | "Estoy cruzando tu objetivo, horario y ubicación para armarte un buen combo..." |
| Results headline | `Results.tsx` | "Tu Match está listo." | unchanged — already matches `docs/microcopy.md` |
| Results subheadline | `Results.tsx` | "Estas son las comunidades de {sport} que más se parecen a lo que buscas." | "Estas comunidades de {sport} tienen pinta de encajar contigo." |
| "Change answers" action | `Results.tsx` | "Cambiar mis respuestas" | unchanged — already matches |
| No-sport-in-catalog heading | `Results.tsx` | "Todavía no tenemos comunidades de este deporte." | unchanged — FR-003 exception, stays literal |
| No-sport-in-catalog body | `Results.tsx` | "No es algo que puedas resolver cambiando tus otras respuestas — elige otro deporte y sigo buscando." | unchanged — same exception |
| Org-not-found heading | `OrganizationProfile.tsx` | "Esta comunidad ya no está disponible o está pendiente de verificación." | "Uy, esta comunidad no está disponible o todavía la estamos revisando." |
| Org-unavailable (contact-time) | `OrganizationProfile.tsx` | "Esta comunidad ya no está disponible para contactar." | "Uy, esta comunidad ya no está disponible para contactar." |
| Lead-save failure (inline) | `OrganizationProfile.tsx` | "No pudimos guardar tu contacto. Intenta de nuevo." | "No se guardó tu contacto. Dale, otra vez." |
| Login title | `Login.tsx` | "Continúa para contactar." | unchanged — already matches |
| Login body | `Login.tsx` | "Así podremos guardar tu Match y ayudarte a medir si encontraste una comunidad para entrenar." | "Así guardamos tu Match y no perdemos el hilo de lo que encontraste." |
| Contact success headline | `ContactSuccess.tsx` | "Listo, tu contacto quedó guardado." | "Listo, ya quedó guardado tu contacto." *(minor rhythm tweak only — kept close to original, this moment already reads warm)* |
| AuthCallback: confirming | `AuthCallback.tsx` | "Confirmando tu ingreso..." | unchanged — a sub-second transitional state; low value in rewriting, risk of feeling forced for something the user barely reads |
| AuthCallback: org_unavailable heading | `AuthCallback.tsx` | "Esta comunidad ya no está disponible." | "Uy, esta comunidad ya no está disponible." |
| AuthCallback: org_unavailable body | `AuthCallback.tsx` | "Ya iniciaste sesión — puedes volver a tus resultados y elegir otra comunidad." | "Ya iniciaste sesión — volvamos a tus resultados y elegimos otra." |
| AuthCallback: lead_failed heading | `AuthCallback.tsx` | "No pudimos guardar tu contacto." | "No se guardó tu contacto." |
| AuthCallback: lead_failed body | `AuthCallback.tsx` | "Ya iniciaste sesión correctamente — solo falló el último paso. Intenta de nuevo." | "Ya iniciaste sesión bien — solo falló el último paso. Dale, otra vez." |
| AuthCallback: fallback heading | `AuthCallback.tsx` | "Ya iniciaste sesión." | "Ya estás dentro." |

Buttons (`Volver a resultados`, `Reintentar`, `Ir al inicio`, `Ver comunidad`, `Comenzar Sport Match™`, `Contactar por WhatsApp`/`Instagram`/`Reservar clase`) are **action labels, not Match™'s spoken voice** — left unchanged, matching `docs/microcopy.md`'s existing "Result card CTA"/"By channel" sections, which were not part of this session's recalibration.

## R3 — Two genuinely new strings found (spec's Edge Cases note), added back to `docs/microcopy.md`

The org-not-found heading (`OrganizationProfile.tsx` line 48, stale/bad org id) and the inline lead-save-failure message were live in code but never documented in `docs/microcopy.md`. Per the spec's own Edge Cases handling: rewritten in the same jovial-but-blame-free register as their documented neighbors, and both added to `docs/microcopy.md`'s Empty states / Error states sections as part of this feature's doc-sync — not left as an undocumented gap now that they've been touched.

## R4 — No i18n / copy-management abstraction introduced

Confirmed against the spec's Assumption: no reason specific to this change justifies one. Strings stay inline JSX, consistent with every prior feature.

## R5 — Constitution / trust-safety cross-check

No trigger for `trust-safety-review` (no auth, location, contact-visibility, or moderation surface touched — plan.md's Constitution Check). The one relevant guardrail is internal to this feature's own spec (FR-002/FR-003/FR-005 — never mock, never blame, error/empty-catalog/reasons text stays literal) and is verified directly against `docs/match-character.md`'s "line that matters most" (playful about the situation, never at the user's expense) during implementation, not via a separate review pass.
