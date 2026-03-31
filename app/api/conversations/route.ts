import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const userId = req.nextUrl.searchParams.get("userId") || "default";
  if (userId === "default") return NextResponse.json({ messages: [] });

  // Last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("conversations")
    .select("role, content, created_at")
    .eq("elder_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[conversations] GET error:", error.message);
    return NextResponse.json({ messages: [] });
  }

  console.log(`[conversations] Loaded ${data?.length || 0} messages for ${userId}`);
  return NextResponse.json({ messages: data || [] });
}

// POST — save a message
export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const { userId, role, content } = await req.json();
  if (!userId || userId === "default" || !content) {
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
