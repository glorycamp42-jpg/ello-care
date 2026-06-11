import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  if (links && links.length > 0) return links[0].elder_id;
  return userId;
}

// GET - 최근 7일 활동 요약 + AI 한줄평 (가족 주간 리포트)
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const userId = req.nextUrl.searchParams.get("userId") || "default";
  if (userId === "default") {
    return NextResponse.json({ error: "userId 필요" }, { status: 400 });
  }

  const elderId = await resolveElderId(admin, userId);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 최근 7일 대화
  const { data: convos } = await admin
    .from("conversations")
    .select("role, content, created_at")
    .eq("elder_id", elderId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(500);

  // 다가오는 일정
  const { data: appts } = await admin
    .from("appointments")
    .select("title, type, scheduled_at")
    .eq("elder_id", elderId)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);

  const conversations = convos || [];
  const userMsgs = conversations.filter((c: { role: string }) => c.role === "user");

  // 요일별 대화 수
  const dayCounts: Record<string, number> = {};
  for (const c of userMsgs) {
    const d = new Date(c.created_at).toISOString().split("T")[0];
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  }
  const activeDays = Object.keys(dayCounts).length;

  // AI 한줄 요약 (대화가 있을 때만)
  let summary = "";
  if (userMsgs.length > 0 && process.env.ANTHROPIC_API_KEY) {
    try {
      const sample = userMsgs
        .slice(-40)
        .map((c: { content: string }) => c.content)
        .join("\n")
        .slice(0, 4000);
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `다음은 어르신이 이번 주 AI 말벗과 나눈 대화 중 어르신이 한 말들입니다. 가족에게 보내는 주간 안부 리포트로 2~3문장으로 요약해주세요. 기분/건강/관심사 위주로, 따뜻하고 간결하게. 개인정보(주소, 계좌 등)는 언급하지 마세요. 본문만 출력:\n\n${sample}`,
            },
          ],
        }),
      });
      if (r.ok) {
        const data = await r.json();
        summary = data?.content?.[0]?.text?.trim() || "";
      }
    } catch {
      // 요약 실패해도 통계는 반환
    }
  }

  return NextResponse.json({
    period: { from: since, to: new Date().toISOString() },
    chatCount: userMsgs.length,
    activeDays,
    dayCounts,
    upcomingAppointments: appts || [],
    summary,
  });
}
