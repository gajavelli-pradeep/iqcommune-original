import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
  const isSuperAdmin = !!user && role === "super_admin";
  const isAdmin =
    !!user &&
    (role === "admin" ||
      role === "super_admin" ||
      (!!process.env.ADMIN_EMAIL &&
        user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()));

  const { pathname } = request.nextUrl;
  const isConsolePath = pathname.startsWith("/console");
  const isLoginPath = pathname === "/login";
  const isSuperLoginPath = pathname === "/super-login";

  // Protect /console — unauthenticated users → /login
  if (isConsolePath && !isAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect already-logged-in users away from login pages
  if (isLoginPath && isAdmin) {
    return NextResponse.redirect(
      new URL(isSuperAdmin ? "/console/super" : "/console", request.url)
    );
  }
  // Only auto-redirect away from super-login if already authenticated as super_admin
  if (isSuperLoginPath && isSuperAdmin) {
    return NextResponse.redirect(new URL("/console/super", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/console/:path*", "/login", "/super-login"],
};
