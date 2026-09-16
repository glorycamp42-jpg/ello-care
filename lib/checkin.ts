import { admin } from "@/lib/links";

/**
 * "엄마 오늘 약 드셨어?" — a linked person's day, limited to what THEY chose to share.
 * Never returns conversation text; wellbeing is a one-line summary only.
 */
type MedItem = { name: string; time: string; taken: boolean; takenAt: string | null };
export type Checkin = {
  userId: string; name: string; relationship: string;
  shared: { wellbeing: boolean; meds: boolean; appointments: boolean; location: boolean };
  wellbeing?: { talkedToday: number; lastTalkAt: string | null; summary: string };
  meds?: { items: MedItem[]; allTaken: boolean; pending: number };
  appointments?: { title: string; when: string; location: string }[];
  location?: { lat: number; lng: number; at: string } | null;
  sos?: { at: string } | null;
};

function dayStr(tz: string, d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
function nowHHMM(tz: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}

export async function buildCheckin(viewerId: string, targetId: string, tz = "America/Los_Angeles", isAdmin = false): Promise<Checkin | { error: string }> {
  const db = admin();
  const { data: link } = await db.from("family_links").select("relationship, share_wellbeing, share_meds, share_appointments, share_location")
    .eq("family_id", viewerId).eq("elder_id", targetId).in("status", ["accepted", "active"]).maybeSingle();
  if (!link && !isAdmin && viewerId !== targetId) return { error: "연결되지 않은 사람이에요." };
  const shared = {
    wellbeing: link ? link.share_wellbeing !== false : true,
    meds: link ? link.share_meds !== false : true,
    appointments: link ? link.share_appointments !== false : true,
    location: link ? link.share_location === true : viewerId === targetId,
  };
  const { data: u } = await db.from("users").select("full_name").eq("id", targetId).maybeSingle();
  const out: Checkin = { userId: targetId, name: u?.full_name || "", relationship: link?.relationship || "", shared };
  const today = dayStr(tz);
  const dayStartIso = `${today}T00:00:00`; // scheduled_at holds the elder's wall-clock time; compare as text

  if (shared.wellbeing) {
    const { data: convos } = await db.from("conversations").select("role, content, created_at").eq("elder_id", targetId)
      .gte("created_at", new Date(Date.now() - 36 * 3600 * 1000).toISOString()).order("created_at", { ascending: false }).limit(60);
    const rows = (convos || []) as { role: string; content: string; created_at: string }[];
    const todays = rows.filter(r => r.role === "user" && dayStr(tz, new Date(r.created_at)) === today);
    const last = rows.find(r => r.role === "user");
    let summary = todays.length ? "" : "오늘은 아직 엘로와 이야기하지 않았어요.";
    if (todays.length && process.env.ANTHROPIC_API_KEY) {
      try {
        const sample = todays.slice(0, 25).map(r => r.content.slice(0, 200)).reverse().join("\n");
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 120, messages: [{ role: "user", content:
            `아래는 한 분이 오늘 AI 비서에게 한 말들입니다. 가족에게 전하는 안부 한 줄(25자 이내, 한국어)로만 답하세요. 기분·건강·불편 위주. 내용을 인용하지 말고, 개인정보·돈·주소는 절대 언급하지 마세요.\n\n${sample}` }] }),
        });
        const data = await res.json();
        summary = String(data.content?.[0]?.text || "").trim().slice(0, 80) || "평소처럼 지내셨어요.";
      } catch { summary = "평소처럼 지내셨어요."; }
    }
    out.wellbeing = { talkedToday: todays.length, lastTalkAt: last?.created_at || null, summary };
  }

  if (shared.meds) {
    const [{ data: meds }, { data: log }] = await Promise.all([
      db.from("health_medications").select("name, times, reminder_enabled").eq("user_id", targetId).eq("is_active", true),
      db.from("medication_log").select("scheduled_time, med_names, taken_at, status").eq("user_id", targetId).eq("log_date", today),
    ]);
    const items: MedItem[] = [];
    const now = nowHHMM(tz);
    for (const m of (meds || []) as { name: string; times: string[]; reminder_enabled: boolean }[]) {
      if (m.reminder_enabled === false) continue;
      for (const t of m.times || []) {
        const hit = (log || []).find((l: { scheduled_time: string; med_names: string[]; status: string }) => l.scheduled_time === t && l.status === "taken" && (l.med_names || []).includes(m.name));
        items.push({ name: m.name, time: t, taken: !!hit, takenAt: hit ? hit.taken_at : null });
      }
    }
    items.sort((a, b) => a.time.localeCompare(b.time));
    const due = items.filter(i => i.time <= now);
    out.meds = { items, allTaken: due.every(i => i.taken), pending: due.filter(i => !i.taken).length };
  }

  if (shared.appointments) {
    const { data: appts } = await db.from("appointments").select("title, scheduled_at, location, status").eq("elder_id", targetId)
      .gte("scheduled_at", dayStartIso).order("scheduled_at", { ascending: true }).limit(5);
    out.appointments = ((appts || []) as { title: string; scheduled_at: string; location: string; status: string }[])
      .filter(a => !a.status || a.status === "upcoming").map(a => ({ title: a.title, when: a.scheduled_at, location: a.location || "" }));
  }

  if (shared.location) {
    const { data: loc } = await db.from("gps_locations").select("lat, lng, recorded_at").eq("user_id", targetId).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
    out.location = loc ? { lat: loc.lat, lng: loc.lng, at: loc.recorded_at } : null;
  }

  try {
    const { data: sos } = await db.from("sos_events").select("triggered_at").eq("elder_id", targetId).eq("status", "active").order("triggered_at", { ascending: false }).limit(1).maybeSingle();
    out.sos = sos ? { at: sos.triggered_at } : null;
  } catch { out.sos = null; }

  return out;
}

