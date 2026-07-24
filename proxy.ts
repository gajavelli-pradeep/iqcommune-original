import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh for the console (audit C5). `@supabase/ssr` rotates an expiring
 * refresh token only in a context that can write cookies — a Server Component
 * cannot, so without this the console signs a user out the moment their access
 * token expires. This runs on the console and login routes, refreshes the
 * session, and writes the rotated cookies back onto the response.
 *
 * Reads `process.env` directly rather than `lib/env` — that module is
 * `server-only` and this runs in the middleware/edge context. It never touches
 * the service-role key; identity only, exactly like `lib/supabase/server`.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // The call that performs the refresh. Do not gate the console on its result —
  // the page's own `requireRole` is the authorization boundary; this only keeps
  // a valid session from lapsing. A Supabase outage can make this throw (a
  // fetch-level failure, not just a resolved `{ error }`) — swallowed here
  // rather than left to crash the edge middleware for every console request;
  // `requireRole` on the page itself still surfaces the outage properly.
  try {
    await supabase.auth.getUser();
  } catch {
    /* best-effort refresh only — see above */
  }

  return response;
}

export const config = {
  matcher: ["/console/:path*", "/globaladmin/:path*", "/user/:path*", "/login"],
};
