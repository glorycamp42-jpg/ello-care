import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller, canAccessElder } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveElderId(admin: any, userId: string): Promise<string> {
  // First check if this userId has appointments directly (they are an elder)
  const { data: directAppts } = await admin
    .from("appointments")
    .select("id")
    .eq("elder_id", userId)
    .limit(1);

  if (directAppts && directAppts.length > 0) {
    return userId;
  }

  // Check if this is a family member linked to an elder
  const { data: links } = await admin
    .from("family_links")
    .select("elder_id")
    .eq("family_id", userId)
    .limit(1) as { data: { elder_id: string }[] | null };

  if (links && links.length > 0) {
    console.log(`[appointments] Resolved family ${userId} → elder ${links[0].elder_id}`);
    return links[0].elder_id;
  }

  // Fallback: use as-is
  return userId;
}

// GET - list appointments (accepts userId which can be elder_id OR family_id)
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ appointments: [] });

  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const requested = req.nextUrl.searchParams.get("userId");
  const userId = requested && requested !== "default" ? requested : caller.id;

  // userId may be an elder id or a family id (family app passes its own id) — resolve to elder
  const elderId = await resolveElderId(admin, userId);
  if (!(await canAccessElder(caller, elderId))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  console.log(`[appointments] GET: userId=${userId}, resolved elderId=${elderId}`);

  const { data, error } = await admin
    .from("appointments")
    .select("*")
    .eq("elder_id", elderId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[appointments] GET error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: data || [] });
}

// DELETE - delete an appointment by id
export async function DELETE(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: appt } = await admin.from("appointments").select("elder_id").eq("id", id).single();
  if (!appt) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!(await canAccessElder(caller, appt.elder_id))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { error } = await admin.from("appointments").delete().eq("id", id);
  if (error) {
    console.error("[appointments] DELETE error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
