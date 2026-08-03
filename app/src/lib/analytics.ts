/**
 * Minimal, pluggable event tracker (BR-027). Payloads carry only fields already visible in
 * the UI (sport, district, counts) — no raw answers dump, no contact/location precision, per
 * docs/security-standards.md's allow-list posture for logs/analytics.
 *
 * This is the extension point for the rest of BR-027's event list (open, start match, open
 * profile, click contact, login complete, lead created, external contact opened) — future
 * features add new AnalyticsEvent members and reuse track()/setTracker(), not a new mechanism.
 */

import type { ContactType, Sport } from "../types";

export type AnalyticsEvent =
  | { name: "app_opened" }
  | { name: "match_started" }
  | { name: "sport_match_completed"; matchSessionId: string; sport: Sport; district: string }
  | { name: "results_viewed"; matchSessionId: string; resultCount: number }
  | { name: "no_match_viewed"; matchSessionId: string }
  | { name: "profile_opened"; organizationId: string; resultRank: number | null }
  | { name: "contact_clicked"; organizationId: string; contactType: ContactType; resultRank: number | null }
  | { name: "login_started"; provider: "google" | "apple" }
  | { name: "login_completed"; provider: "google" | "apple" }
  | { name: "lead_created"; leadId: string; organizationId: string; contactType: ContactType }
  | { name: "external_contact_opened"; leadId: string; contactType: ContactType };

type Tracker = (event: AnalyticsEvent) => void;

let tracker: Tracker = (event) => {
  if (import.meta.env.DEV) console.info("[analytics]", event.name, event);
};

/** Swap the sink when a real provider (PostHog/GA4/etc.) is wired up — no call site changes. */
export function setTracker(fn: Tracker): void {
  tracker = fn;
}

export function track(event: AnalyticsEvent): void {
  tracker(event);
}
