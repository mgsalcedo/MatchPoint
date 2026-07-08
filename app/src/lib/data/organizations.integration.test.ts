/**
 * Integration test — requires a live, seeded Supabase database (app/.env.local configured,
 * migrations applied, seed run). Excluded from the default `npm test` run (see vite.config.ts)
 * because CI/local unit runs shouldn't require a live DB. Run explicitly:
 *
 *   npx vitest run src/lib/data/organizations.integration.test.ts
 *
 * Proves FR-002/003/004/008 and SC-001/002/005 against the real seeded catalog
 * (specs/001-data-foundation/contracts/organizations-read.md).
 */

import { describe, it, expect } from "vitest";
import { getOrganizations } from "./organizations";
import { supabase } from "./supabaseClient";

const PMV_SPORT_SLUGS = [
  "running",
  "trail-running",
  "ciclismo",
  "natacion",
  "triatlon",
  "centro-entrenamiento",
];

describe("getOrganizations (integration, live DB)", () => {
  it("returns every one of the 6 PMV sports with at least one organization (SC-001)", async () => {
    for (const slug of PMV_SPORT_SLUGS) {
      const orgs = await getOrganizations({ sportSlug: slug });
      expect(orgs.length, `expected >=1 org for sport "${slug}"`).toBeGreaterThan(0);
    }
  });

  it("returns at least one organization with a Callao venue (SC-001)", async () => {
    const callaoDistricts = ["Callao", "Bellavista", "La Perla", "La Punta", "Ventanilla"];
    const all = await getOrganizations();
    const inCallao = all.filter((o) => o.districts.some((d) => callaoDistricts.includes(d)));
    expect(inCallao.length).toBeGreaterThan(0);
  });

  it("excludes suspended, archived, and rejected organizations (FR-004, SC-005)", async () => {
    const all = await getOrganizations();
    for (const org of all) {
      expect(["preloaded", "claimed", "verified"]).toContain(org.profileStatus);
    }
  });

  it("returns a shape-parity Organization (no data-shape drift from mock)", async () => {
    const all = await getOrganizations();
    // Seed has 10 orgs, but Altaïr CrossFit is intentionally seeded with zero contact
    // channels (no real WhatsApp/Instagram was found — research.md R8, BR-016), so it
    // fails meetsMinimumDataset() by design and is excluded here: 9 discoverable orgs.
    expect(all.length).toBeGreaterThanOrEqual(9);
    for (const org of all) {
      expect(org).toHaveProperty("id");
      expect(org).toHaveProperty("sports");
      expect(org).toHaveProperty("adnDeportivo");
      expect(Array.isArray(org.sports)).toBe(true);
    }
  });

  it("district filter narrows to orgs with a venue in that district", async () => {
    const all = await getOrganizations();
    const sample = all.find((o) => o.districts.length > 0);
    if (!sample) throw new Error("seed has no organizations with a district — cannot test filter");
    const filtered = await getOrganizations({ districtName: sample.districts[0] });
    expect(filtered.every((o) => o.districts.includes(sample.districts[0]))).toBe(true);
  });
});

describe("RLS as the anon role (FR-004, FR-008, SC-005)", () => {
  it("cannot read the leads table", async () => {
    const { data, error } = await supabase.from("leads").select("id");
    // Deny-all RLS with no matching policy for anon typically returns an empty array, not an
    // error (Postgres RLS silently filters rows the policy doesn't grant).
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot read the users table", async () => {
    const { data, error } = await supabase.from("users").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot see a suspended organization even by direct id lookup", async () => {
    const { data: suspended } = await supabase
      .from("organizations")
      .select("id")
      .eq("profile_status", "suspended")
      .limit(1);
    // If the seed has no suspended org, this test is inconclusive but not failing — flag via skip.
    if (!suspended || suspended.length === 0) {
      console.warn("No suspended organization in seed — cannot verify RLS exclusion directly.");
      return;
    }
    const { data: visible } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", suspended[0].id);
    expect(visible).toEqual([]);
  });
});
