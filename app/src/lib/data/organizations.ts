/**
 * Public, anonymous data-access for organization discovery (FR-003/004/005/011).
 * The contract is documented in specs/001-data-foundation/contracts/organizations-read.md.
 *
 * This is the data layer UNDER where a future API/server action would sit. Nothing calls it
 * over HTTP yet; the app's UI keeps reading mock data this milestone (Milestone 3 rewires it).
 * No matching/adjacency/scoring logic lives here — that stays centralized in lib/matching.
 */

import { supabase } from "./supabaseClient";
import { mapOrganizationRow, mapSportSlug } from "./mappers";
import type { DbOrganizationRow } from "./types";
import type { Organization } from "../../types";

export interface GetOrganizationsParams {
  sportSlug?: string; // matches sports.slug, e.g. "running"
  districtName?: string; // matches districts.name, e.g. "Miraflores"
}

// The joined column selection the mapper expects (see mappers.ts / types.ts).
const SELECT = `
  id, name, slug, organization_type, description, short_description,
  instagram_url, whatsapp_number, booking_url, website_url, profile_status,
  logo_url, cover_image_url,
  organization_sports:organization_sports(sport:sports(id, name, slug)),
  venues:venues(id, name, district:districts(id, name)),
  schedules:schedules(id, day_of_week, start_time, end_time, session_name, level_min, level_max, venue_id, sport_id),
  organization_adn:organization_adn(*)
`;

/**
 * FR-005 minimum-launch-dataset eligibility. The spec's exact wording is "schedule OR
 * availability note" — schedule is a soft signal, not a hard blocker (mirrors BR-013: missing
 * data reduces confidence, doesn't always exclude). Hard-required, never fabricated: name,
 * >=1 sport, >=1 venue/district, and >=1 real contact channel (whatsapp/instagram/booking/
 * website). "Level" and "environment" are satisfied via organization_adn (curated per
 * docs/data-model.md's "In PMV, ADN can be manually curated"), not per-schedule fields — so an
 * org with zero confirmed schedule rows can still be eligible; the UI shows "Horario por
 * confirmar" for it (docs/ux-flows.md), it is not excluded from discovery entirely.
 */
function meetsMinimumDataset(org: Organization): boolean {
  const hasContact = Boolean(org.whatsapp || org.instagram || org.bookingLink || org.website);
  return (
    Boolean(org.name) &&
    org.sports.length > 0 &&
    org.districts.length > 0 &&
    hasContact
  );
}

export interface OrgContactSnapshot {
  id: string;
  name: string;
  whatsapp?: string;
  instagram?: string;
  bookingLink?: string;
  website?: string;
}

/**
 * FR-013 (004-auth-lead-creation): single-row re-check that an organization is still publicly
 * contactable, immediately before a Lead insert — not a full getOrganizations() re-fetch, which
 * would re-run the whole catalog query + eligibility filter for one row. Also doubles as the
 * data needed to rebuild the external contact URL after the OAuth full-page reload (research.md
 * R11), since state.results is empty at that point.
 */
export async function getOrganizationContactSnapshot(id: string): Promise<OrgContactSnapshot | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, whatsapp_number, instagram_url, booking_url, website_url, is_active, profile_status")
    .eq("id", id)
    .eq("is_active", true)
    .not("profile_status", "in", "(suspended,archived,rejected)")
    .maybeSingle();

  // RLS already hides a suspended/archived/rejected row even without these explicit filters —
  // kept for self-documentation, matching getOrganizations()'s existing style (research.md R12).
  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    whatsapp: data.whatsapp_number ?? undefined,
    instagram: data.instagram_url ?? undefined,
    bookingLink: data.booking_url ?? undefined,
    website: data.website_url ?? undefined,
  };
}

export async function getOrganizations(
  params: GetOrganizationsParams = {}
): Promise<Organization[]> {
  // RLS already restricts rows to active + not suspended/archived/rejected; the explicit
  // filters below make the query self-documenting and hold even in a test DB without RLS.
  const { data, error } = await supabase
    .from("organizations")
    .select(SELECT)
    .eq("is_active", true)
    .not("profile_status", "in", "(suspended,archived,rejected)");

  if (error) {
    throw new Error(`Failed to load organizations: ${error.message}`);
  }

  let orgs = (data as unknown as DbOrganizationRow[]).map(mapOrganizationRow);

  // FR-005 eligibility.
  orgs = orgs.filter(meetsMinimumDataset);

  // Sport filter: org offers the requested sport (post-fetch narrowing at seed scale, research.md R6).
  // The app `Sport` values differ from DB slugs (e.g. "trail" vs "trail-running"), so translate
  // the target slug once via the same mapper table, rather than per (org, sport) pair.
  if (params.sportSlug) {
    const targetSport = mapSportSlug(params.sportSlug);
    orgs = orgs.filter((o) => o.sports.some((s) => s === targetSport));
  }

  // District filter: org has a venue in the requested district (exact match, no adjacency).
  if (params.districtName) {
    const target = params.districtName;
    orgs = orgs.filter((o) => o.districts.includes(target));
  }

  return orgs;
}
