import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireElderAccess } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET — fetch today's conversations for a user
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ messages: [] });

  const auth = await requireElderAccess(req, req.nextUrl.searchParams.get("userId"));
  if (!auth.ok) return auth.response;
  const userId = auth.elderId;

  // Last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Fetch the MOST RECENT 100 messages (desc), then reverse to ascending for context order.
  // Previous bug: ascending+limit(50) returned the OLDEST 50 of last 24h, hiding newest messages
  // when a user chats from multiple devices or has an active day.
  const { data, error } = await admin
    .from("conversations")
    .select("role, content, created_at")
    .eq("elder_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[conversations] GET error:", error.message);
    return NextResponse.json({ messages: [] });
  }

  const ordered = (data || []).slice().reverse();
  console.log(`[conversations] Loaded ${ordered.length} messages for ${userId} (most recent)`);
  return NextResponse.json({ messages: ordered });
}

// POST — save a message
export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const body = await req.json();
  const { role, content } = body;
  const auth = await requireElderAccess(req, body.userId);
  if (!auth.ok) return auth.response;
  const userId = auth.elderId;
  if (!content || (role !== "user" && role !== "assistant")) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await admin.from("conversations").insert({
    elder_id: userId,
    role,
    content,
  });

  if (error) {
    console.error("[conversations] POST error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
