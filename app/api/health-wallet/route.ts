import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const TABLES = [
  "health_medications",
  "health_insurance_cards",
  "health_allergies",
  "health_diagnoses",
  "health_doctors",
  "health_pharmacies",
  "health_emergency_contacts",
  "health_vaccinations",
  "health_surgeries",
] as const;

type TableName = (typeof TABLES)[number];

function isValidTable(t: string): t is TableName {
  return TABLES.includes(t as TableName);
}

function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    clean[k] = v;
  }
  return clean;
}

export async function GET(req: NextRequest) {
  const db = admin();
  const userId = req.nextUrl.searchParams.get("userId");
  const table = req.nextUrl.searchParams.get("table");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (table) {
    if (!isValidTable(table)) return NextResponse.json({ error: "invalid table" }, { status: 400 });
    const { data, error } = await db.from(table).select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ [table]: data || [] });
  }

  const result: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const { data } = await db.from(t).select("*").eq("user_id", userId).order("created_at", { ascending: false });
    result[t] = data || [];
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const db = admin();
  try {
    const body = await req.json();
    const { table, ...fields } = body;
    if (!table || !isValidTable(table)) return NextResponse.json({ error: "invalid table" }, { status: 400 });
    if (!fields.user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const clean = cleanFields(fields);
    clean.user_id = fields.user_id;
    const { data, error } = await db.from(table).insert(clean).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const db = admin();
  try {
    const body = await req.json();
    const { table, id, ...fields } = body;
    if (!table || !isValidTable(table)) return NextResponse.json({ error: "invalid table" }, { status: 400 });
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const clean = cleanFields(fields);
    const { error } = await db.from(table).update(clean).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const db = admin();
  try {
    const body = await req.json();
    const { table, id } = body;
    if (!table || !isValidTable(table)) return NextResponse.json({ error: "invalid table" }, { status: 400 });
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
