import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/api-auth";
import { admin, listLinks, connectByCode, issueCode } from "@/lib/links";

export const dynamic = "force-dynamic";

/**
 * 연결 (누구나 자기 엘로를 쓰고, 원하면 사람을 연결한다)
 *  family_links 한 줄 = "family_id 가 elder_id 를 볼 수 있다" + elder_id 가 정한 공유 범위.
 *  연결하면 양방향으로 두 줄이 생긴다. 각자 자기 줄(내가 보이는 줄)의 공유 범위만 바꿀 수 있다.
 *
 *  GET               → { me, watching: [...내가 볼 수 있는 사람], watchers: [...나를 볼 수 있는 사람] }
 *  POST {action:"code"}                       → 내 초대 번호 (6자리, 24시간)
 *  POST {action:"connect", code, relationship} → 번호로 연결 (양방향)
 *  PATCH {id, share_wellbeing?, share_meds?, share_appointments?, share_location?} → 내 공유 범위
 *  DELETE {userId}                            → 그 사람과의 연결 끊기 (양방향)
 */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = admin();
  const { data: me } = await db.from("users").select("full_name").eq("id", caller.id).maybeSingle();
  const links = await listLinks(db, caller.id);
  return NextResponse.json({ me: { id: caller.id, name: me?.full_name || "" }, ...links });
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = admin();
  const body = await req.json().catch(() => ({}));
  if (body.action === "code") {
    const r = await issueCode(db, caller.id, String(body.relationship || ""));
    return NextResponse.json(r, { status: r.error ? 500 : 200 });
  }
  if (body.action === "connect") {
    const r = await connectByCode(db, caller.id, String(body.code || ""), String(body.relationship || ""));
    return NextResponse.json(r, { status: r.error ? 400 : 200 });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function PATCH(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = admin();
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch: Record<string, boolean> = {};
  for (const k of ["share_wellbeing", "share_meds", "share_appointments", "share_location"]) if (typeof body[k] === "boolean") patch[k] = body[k];
  if (!Object.keys(patch).length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  // only the person being seen controls what is shared
  const { error } = await db.from("family_links").update(patch).eq("id", id).eq("elder_id", caller.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = admin();
  const body = await req.json().catch(() => ({}));
  const other = String(body.userId || "");
  if (!other) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await db.from("family_links").delete().or(`and(family_id.eq.${caller.id},elder_id.eq.${other}),and(family_id.eq.${other},elder_id.eq.${caller.id})`);
  return NextResponse.json({ ok: true });
}
