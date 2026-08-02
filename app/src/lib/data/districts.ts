import { supabase } from "./supabaseClient";

/**
 * Resolves a district's DB id from its exact name. Reads under the existing
 * `public_read_districts` policy (no RLS change needed). The questionnaire's district
 * picker (app/src/data/organizations.ts's DISTRICTS constant) must supply names that
 * match seeded `districts.name` values 1:1 — this throws loudly rather than silently
 * fabricating a district if that assumption ever drifts.
 */
export async function getDistrictId(name: string): Promise<string> {
  const { data, error } = await supabase
    .from("districts")
    .select("id")
    .eq("name", name)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error(`No active district found for name "${name}"`);
  }
  return data.id;
}
