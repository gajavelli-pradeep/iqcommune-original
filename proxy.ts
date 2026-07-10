import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isGlobalAdminRole, isUserRole } from "@/lib/supabase/roles";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Redirect legacy renamed paths so old bookmarks/links keep working.
  const rawPath = request.nextUrl.pathname;
  if (rawPath === "/super-login") return NextResponse.redirect(new URL("/global-login", request.url));
  // Login lives at the top level, not under /console — send stray attempts there.
  if (rawPath === "/console/global-login" || rawPath === "/console/super-login") {
    return NextResponse.redirect(new URL("/global-login", request.url));
  }
  // The global console moved from /console/global (and legacy /console/super) to /globaladmin.
  if (rawPath === "/console/global" || rawPath.startsWith("/console/global/")) {
    return NextResponse.redirect(new URL(rawPath.replace("/console/global", "/globaladmin"), request.url));
  }
  if (rawPath === "/console/super" || rawPath.startsWith("/console/super/")) {
    return NextResponse.redirect(new URL(rawPath.replace("/console/super", "/globaladmin"), request.url));
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
  const isUser = !!user && isUserRole(role);
  const isAdmin =
    !!user &&
    (role === "admin" ||
      isGlobalAdminRole(role) ||
      (!!process.env.ADMIN_EMAIL &&
        user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()));
  // Anyone allowed into a console shell (admin, global admin, or read-only user).
  const canConsole = isAdmin || isUser;

  // The console home for each tier — used by the login-redirect logic below.
  // Finer cross-tier gating (e.g. a user hitting /console) is enforced per page.
  const consoleHome = isGlobalAdmin ? "/globaladmin" : isUser ? "/user" : "/console";

  const { pathname } = request.nextUrl;
  const isConsoleArea =
    pathname.startsWith("/console") ||
    pathname.startsWith("/globaladmin") ||
    pathname.startsWith("/user");
  const isLoginPath = pathname === "/login";
  const isGlobalLoginPath = pathname === "/global-login";

  // Protect every console area — anyone without console access → /login
  if (isConsoleArea && !canConsole) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect already-logged-in users away from the login page to their console home
  if (isLoginPath && canConsole) {
    return NextResponse.redirect(new URL(consoleHome, request.url));
  }
  // Only auto-redirect away from global-login if already authenticated as global_admin
  if (isGlobalLoginPath && isGlobalAdmin) {
    return NextResponse.redirect(new URL("/globaladmin", request.url));
  }

  return response;
}

export const config = {
  // "/super-login" is kept so the legacy-path redirect (→ /global-login) fires.
  matcher: [
    "/console/:path*",
    "/globaladmin/:path*",
    "/user/:path*",
    "/login",
    "/global-login",
    "/super-login",
  ],
};
