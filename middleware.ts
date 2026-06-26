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

  // Guard both sides: if ADMIN_EMAIL is unset, process.env.ADMIN_EMAIL is undefined,
  // and null?.email is also undefined — undefined === undefined would be true without !!user.
  const isAdmin =
    !!user &&
    (user.app_metadata?.role === "admin" ||
      (!!process.env.ADMIN_EMAIL &&
        user.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()));

  const isConsole = request.nextUrl.pathname.startsWith("/console");
  const isLogin = request.nextUrl.pathname === "/login";

  if (isConsole && !isAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isLogin && isAdmin) {
    return NextResponse.redirect(new URL("/console", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/console/:path*", "/login"],
};
