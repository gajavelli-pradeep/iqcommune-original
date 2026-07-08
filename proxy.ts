import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isGlobalAdminRole } from "@/lib/supabase/roles";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Redirect legacy renamed paths so old bookmarks/links keep working.
  const rawPath = request.nextUrl.pathname;
  if (rawPath === "/super-login") return NextResponse.redirect(new URL("/global-login", request.url));
  // Login lives at the top level, not under /console — send stray attempts there.
  if (rawPath === "/console/global-login" || rawPath === "/console/super-login") {
    return NextResponse.redirect(new URL("/global-login", request.url));
  }
  if (rawPath === "/console/super" || rawPath.startsWith("/console/super/")) {
    return NextResponse.redirect(new URL(rawPath.replace("/console/super", "/console/global"), request.url));
  }

  // Refresh Supabase session cookies on every request (required by @supabase/ssr)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role;
  const isGlobalAdmin = !!user && isGlobalAdminRole(role);
  const isAdmin =
    !!user &&
    (role === "admin" ||
      isGlobalAdminRole(role) ||
      (!!process.env.ADMIN_EMAIL &&
        user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()));

  const { pathname } = request.nextUrl;
  const isConsolePath = pathname.startsWith("/console");
  const isLoginPath = pathname === "/login";
  const isGlobalLoginPath = pathname === "/global-login";

  // Protect /console — unauthenticated users → /login
  if (isConsolePath && !isAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect already-logged-in users away from login pages
  if (isLoginPath && isAdmin) {
    return NextResponse.redirect(
      new URL(isGlobalAdmin ? "/console/global" : "/console", request.url)
    );
  }
  // Only auto-redirect away from global-login if already authenticated as global_admin
  if (isGlobalLoginPath && isGlobalAdmin) {
    return NextResponse.redirect(new URL("/console/global", request.url));
  }

  return response;
}

export const config = {
  // "/super-login" is kept so the legacy-path redirect (→ /global-login) fires.
  matcher: ["/console/:path*", "/login", "/global-login", "/super-login"],
};
