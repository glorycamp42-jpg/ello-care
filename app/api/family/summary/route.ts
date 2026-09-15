import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller, canAccessElder } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/family/summary?elderId=<optional>
 * Family-app home data for one elder: name, ticket total, last location, recent activity, active SOS.
 * If elderId is omitted, uses the caller's first accepted family link (or the caller itself if they are an elder).
 */
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let elderId = req.nextUrl.searchParams.get("elderId") || "";
  if (!elderId) {
    const { data: link } = await admin
      .from("family_links")
      .select("elder_id")
      .eq("family_id", caller.id)
      .eq("status", "accepted")
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    elderId = link?.elder_id || caller.id;
  }
  if (!(await canAccessElder(caller, elderId))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const [elder, garden, loc, convos, sos, links] = await Promise.all([
    admin.from("users").select("id, full_name, email, phone").eq("id", elderId).maybeSingle(),
    admin.from("garden_status").select("total_tickets, streak_days, current_stage").eq("elder_id", elderId).maybeSingle(),
    admin.from("gps_locations").select("lat, lng, accuracy, recorded_at").eq("user_id", elderId).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("conversations").select("role, content, created_at").eq("elder_id", elderId).order("created_at", { ascending: false }).limit(30),
    admin.from("sos_events").select("id, status, triggered_at, lat, lng").eq("elder_id", elderId).eq("status", "active").order("triggered_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("family_links").select("id, family_id, relationship, status, is_primary").eq("elder_id", elderId),
  ]);

  // Build a compact activity feed from real events
  type Activity = { icon: string; text: string; at: string };
  const activity: Activity[] = [];
  const rows = (convos.data || []) as { role: string; content: string; created_at: string }[];
  const lastUserMsg = rows.find((r) => r.role === "user");
  if (lastUserMsg) activity.push({ icon: "💬", text: "엘로와 대화함", at: lastUserMsg.created_at });
  const lastSos = rows.find((r) => r.role === "assistant" && r.content.startsWith("[SOS"));
  if (lastSos) activity.push({ icon: "🆘", text: lastSos.content.replace(/^\[SOS [a-z]+\]\s*/, "긴급 알림: "), at: lastSos.created_at });
  if (loc.data) activity.push({ icon: "📍", text: "위치 업데이트됨", at: loc.data.recorded_at });
  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const lastActivityAt = rows[0]?.created_at || loc.data?.recorded_at || null;
  const isOnline = !!lastActivityAt && Date.now() - new Date(lastActivityAt).getTime() < 15 * 60 * 1000;

  return NextResponse.json({
    elderId,
    elderName: elder.data?.full_name || "어르신",
    elderPhone: elder.data?.phone || null,
    totalTickets: garden.data?.total_tickets ?? 0,
    streakDays: garden.data?.streak_days ?? 0,
    lastLocation: loc.data
      ? { latitude: loc.data.lat, longitude: loc.data.lng, accuracy: loc.data.accuracy, created_at: loc.data.recorded_at }
      : null,
    isOnline,
    activeSos: sos.data || null,
    familyLinks: links.data || [],
    activity: activity.slice(0, 5),
  });
}
