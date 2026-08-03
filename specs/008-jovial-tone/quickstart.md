# Quickstart: Match™ Jovial Tone Recalibration — validation

No migration, no owner action, no new dependency. `npm install && npm run dev` in `app/` (unchanged).

## Validate (proves the feature works)

| Check | Action | Expected | Proves |
|---|---|---|---|
| Consistent voice, full funnel | Walk Welcome → Sport Match™ (all 8 questions) → matching transition → Results → a Community profile → Login → Contact success | Every string matches `docs/microcopy.md`'s recalibrated text exactly; no screen still shows pre-recalibration copy | US1, SC-001, SC-003 |
| Question helper text | View each of the 8 Sport Match™ questions | A short helper line renders under each title, matching `docs/microcopy.md`'s "Sport Match™ questions" section | FR-007, research.md R1 |
| Option labels unchanged | Same walkthrough | Sport/goal/level/budget/environment/day/time option button labels are byte-for-byte unchanged from before this feature | FR-004 |
| True-empty-catalog stays literal | Complete Sport Match™ for a sport with zero catalog organizations (`006-no-empty-results` case) | Heading/body text is unchanged from before this feature — no joke, no rewrite | FR-003, US2 |
| Match reasons stay literal | View any result card's reasons list | Reason text is unchanged from before this feature | FR-003 |
| Error states stay light, not mocking | Trigger a login error, a lead-save failure (`OrganizationProfile.tsx` inline and `AuthCallback.tsx` post-login), and the org-unavailable/org-not-found cases | Each message is warmer than before but never implies the error is the user's fault and never jokes about the failure itself | US2, FR-002, SC-002 |
| No behavior regression | Complete a full funnel run including a real contact/Lead creation | Every outcome (Lead created, external redirect, session persistence) behaves exactly as before — only copy changed | SC-004 |

## Out of scope (do not do this feature)

- Any visual/design change (`007-visual-identity-system` already shipped this).
- Any change to Match™'s behavioral rules (never pressures, never shames, never invents data, never gives medical advice, never claims a perfect result).
- Any change to matching/business logic.
- Rewriting selectable option labels, match-reason text, or the true-empty-catalog message into jokes.
- Re-adding Apple Sign-In copy (still deferred, `004-auth-lead-creation` research.md R1).
