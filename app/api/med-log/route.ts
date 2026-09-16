import { NextRequest, NextResponse } from "next/server";
import { getCaller, requireElderAccess } from "@/lib/api-auth";
import { admin } from "@/lib/links";

export const dynamic = "force-dynamic";

/**
 * 약 복용 기록 — 폰 알림에서 "먹었어요"를 누르면 서버에도 남긴다 (연결된 가족의 엘로가 답할 수 있게).
 *  POST { date: "YYYY-MM-DD", time: "HH:MM", names: string[], status?: "taken"|"snoozed" }  (self only)
 *  GET  ?userId=&date=  → 그 날의 기록 (본인 또는 연결된 사람)
 */
export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const date = String(body.date || ""), time = String(body.time || "");
  const names = Array.isArray(body.names) ? body.names.map(String).slice(0, 20) : [];
  const status = body.status === "snoozed" ? "snoozed" : "taken";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: "date/time required" }, { status: 400 });
  const { error } = await admin().from("medication_log").upsert(
    { user_id: caller.id, log_date: date, scheduled_time: time, med_names: names, status, taken_at: new Date().toISOString() },
    { onConflict: "user_id,log_date,scheduled_time" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireElderAccess(req, req.nextUrl.searchParams.get("userId"));
  if (!auth.ok) return auth.response;
  const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const { data, error } = await admin().from("medication_log").select("log_date, scheduled_time, med_names, status, taken_at").eq("user_id", auth.elderId).eq("log_date", date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ log: data || [] });
}
