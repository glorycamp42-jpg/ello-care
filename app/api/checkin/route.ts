import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/api-auth";
import { buildCheckin } from "@/lib/checkin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET /api/checkin?userId=<linked person>&tz=America/Los_Angeles → that person's day, within what they share with me */
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const tz = req.nextUrl.searchParams.get("tz") || "America/Los_Angeles";
  const r = await buildCheckin(caller.id, userId, tz, caller.isAdmin);
  if ("error" in r) return NextResponse.json(r, { status: 403 });
  return NextResponse.json(r);
}
