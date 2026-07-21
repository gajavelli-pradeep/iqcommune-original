import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Service-role client — bypasses RLS entirely. Server-only, always.
 *
 * Every route that uses this owes its own authorization check: RLS is not the
 * boundary here, the route is. Importing this into a client component would
 * ship the service-role key to the browser, so it is deliberately the only
 * module that reads that key.
 */
let cached: SupabaseClient | undefined;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
