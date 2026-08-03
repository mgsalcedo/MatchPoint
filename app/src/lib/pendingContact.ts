/**
 * Persists the contact a user is trying to complete across the real Google OAuth full-page
 * redirect (research.md R9, 004-auth-lead-creation). sessionStorage — not localStorage —
 * because it survives the same-tab OAuth round-trip and a same-tab reload, but clears on tab
 * close, matching the spec's own "within the same visit" assumption. Pure (no Supabase import),
 * unit-testable with a mocked Storage.
 */

import type { ContactType, Goal, LeadSource, Sport } from "../types";

const KEY = "matchpoint:pendingContact";

export interface PendingContact {
  organizationId: string;
  contactType: ContactType;
  resultRank: number | null;
  source: LeadSource;
  matchSessionId: string | null;
  matchSessionPersisted: boolean;
  matchResultId: string | null;
  sport: Sport | null;
  goal: Goal | null;
  district: string | null;
}

export function savePendingContact(pc: PendingContact): void {
  sessionStorage.setItem(KEY, JSON.stringify(pc));
}

export function readPendingContact(): PendingContact | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingContact;
  } catch {
    sessionStorage.removeItem(KEY); // corrupt value — don't loop on it forever
    return null;
  }
}

export function clearPendingContact(): void {
  sessionStorage.removeItem(KEY);
}
