import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareSupabase } from "@/lib/supabase/middleware";

const PUBLIC = ["/login", "/family/login", "/auth/callback", "/api/", "/_next/", "/favicon.ico", "/manifest", "/icon", "/icons/", "/characters/", "/animations/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareSupabase(request);

  // This refreshes the session cookie if needed
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/family")) {
      return NextResponse.redirect(new URL("/family/login", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.json$).*)"],
};
