import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const origin = req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Create SSR client that can set cookies on the response
  const response = NextResponse.redirect(`${origin}/`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Exchange code for session — this sets the auth cookies
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] Error:", error?.message);
    return NextResponse.redirect(`${origin}/login`);
  }

  // Check role for redirect
  const userId = data.session.user.id;
  let role = data.session.user.user_metadata?.role;

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: userData } = await admin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();
    if (userData?.role) role = userData.role;
  } catch {}

  console.log(`[auth/callback] User: ${data.session.user.email}, role: ${role}`);

  // Redirect based on role (cookies already set on response)
  const redirectUrl = role === "family" ? `${origin}/family` : `${origin}/`;
  response.headers.set("Location", redirectUrl);

  return response;
}
