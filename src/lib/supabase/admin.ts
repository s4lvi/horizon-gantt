import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the service role key.
 * Bypasses RLS — use only in server actions after verifying auth via getUser().
 *
 * Workaround for: https://github.com/supabase/supabase/issues/43066
 * New Supabase projects (2026) sign JWTs with ES256, but PostgREST
 * only verifies HS256, causing auth.uid() to return NULL in RLS policies.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
