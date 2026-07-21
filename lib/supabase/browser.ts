import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/** Anon client for the browser. Reads only what RLS allows. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
