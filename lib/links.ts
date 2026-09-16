import { createClient } from "@supabase/supabase-js";

/** Server-side helpers for 연결 (family_links as a two-way relationship with per-person sharing). */
export function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}

type LinkRow = { id: string; elder_id: string; family_id: string; relationship: string | null; status: string;
  share_wellbeing: boolean; share_meds: boolean; share_appointments: boolean; share_location: boolean; created_at: string };

const ACTIVE = ["accepted", "active"];

async function names(db: ReturnType<typeof admin>, ids: string[]) {
  const map: Record<string, string> = {};
  if (!ids.length) return map;
  const { data } = await db.from("users").select("id, full_name").in("id", ids);
  for (const u of data || []) map[u.id] = u.full_name || "";
  return map;
}

export async function listLinks(db: ReturnType<typeof admin>, me: string) {
  const { data } = await db.from("family_links").select("*").or(`family_id.eq.${me},elder_id.eq.${me}`).in("status", ACTIVE);
  const rows = (data || []) as LinkRow[];
  const watching = rows.filter(r => r.family_id === me);   // 내가 보는 사람 (relationship = 그 사람이 나에게 누구인지)
  const watchers = rows.filter(r => r.elder_id === me);    // 나를 보는 사람
  const nm = await names(db, Array.from(new Set(rows.flatMap(r => [r.elder_id, r.family_id]))));
  return {
    watching: watching.map(r => ({ id: r.id, userId: r.elder_id, name: nm[r.elder_id] || "", relationship: r.relationship || "",
      share_wellbeing: r.share_wellbeing, share_meds: r.share_meds, share_appointments: r.share_appointments, share_location: r.share_location })),
    watchers: watchers.map(r => ({ id: r.id, userId: r.family_id, name: nm[r.family_id] || "", relationship: r.relationship || "",
      share_wellbeing: r.share_wellbeing, share_meds: r.share_meds, share_appointments: r.share_appointments, share_location: r.share_location })),
  };
}

/** relationship as seen from the other side: 딸 ↔ 어머니/아버지 can't be guessed safely, so we store what each person typed. */
export async function connectByCode(db: ReturnType<typeof admin>, me: string, code: string, relationship: string) {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return { error: "번호 6자리를 넣어주세요." };
  const { data: inv } = await db.from("link_invites").select("user_id, relationship_hint, expires_at").eq("code", clean).maybeSingle();
  if (!inv) return { error: "번호가 맞지 않아요. 상대방 엘로에서 '내 연결 번호'를 다시 확인해 주세요." };
  if (new Date(inv.expires_at).getTime() < Date.now()) return { error: "번호가 만료됐어요. 상대방이 새 번호를 받아야 해요." };
  const other = inv.user_id as string;
  if (other === me) return { error: "내 번호예요. 상대방 번호를 넣어주세요." };
  const rel = relationship.trim().slice(0, 20) || "가족";
  const hint = String(inv.relationship_hint || "").trim().slice(0, 20) || "가족";
  // me watches other (other is my "rel"), other watches me (I am other's "hint")
  const rows = [
    { family_id: me, elder_id: other, relationship: rel, status: "accepted" },
    { family_id: other, elder_id: me, relationship: hint, status: "accepted" },
  ];
  const { error } = await db.from("family_links").upsert(rows, { onConflict: "family_id,elder_id", ignoreDuplicates: true });
  if (error) return { error: error.message };
  await db.from("link_invites").delete().eq("code", clean);
  const { data: u } = await db.from("users").select("full_name").eq("id", other).maybeSingle();
  return { ok: true, userId: other, name: u?.full_name || "", relationship: rel };
}

export async function issueCode(db: ReturnType<typeof admin>, me: string, hint: string) {
  await db.from("link_invites").delete().eq("user_id", me);
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await db.from("link_invites").insert({ code, user_id: me, relationship_hint: hint.slice(0, 20) });
    if (!error) return { code, expiresInHours: 24 };
  }
  return { error: "번호 발급 실패" };
}

