import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/api-auth";
import { sendMessage, unreadFor, markRead, threadWith } from "@/lib/messages";

export const dynamic = "force-dynamic";

/**
 * 엘로 메시지 (연결된 사람끼리)
 *  GET  ?unread=1            → { unread: [...] }   (marks delivered)
 *  GET  ?with=<userId>       → { thread: [...] }
 *  POST { to, body, replyTo? } → { ok, id }
 *  PATCH { ids: [...] }      → mark read (only messages sent to me)
 */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const withUser = req.nextUrl.searchParams.get("with");
  if (withUser) return NextResponse.json({ thread: await threadWith(caller.id, withUser) });
  return NextResponse.json({ unread: await unreadFor(caller.id) });
}

export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const r = await sendMessage(caller.id, String(body.to || ""), String(body.body || ""), body.replyTo ? String(body.replyTo) : undefined);
  return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
}

export async function PATCH(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 50) : [];
  await markRead(caller.id, ids);
  return NextResponse.json({ ok: true });
}
