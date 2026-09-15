import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCaller } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/family/create-elder
 * A family member sets up a parent's account: creates the elder auth user (care mode, already onboarded),
 * links the family, and issues a 4-digit PIN the parent uses to log in (or a QR link that carries it).
 * body: { name, contacts?: [{name, relation, phone}], medications?: [{name, times:[]}], relationship? }
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 30);
  if (!name) return NextResponse.json({ error: "부모님 성함을 입력해 주세요." }, { status: 400 });
  const relationship = String(body.relationship || "가족").slice(0, 20);
  const contacts = Array.isArray(body.contacts) ? body.contacts.filter((c: { phone?: string }) => c && c.phone).slice(0, 5)
    .map((c: { name?: string; relation?: string; phone: string }, i: number) => ({ id: `c_${Date.now()}_${i}`, name: String(c.name || c.relation || "가족").slice(0, 30), relation: String(c.relation || "").slice(0, 20), phone: String(c.phone).replace(/[^\d+]/g, "") })) : [];
  const medications = Array.isArray(body.medications) ? body.medications.filter((m: { name?: string }) => m && m.name).slice(0, 10)
    .map((m: { name: string; times?: string[] }, i: number) => ({ id: `m_${Date.now()}_${i}`, name: String(m.name).slice(0, 40), times: (m.times || []).map(String).filter((t: string) => /^\d{2}:\d{2}$/.test(t)), enabled: true })) : [];

  // caller's name for the elder's default family contact
  const { data: me } = await admin.from("users").select("full_name, phone").eq("id", caller.id).maybeSingle();
  if (me?.phone && !contacts.some((c: { phone: string }) => c.phone.replace(/\D/g, "") === String(me.phone).replace(/\D/g, ""))) {
    contacts.unshift({ id: `c_${Date.now()}_me`, name: me.full_name || relationship, relation: relationship, phone: String(me.phone).replace(/[^\d+]/g, "") });
  }

  // 1) elder auth user (no password; logs in with PIN → magic link)
  const elderEmail = `elder_${crypto.randomUUID().slice(0, 8)}@ellocare.local`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: elderEmail,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { name, full_name: name, role: "elder", mode: "care", onboarded: true, ui_lang: "ko", source: "family_setup", set_up_by: caller.id, contacts, medications },
  });
  if (createErr || !created.user) return NextResponse.json({ error: "계정 생성 실패: " + (createErr?.message || "") }, { status: 500 });
  const elderId = created.user.id;
  await admin.from("users").upsert({ id: elderId, email: elderEmail, full_name: name, role: "elder", mode: "care", ui_lang: "ko", onboarded_at: new Date().toISOString() });

  // 2) family link (accepted, primary)
  await admin.from("family_links").upsert({ elder_id: elderId, family_id: caller.id, relationship, status: "accepted", is_primary: true }, { onConflict: "family_id,elder_id" });

  // 3) unique 4-digit PIN (avoid 0000/1234-style trivial ones)
  let pin = "";
  for (let attempt = 0; attempt < 30 && !pin; attempt++) {
    const candidate = String(Math.floor(1000 + Math.random() * 9000));
    if (/^(\d)\1{3}$/.test(candidate) || candidate === "1234") continue;
    const { data: taken } = await admin.from("elder_pins").select("elder_id").eq("pin", candidate).maybeSingle();
    if (taken) continue;
    // ADHC PINs live in TotalMedix — never issue one that would shadow an active participant PIN
    const tmUrl = process.env.TOTALMEDIX_SUPABASE_URL, tmKey = process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY;
    if (tmUrl && tmKey) {
      const tm = createClient(tmUrl, tmKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: adhc } = await tm.from("participant_ello_link").select("participant_id").eq("pin", candidate).eq("status", "active").maybeSingle();
      if (adhc) continue;
    }
    pin = candidate;
  }
  if (!pin) return NextResponse.json({ error: "PIN 발급 실패" }, { status: 500 });
  const { error: pinErr } = await admin.from("elder_pins").upsert({ elder_id: elderId, pin, created_by: caller.id });
  if (pinErr) return NextResponse.json({ error: pinErr.message }, { status: 500 });

  const origin = req.nextUrl.origin;
  return NextResponse.json({ ok: true, elderId, name, pin, loginUrl: `${origin}/login?pin=${pin}` });
}
