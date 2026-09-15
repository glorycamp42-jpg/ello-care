import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side caller identification + elder access authorization for API routes.
 *
 * Every API route that touches per-user data with the service-role key must:
 *   1. identify the caller (Supabase session cookie or Bearer token)
 *   2. verify the caller may act on the requested elderId
 *      (caller IS the elder, caller is an accepted family member, or caller is admin)
 */

export const ADMIN_EMAILS = ["glorycamp42@gmail.com"];

export interface Caller {
  id: string;
  email: string | null;
  isAdmin: boolean;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  // 1) Bearer token (admin page stores session in localStorage)
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const admin = adminClient();
    if (admin && token) {
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data.user) return toCaller(data.user.id, data.user.email ?? null);
    }
  }

  // 2) Session cookie (default for elder + family apps)
  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          /* read-only in API routes */
        },
      },
    });
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return toCaller(data.user.id, data.user.email ?? null);
  } catch (e) {
    console.error("[api-auth] cookie getUser failed:", e);
  }
  return null;
}

function toCaller(id: string, email: string | null): Caller {
  return { id, email, isAdmin: !!email && ADMIN_EMAILS.includes(email.toLowerCase()) };
}

/** True if caller may read/write data belonging to elderId. */
export async function canAccessElder(caller: Caller, elderId: string): Promise<boolean> {
  if (!elderId) return false;
  if (caller.isAdmin) return true;
  if (caller.id === elderId) return true;

  const admin = adminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("family_links")
    .select("id")
    .eq("family_id", caller.id)
    .eq("elder_id", elderId)
    .in("status", ["accepted", "active"])
    .limit(1);
  return !!(data && data.length > 0);
}

/**
 * One-call guard for routes. Returns { caller, elderId } or a ready-to-return 401/403 response.
 * If requestedElderId is empty/"default", falls back to the caller's own id.
 */
export async function requireElderAccess(
  req: NextRequest,
  requestedElderId?: string | null
): Promise<{ ok: true; caller: Caller; elderId: string } | { ok: false; response: NextResponse }> {
  const caller = await getCaller(req);
  if (!caller) {
    return { ok: false, response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const elderId = requestedElderId && requestedElderId !== "default" ? requestedElderId : caller.id;
  const allowed = await canAccessElder(caller, elderId);
  if (!allowed) {
    return { ok: false, response: NextResponse.json({ error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { ok: true, caller, elderId };
}
