import { createClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for MatchPoint, using the publishable anon key.
 * The anon key is safe in the browser bundle — it identifies the project, not a
 * privileged session; Row Level Security protects the data. The service_role key
 * must NEVER be used here or committed (see docs/database-schema.md / the runbook).
 *
 * Fails fast at module load if env vars are missing, so a misconfigured environment
 * is obvious rather than surfacing as a null client deep inside a query.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Copy app/.env.example to app/.env.local and set " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Supabase dashboard → Settings → API)."
  );
}

export const supabase = createClient(url, anonKey);
