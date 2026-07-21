import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Anon client bound to the request's cookies.
 *
 * Used for identity only — "who is signed in" — never for reading business
 * data. Data reads go through the service-role client behind a route that has
 * already checked the role.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        // A Server Component cannot set cookies; session refresh happens in the
        // route handlers and middleware that can. Swallowing here is correct,
        // not a shortcut.
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          /* read-only context */
        }
      },
    },
  });
}
