/**
 * Pure app-model → DB-row mapping for writing `leads`, plus the FR-013 contactability decision
 * and external-URL building. NO Supabase import here — mirrors sessionMappers.ts's discipline
 * (unit-testable against fixtures, constitution Principle III).
 */

import type { ContactType, Goal, LeadSource } from "../../types";
import { GOAL_MAP } from "./sessionMappers"; // shared vocabulary — not a second copy (research.md §6.1)
import type { DbContactType, DbLeadSource } from "./types";
import type { OrgContactSnapshot } from "./organizations";

export interface LeadInsertRow {
  id: string;
  user_id: string;
  organization_id: string;
  match_session_id: string | null;
  match_result_id: string | null;
  contact_type: DbContactType;
  source: DbLeadSource;
  sport_id: string | null;
  goal: string | null;
  district_id: string | null;
  result_rank: number | null;
}

export interface BuildLeadInput {
  id: string;
  userId: string;
  organizationId: string;
  matchSessionId: string | null; // null if not persisted — never reference a non-existent row
  matchResultId: string | null;
  contactType: ContactType; // already DB-aligned (research.md R6), no translation
  source: LeadSource; // already DB-aligned (research.md R7), no translation
  sportId: string | null;
  goal: Goal | null;
  districtId: string | null;
  resultRank: number | null;
}

export function buildLeadInsertRow(input: BuildLeadInput): LeadInsertRow {
  return {
    id: input.id,
    user_id: input.userId,
    organization_id: input.organizationId,
    match_session_id: input.matchSessionId,
    match_result_id: input.matchResultId,
    contact_type: input.contactType,
    source: input.source,
    sport_id: input.sportId,
    // leads.goal is free text (no DB enum) — store the same translated English token already
    // used for match_sessions.goal, so the two tables share one vocabulary (research.md §6.1).
    goal: input.goal ? GOAL_MAP[input.goal] : null,
    district_id: input.districtId,
    result_rank: input.resultRank,
  };
}

export type ContactResolution = { available: true; value?: string } | { available: false };

/**
 * FR-013: given a fresh organization snapshot, does the requested contact channel still exist?
 * "call"/"form" have no DB-backed value to check (kept in the enum for BR-003 completeness,
 * not wired to any UI yet) — always structurally available.
 */
export function resolveContactValue(snapshot: OrgContactSnapshot, contactType: ContactType): ContactResolution {
  switch (contactType) {
    case "whatsapp":
      return snapshot.whatsapp ? { available: true, value: snapshot.whatsapp } : { available: false };
    case "instagram":
      return snapshot.instagram ? { available: true, value: snapshot.instagram } : { available: false };
    case "booking":
      return snapshot.bookingLink ? { available: true, value: snapshot.bookingLink } : { available: false };
    case "call":
    case "form":
      return { available: true };
  }
}

export interface ExternalLink {
  url: string;
  label: string;
}

/**
 * Builds the actual destination URL from a resolved contact value. Centralized here (was
 * previously duplicated/slightly buggy inline in ContactSuccess.tsx — instagram_url is stored
 * as a full URL in real seed data, e.g. "https://instagram.com/perurunners", but the old mock
 * data used a bare handle; the old code only handled the bare-handle case).
 */
export function buildExternalUrl(contactType: ContactType, snapshot: OrgContactSnapshot): ExternalLink | null {
  const resolution = resolveContactValue(snapshot, contactType);
  if (!resolution.available || !resolution.value) return null;

  switch (contactType) {
    case "whatsapp":
      return { url: `https://wa.me/${resolution.value}`, label: "Abrir WhatsApp" };
    case "instagram": {
      const url = resolution.value.startsWith("http")
        ? resolution.value
        : `https://instagram.com/${resolution.value}`;
      return { url, label: "Abrir Instagram" };
    }
    case "booking":
      return { url: resolution.value, label: "Reservar clase" };
    case "call":
    case "form":
      return null; // no external URL for these yet — not wired to any UI
  }
}
