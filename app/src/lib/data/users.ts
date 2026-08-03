import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

/**
 * Idempotent upsert — safe to call on every SIGNED_IN/session-restore event, not just "first
 * ever" login. `id` MUST be authUser.id (== auth.uid()) — already-shipped `leads` RLS
 * (authenticated_insert_leads, migration 0007) depends on public.users.id equaling the
 * Supabase Auth user's own id (research.md R2).
 */
export async function ensureUserRow(authUser: User): Promise<void> {
  const identity = authUser.identities?.[0];
  const provider = authUser.app_metadata?.provider ?? identity?.provider ?? "google";
  const providerId = identity?.id ?? authUser.id;

  // Best-effort field names from user_metadata — Google's payload shape; verify against a real
  // session.user object (browser devtools) once Google OAuth credentials are configured
  // (research.md R5). The fallback chain is defensive, not a guarantee of correctness.
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;
  const avatarUrl =
    (authUser.user_metadata?.avatar_url as string | undefined) ??
    (authUser.user_metadata?.picture as string | undefined) ??
    null;

  const { error } = await supabase.from("users").upsert(
    {
      id: authUser.id,
      auth_provider: provider,
      auth_provider_id: providerId,
      name,
      email: authUser.email ?? null,
      avatar_url: avatarUrl,
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`Failed to provision user row: ${error.message}`);
}
