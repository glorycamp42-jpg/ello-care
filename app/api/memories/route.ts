import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireElderAccess, getCaller, canAccessElder } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// GET — list memories for an elder (?userId= optional; defaults to caller)
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ memories: [] });

  const auth = await requireElderAccess(req, req.nextUrl.searchParams.get("userId"));
  if (!auth.ok) return auth.response;

  const { data, error } = await admin
    .from("memories")
    .select("*")
    .eq("user_id", auth.elderId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[memories] GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ memories: data || [] });
}

// POST — save a memory { date (category), time (key), content (value), user_id? }
export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  try {
    const body = await req.json();
    const { date, time, content } = body;
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

    const auth = await requireElderAccess(req, body.user_id);
    if (!auth.ok) return auth.response;

    const { data, error } = await admin
      .from("memories")
      .upsert({ user_id: auth.elderId, date: date || "other", time: time || content.slice(0, 40), content }, { onConflict: "user_id,time" })
      .select()
      .single();

    if (error) {
      console.error("[memories] POST error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ memory: data });
  } catch (err) {
    console.error("[memories] POST unhandled:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove a memory by id (must belong to caller / linked elder)
export async function DELETE(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const caller = await getCaller(req);
    if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

    const { data: row } = await admin.from("memories").select("user_id").eq("id", id).single();
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!(await canAccessElder(caller, row.user_id))) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

    const { error } = await admin.from("memories").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
