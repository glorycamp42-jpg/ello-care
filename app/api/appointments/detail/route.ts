import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ appointment: null });

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ appointment: null });

  const { data, error } = await admin
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[appointments/detail] Error:", error.message);
    return NextResponse.json({ appointment: null });
  }

  return NextResponse.json({ appointment: data });
}
