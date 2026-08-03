import { supabase } from "./supabaseClient";
import { buildLeadInsertRow, type BuildLeadInput } from "./leadMappers";

/**
 * Unlike createMatchSession (which never throws — a lost anonymous session degrades gracefully
 * to "still show results"), createLead MUST surface failure distinguishably: BR-003/FR-007/
 * FR-010 require the external redirect to never fire without a confirmed-saved Lead, and a
 * visible retry path when it fails. Callers MUST catch and MUST NOT open the external
 * destination on error.
 */
export async function createLead(input: BuildLeadInput): Promise<string> {
  const row = buildLeadInsertRow(input);
  const { error } = await supabase.from("leads").insert(row);
  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return row.id;
}
