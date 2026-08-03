const KEY = "matchpoint:visitId";

/**
 * Per-browser-tab visit correlation id for analytics events (research.md R2/R3,
 * 005-analytics-funnel). sessionStorage, not localStorage: survives a same-tab reload and the
 * full-page OAuth redirect round-trip (same guarantee pendingContact.ts already relies on), but
 * clears on tab close — a new tab is a new visit, matching the spec's "per visit, not per
 * unique visitor" framing. Not derived from matchSessionId (doesn't exist until the
 * questionnaire's last question is answered) and not a retrofit of match_sessions.anonymous_id
 * (confirmed dead code — never written, never read).
 */
export function getOrCreateVisitId(): string {
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}
