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

const ALLOWED_COLS: Record<TableName, string[]> = {
  health_insurance_cards: ["user_id", "carrier", "plan_name", "member_id", "group_number", "policy_holder", "effective_date", "expiry_date", "front_image_url", "back_image_url", "is_primary", "notes"],
  health_medications: ["user_id", "name", "dosage", "frequency", "route", "purpose", "prescriber", "pharmacy", "start_date", "end_date", "refill_date", "is_active", "notes"],
  health_allergies: ["user_id", "allergen", "type", "reaction", "severity", "notes"],
  health_diagnoses: ["user_id", "name", "icd_code", "diagnosed_date", "diagnosing_doctor", "is_active", "notes"],
  health_doctors: ["user_id", "name", "specialty", "clinic_name", "phone", "fax", "address", "is_pcp", "notes"],
  health_pharmacies: ["user_id", "name", "phone", "address", "is_primary", "notes"],
  health_emergency_contacts: ["user_id", "name", "relationship", "phone", "phone2", "is_primary", "notes"],
  health_vaccinations: ["user_id", "vaccine_name", "dose_number", "date_given", "administered_by", "location", "next_due_date", "notes"],
  health_surgeries: ["user_id", "procedure_name", "date_performed", "surgeon", "hospital", "notes"],
};

function cleanFields(table: TableName, fields: Record<string, unknown>): Record<string, unknown> {
  const allowed = new Set(ALLOWED_COLS[table]);
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.has(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    clean[k] = v;
  }
  return clean;
}

async function insertWithRetry(db: ReturnType<typeof admin>, table: TableName, clean: Record<string, unknown>) {
  let lastError: { code?: string; message?: string } | null = null;
  for (let i = 0; i < 10; i++) {
    const res = await db.from(table).insert(clean).select().single();
    if (!res.error) return { data: res.data, error: null };
    lastError = res.error;
    if (res.error.code === "PGRST204") {
      const m = res.error.message.match(/'([^']+)' column/);
      if (m && m[1] && clean[m[1]] !== undefined) {
        delete clean[m[1]];
        continue;
      }
    }
    break;
  }
  return { data: null, error: lastError };
}

async function updateWithRetry(db: ReturnType<typeof admin>, table: TableName, id: string, clean: Record<string, unknown>) {
  let lastError: { code?: string; message?: string } | null = null;
  for (let i = 0; i < 10; i++) {
    const res = await db.from(table).update(clean).eq("id", id);
    if (!res.error) return { error: null };
    lastError = res.error;
    if (res.error.code === "PGRST204") {
      const m = res.error.message.match(/'([^']+)' column/);
      if (m && m[1] && clean[m[1]] !== undefined) {
        delete clean[m[1]];
        continue;
      }
    }
    break;
  }
  return { error: lastError };
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
    const clean = cleanFields(table, fields);
    clean.user_id = fields.user_id;
    const { data, error } = await insertWithRetry(db, table, clean);
    if (error) throw new Error(error.message || "insert failed");
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
    const clean = cleanFields(table, fields);
    const { error } = await updateWithRetry(db, table, id, clean);
    if (error) throw new Error(error.message || "update failed");
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
