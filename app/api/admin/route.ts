import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 관리자 이메일 목록
const ADMIN_EMAILS = ["glorycamp42@gmail.com"];

function getElloAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getTotalmedixAdmin() {
  const url = process.env.TOTALMEDIX_SUPABASE_URL;
  const key = process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// 관리자 여부 확인: Bearer 토큰 우선, 쿠키 세션 fallback
async function requireAdmin(req: NextRequest): Promise<{ ok: boolean; email?: string }> {
  // 1) Authorization: Bearer <access_token>
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token) {
      const { data: { user } } = await getElloAdmin().auth.getUser(token);
      if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return { ok: true, email: user.email };
      }
      if (user?.email) return { ok: false, email: user.email };
    }
  } catch {}
  // 2) 쿠키 세션
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return { ok: true, email: user.email };
    }
    return { ok: false, email: user?.email || undefined };
  } catch {
    return { ok: false };
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: "관리자 권한이 없습니다", current: auth.email || "(로그인 세션 없음)" },
      { status: 403 }
    );
  }

  const resource = req.nextUrl.searchParams.get("resource");
  const admin = getElloAdmin();

  try {
    if (resource === "users") {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (error) throw error;
      const users = data.users.map((u) => ({
        id: u.id,
        email: u.email || "(이메일 없음)",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));
      return NextResponse.json({ users });
    }

    if (resource === "links") {
      const { data, error } = await admin.from("family_links").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json({ links: data || [] });
    }

    if (resource === "adhc") {
      const { data: connections } = await admin
        .from("adhc_connections")
        .select("*")
        .order("created_at", { ascending: false });

      let participants: { id: string; name: string; status: string }[] = [];
      const tm = getTotalmedixAdmin();
      if (tm) {
        const { data: parts } = await tm
          .from("participants")
          .select("id, first_name, last_name, status")
          .order("created_at", { ascending: false })
          .limit(200);
        participants = (parts || []).map((p) => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || p.id,
          status: p.status,
        }));
      }
      return NextResponse.json({ connections: connections || [], participants });
    }

    if (resource === "wellness") {
      // 최근 대화/위치를 한 번에 가져와 어르신별 마지막 활동 계산
      const { data: convos } = await admin
        .from("conversations")
        .select("elder_id, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      const { data: gps } = await admin
        .from("gps_locations")
        .select("user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      const lastSeen: Record<string, string> = {};
      for (const c of convos || []) {
        if (!lastSeen[c.elder_id]) lastSeen[c.elder_id] = c.created_at;
      }
      for (const g of gps || []) {
        if (!lastSeen[g.user_id] || new Date(g.created_at) > new Date(lastSeen[g.user_id])) {
          lastSeen[g.user_id] = g.created_at;
        }
      }
      return NextResponse.json({ lastSeen });
    }

    return NextResponse.json({ error: "resource 파라미터 필요 (users|links|adhc|wellness)" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: "관리자 권한이 없습니다" }, { status: 403 });

  const body = await req.json();
  const admin = getElloAdmin();

  try {
    if (body.resource === "link") {
      const { family_id, elder_id, relationship, elder_name } = body;
      if (!family_id || !elder_id) {
        return NextResponse.json({ error: "family_id, elder_id 필요" }, { status: 400 });
      }
      const { data, error } = await admin
        .from("family_links")
        .insert({
          family_id,
          elder_id,
          relationship: relationship || "가족",
          elder_name: elder_name || "어르신",
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ link: data });
    }

    if (body.resource === "adhc") {
      const { ello_user_id, participant_id } = body;
      if (!ello_user_id || !participant_id) {
        return NextResponse.json({ error: "ello_user_id, participant_id 필요" }, { status: 400 });
      }
      // 기존 연결이 있으면 active로 갱신, 없으면 생성
      const { data: existing } = await admin
        .from("adhc_connections")
        .select("id")
        .eq("ello_user_id", ello_user_id)
        .limit(1);

      if (existing && existing.length > 0) {
        const { data, error } = await admin
          .from("adhc_connections")
          .update({ participant_id, status: "active" })
          .eq("id", existing[0].id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ connection: data });
      }

      const { data, error } = await admin
        .from("adhc_connections")
        .insert({ ello_user_id, participant_id, status: "active" })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ connection: data });
    }

    return NextResponse.json({ error: "resource 필요 (link|adhc)" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "저장 실패" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: "관리자 권한이 없습니다" }, { status: 403 });

  const body = await req.json();
  const admin = getElloAdmin();

  try {
    if (body.resource === "link" && body.id) {
      const { error } = await admin.from("family_links").delete().eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (body.resource === "adhc" && body.id) {
      // 완전 삭제 대신 비활성화 (이력 보존)
      const { error } = await admin
        .from("adhc_connections")
        .update({ status: "inactive" })
        .eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "resource, id 필요" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "삭제 실패" },
      { status: 500 }
    );
  }
}
