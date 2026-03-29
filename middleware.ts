import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public routes that don't require auth
const PUBLIC_ROUTES = [
  "/login",
  "/login/signup",
  "/family/login",
  "/family/login/signup",
  "/api/",
  "/_next/",
  "/favicon.ico",
  "/manifest.json",
  "/icon",
  "/characters/",
  "/animations/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Check Supabase auth via cookie
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase not configured, allow all (dev mode)
  if (!url || !key) {
    return NextResponse.next();
  }

  // Get auth token from cookies
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });

  // Try to get session from auth cookie
  const authCookie = request.cookies.get("sb-" + new URL(url).hostname.split(".")[0] + "-auth-token");

  if (!authCookie?.value) {
    // No auth cookie — redirect to appropriate login
    if (pathname.startsWith("/family")) {
      return NextResponse.redirect(new URL("/family/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Parse the token to check role
  try {
    const tokenData = JSON.parse(authCookie.value);
    const accessToken = Array.isArray(tokenData) ? tokenData[0] : tokenData.access_token;

    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);

      if (!user) {
        if (pathname.startsWith("/family")) {
          return NextResponse.redirect(new URL("/family/login", request.url));
        }
        return NextResponse.redirect(new URL("/login", request.url));
      }

      const role = user.user_metadata?.role;

      // Role-based routing
      if (pathname.startsWith("/family") && role === "elder") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      if (!pathname.startsWith("/family") && pathname !== "/" && role === "family") {
        return NextResponse.redirect(new URL("/family", request.url));
      }
    }
  } catch {
    // If token parsing fails, allow through (client-side will handle)
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|characters|animations|.*\\.png$|.*\\.svg$|.*\\.json$).*)",
  ],
};