/** Compact Korean facts for the chat model (no raw conversation text). */
export function checkinToText(c: Checkin, tz = "America/Los_Angeles"): string {
  const who = `${c.relationship ? c.relationship + " " : ""}${c.name || ""}`.trim() || "그분";
  const fmtT = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
  // appointments.scheduled_at is stored as the elder's wall-clock time (no real timezone) → read the digits, never convert
  const fmtD = (iso: string) => {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!m) return String(iso);
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const h = Number(m[4]), min = m[5];
    const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    return `${Number(m[2])}월 ${Number(m[3])}일(${wd}) ${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${min}`;
  };
  const lines: string[] = [`${who}:`];
  if (c.sos) lines.push(`!! 긴급(SOS) 알림이 ${fmtT(c.sos.at)}부터 해제되지 않음 — 먼저 전화하라고 권할 것`);
  if (c.wellbeing) lines.push(`안부: 오늘 엘로와 대화 ${c.wellbeing.talkedToday}번${c.wellbeing.lastTalkAt ? `, 마지막 ${fmtT(c.wellbeing.lastTalkAt)}` : ""}. ${c.wellbeing.summary}`);
  else lines.push("안부: (공유 안 함)");
  if (c.meds) {
    if (!c.meds.items.length) lines.push("약: 등록된 약 알림 없음");
    else lines.push("약(오늘): " + c.meds.items.map(i => `${i.name} ${i.time} ${i.taken ? "드심" + (i.takenAt ? `(${fmtT(i.takenAt)})` : "") : (i.time <= nowHHMM(tz) ? "아직 안 드심" : "아직 시간 전")}`).join("; "));
  } else lines.push("약: (공유 안 함)");
  if (c.appointments) lines.push(c.appointments.length ? "일정: " + c.appointments.map(a => `${fmtD(a.when)} ${a.title}${a.location ? " @" + a.location : ""}`).join("; ") : "일정: 다가오는 일정 없음");
  else lines.push("일정: (공유 안 함)");
  if (c.shared.location) lines.push(c.location ? `위치: 마지막 확인 ${fmtT(c.location.at)} (지도는 앱에서)` : "위치: 기록 없음");
  return lines.join("\n");
}
