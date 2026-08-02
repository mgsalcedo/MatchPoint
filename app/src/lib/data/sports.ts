import { supabase } from "./supabaseClient";

/**
 * Resolves a sport's DB id from its slug. Reads under the existing `public_read_sports`
 * policy (no RLS change needed — already anon-readable, see 001-data-foundation).
 */
export async function getSportId(slug: string): Promise<string> {
  const { data, error } = await supabase
    .from("sports")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error(`No active sport found for slug "${slug}"`);
  }
  return data.id;
}
