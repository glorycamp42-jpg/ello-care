import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const origin = req.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Exchange code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback] Error:", error?.message);
    return NextResponse.redirect(`${origin}/login`);
  }

  // Check role for redirect
  const userId = data.session.user.id;
  const userRole = data.session.user.user_metadata?.role;

  // Also check users table
  let role = userRole;
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

  // Set session cookie via response
  const response = NextResponse.redirect(
    role === "family" ? `${origin}/family` : `${origin}/`
  );

  return response;
}
