import { admin, listLinks } from "@/lib/links";

/** 엘로 메시지 — server helpers shared by the API route and the chat tools. */
export type Msg = { id: string; from_user: string; to_user: string; body: string; created_at: string; read_at: string | null; fromName?: string; fromRelationship?: string };

const ACTIVE = ["accepted", "active"];

/** two people may message each other if a link exists in either direction */
export async function areLinked(a: string, b: string): Promise<boolean> {
  const db = admin();
  const { data } = await db.from("family_links").select("id").in("status", ACTIVE)
    .or(`and(family_id.eq.${a},elder_id.eq.${b}),and(family_id.eq.${b},elder_id.eq.${a})`).limit(1);
  return !!(data && data.length);
}

export async function sendMessage(from: string, to: string, body: string, replyTo?: string) {
  const text = String(body || "").trim().slice(0, 1000);
  if (!text) return { error: "내용이 비어 있어요." };
  if (from === to) return { error: "나에게는 보낼 수 없어요." };
  if (!(await areLinked(from, to))) return { error: "연결된 사람에게만 보낼 수 있어요." };
  const db = admin();
  const { data, error } = await db.from("ello_messages").insert({ from_user: from, to_user: to, body: text, reply_to: replyTo || null }).select("id, created_at").single();
  if (error) return { error: error.message };
  return { ok: true, id: data.id, created_at: data.created_at };
}

/** unread messages for me, with who sent them (relationship as I call them) */
export async function unreadFor(me: string): Promise<Msg[]> {
  const db = admin();
  const { data } = await db.from("ello_messages").select("id, from_user, to_user, body, created_at, read_at")
    .eq("to_user", me).is("read_at", null).order("created_at", { ascending: true }).limit(20);
  const rows = (data || []) as Msg[];
  if (!rows.length) return [];
  const { watching, watchers } = await listLinks(db, me);
  const who = (uid: string) => watching.find(w => w.userId === uid) || watchers.find(w => w.userId === uid);
  const now = new Date().toISOString();
  await db.from("ello_messages").update({ delivered_at: now }).in("id", rows.map(r => r.id)).is("delivered_at", null);
  return rows.map(r => { const w = who(r.from_user); return { ...r, fromName: w?.name || "", fromRelationship: w?.relationship || "" }; });
}

export async function markRead(me: string, ids: string[]) {
  if (!ids.length) return;
  await admin().from("ello_messages").update({ read_at: new Date().toISOString() }).eq("to_user", me).in("id", ids).is("read_at", null);
}

/** recent thread between me and one person (both directions) */
export async function threadWith(me: string, other: string, limit = 30): Promise<Msg[]> {
  const db = admin();
  const { data } = await db.from("ello_messages").select("id, from_user, to_user, body, created_at, read_at")
    .or(`and(from_user.eq.${me},to_user.eq.${other}),and(from_user.eq.${other},to_user.eq.${me})`)
    .order("created_at", { ascending: false }).limit(limit);
  return ((data || []) as Msg[]).reverse();
}
