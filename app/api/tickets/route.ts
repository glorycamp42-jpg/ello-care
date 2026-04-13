import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 정원 단계 계산
function getStage(tickets: number): { stage: number; name: string; next: number } {
  if (tickets >= 60) return { stage: 5, name: "열매 수확", next: 0 };
  if (tickets >= 40) return { stage: 4, name: "만개", next: 60 };
  if (tickets >= 25) return { stage: 3, name: "꽃봉오리", next: 40 };
  if (tickets >= 10) return { stage: 2, name: "새싹", next: 25 };
  return { stage: 1, name: "씨앗", next: 10 };
}

// GET - 정원 상태 조회
export async function GET(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId || userId === "default") return NextResponse.json({ error: "userId required" }, { status: 400 });

  // garden_status 가져오기 (없으면 생성)
  let { data: garden } = await admin
    .from("garden_status")
    .select("*")
    .eq("elder_id", userId)
    .single();

  if (!garden) {
    const { data: newGarden } = await admin
      .from("garden_status")
      .insert({ elder_id: userId })
      .select()
      .single();
    garden = newGarden;
  }

  if (!garden) return NextResponse.json({ error: "Failed to get garden" }, { status: 500 });

  const stageInfo = getStage(garden.total_tickets);

  // 오늘 티켓 정보
  const today = new Date().toISOString().split("T")[0];
  const { data: todayTicket } = await admin
    .from("happiness_tickets")
    .select("*")
    .eq("elder_id", userId)
    .eq("date", today)
    .single();

  return NextResponse.json({
    garden: {
      totalTickets: garden.total_tickets,
      stage: stageInfo.stage,
      stageName: stageInfo.name,
      nextStageAt: stageInfo.next,
      streakDays: garden.streak_days,
      harvestCount: garden.harvest_count,
      canHarvest: garden.total_tickets >= 60,
    },
    today: todayTicket ? {
      dailyChat: todayTicket.daily_chat,
      moodBonus: todayTicket.mood_bonus,
      streakBonus: todayTicket.streak_bonus,
      appointmentBonus: todayTicket.appointment_bonus,
      totalToday: todayTicket.total_today,
    } : null,
  });
}

// POST - 티켓 적립 (chat API에서 호출)
export async function POST(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { userId, type, moodScore } = await req.json();
  if (!userId || userId === "default") return NextResponse.json({ error: "userId required" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];

  // garden_status 가져오기 (없으면 생성)
  let { data: garden } = await admin
    .from("garden_status")
    .select("*")
    .eq("elder_id", userId)
    .single();

  if (!garden) {
    const { data: ng } = await admin
      .from("garden_status")
      .insert({ elder_id: userId })
      .select()
      .single();
    garden = ng;
  }
  if (!garden) return NextResponse.json({ error: "Failed to get garden" }, { status: 500 });

  // 오늘 티켓 레코드 가져오기 (없으면 생성)
  let { data: ticket } = await admin
    .from("happiness_tickets")
    .select("*")
    .eq("elder_id", userId)
    .eq("date", today)
    .single();

  if (!ticket) {
    const { data: nt } = await admin
      .from("happiness_tickets")
      .insert({ elder_id: userId, date: today })
      .select()
      .single();
    ticket = nt;
  }
  if (!ticket) return NextResponse.json({ error: "Failed to get ticket" }, { status: 500 });

  let ticketsAdded = 0;

  if (type === "chat" && !ticket.daily_chat) {
    // 매일 대화 +1
    ticket.daily_chat = true;
    ticketsAdded += 1;

    // 연속 기록 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let newStreak = 1;
    if (garden.last_chat_date === yesterdayStr) {
      newStreak = garden.streak_days + 1;
    } else if (garden.last_chat_date === today) {
      newStreak = garden.streak_days; // 이미 오늘 카운트됨
    }

    // 7일 연속 보너스
    if (newStreak > 0 && newStreak % 7 === 0) {
      ticket.streak_bonus += 3;
      ticketsAdded += 3;
    }

    await admin.from("garden_status").update({
      streak_days: newStreak,
      last_chat_date: today,
      updated_at: new Date().toISOString(),
    }).eq("elder_id", userId);

    garden.streak_days = newStreak;
  }

  if (type === "mood" && moodScore >= 7 && !ticket.mood_bonus) {
    ticket.mood_bonus = true;
    ticketsAdded += 1;
  }

  if (type === "appointment") {
    ticket.appointment_bonus += 1;
    ticketsAdded += 1;
  }

  if (ticketsAdded > 0) {
    ticket.total_today = (ticket.daily_chat ? 1 : 0) + (ticket.mood_bonus ? 1 : 0) + ticket.streak_bonus + ticket.appointment_bonus;

    await admin.from("happiness_tickets").update({
      daily_chat: ticket.daily_chat,
      mood_bonus: ticket.mood_bonus,
      streak_bonus: ticket.streak_bonus,
      appointment_bonus: ticket.appointment_bonus,
      total_today: ticket.total_today,
    }).eq("id", ticket.id);

    const newTotal = garden.total_tickets + ticketsAdded;
    await admin.from("garden_status").update({
      total_tickets: newTotal,
      current_stage: getStage(newTotal).stage,
      updated_at: new Date().toISOString(),
    }).eq("elder_id", userId);
  }

  return NextResponse.json({
    ticketsAdded,
    totalTickets: garden.total_tickets + ticketsAdded,
    stage: getStage(garden.total_tickets + ticketsAdded),
    streakDays: garden.streak_days,
  });
}

// PATCH - 수확하기
export async function PATCH(req: NextRequest) {
  const admin = getAdmin();
  if (!admin) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

  const { userId } = await req.json();
  if (!userId || userId === "default") return NextResponse.json({ error: "userId required" }, { status: 400 });

  const { data: garden } = await admin
    .from("garden_status")
    .select("*")
    .eq("elder_id", userId)
    .single();

  if (!garden || garden.total_tickets < 60) {
    return NextResponse.json({ error: "Not enough tickets to harvest" }, { status: 400 });
  }

  const remaining = garden.total_tickets - 60;
  const { data: updated } = await admin.from("garden_status").update({
    total_tickets: remaining,
    current_stage: getStage(remaining).stage,
    harvest_count: garden.harvest_count + 1,
    updated_at: new Date().toISOString(),
  }).eq("elder_id", userId).select().single();

  return NextResponse.json({
    harvested: true,
    harvestCount: updated?.harvest_count || garden.harvest_count + 1,
    remainingTickets: remaining,
    newStage: getStage(remaining),
  });
}
