import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveElderId(admin: any, userId: string): Promise<string> {
  const { data: links } = await admin
    .from("family_links")
    .select("elder_id")
    .eq("family_id", userId)
    .limit(1) as { data: { elder_id: string }[] | null };

  if (links && links.length > 0) {
    return links[0].elder_id;
  }
  return userId;
}

// GET - 어르신의 최근 활동(대화/위치)을 종합해 안부 상태 반환
// status: "ok" (<24h) | "warn" (24~48h) | "alert" (>48h 또는 기록 없음)
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ status: "unknown", lastActivity: null });

  const userId = req.nextUrl.searchParams.get("userId") || "default";
  if (userId === "default") {
    return NextResponse.json({ status: "unknown", lastActivity: null });
  }

  const elderId = await resolveElderId(admin, userId);

  // 최근 대화
  const { data: convo } = await admin
    .from("conversations")
    .select("created_at")
    .eq("elder_id", elderId)
    .order("created_at", { ascending: false })
    .limit(1);

  // 최근 GPS
  const { data: gps } = await admin
    .from("gps_locations")
    .select("created_at")
    .eq("user_id", elderId)
    .order("created_at", { ascending: false })
    .limit(1);

  const convoAt = convo?.[0]?.created_at ? new Date(convo[0].created_at).getTime() : 0;
  const gpsAt = gps?.[0]?.created_at ? new Date(gps[0].created_at).getTime() : 0;

  const lastMs = Math.max(convoAt, gpsAt);
  if (lastMs === 0) {
    return NextResponse.json({ status: "alert", lastActivity: null, source: null, hoursAgo: null });
  }

  const source = convoAt >= gpsAt ? "conversation" : "location";
  const hoursAgo = (Date.now() - lastMs) / (1000 * 60 * 60);

  let status: "ok" | "warn" | "alert" = "ok";
  if (hoursAgo >= 48) status = "alert";
  else if (hoursAgo >= 24) status = "warn";

  return NextResponse.json({
    status,
    lastActivity: new Date(lastMs).toISOString(),
    source,
    hoursAgo: Math.round(hoursAgo * 10) / 10,
  });
}
