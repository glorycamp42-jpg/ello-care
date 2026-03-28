import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET - list all memories
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ memories: [] });
  }

  try {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[memories] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: data || [] });
  } catch (err) {
    console.error("[memories] GET unhandled:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST - create a memory
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const { date, time, content, user_id } = await req.json();

    if (!date || !content) {
      return NextResponse.json({ error: "date and content required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("memories")
      .insert({ date, time: time || "", content, user_id: user_id || "default" })
      .select()
      .single();

    if (error) {
      console.error("[memories] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[memories] Saved: ${date} ${time} - ${content}`);
    return NextResponse.json({ memory: data });
  } catch (err) {
    console.error("[memories] POST unhandled:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE - delete a memory by id
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { error } = await supabase.from("memories").delete().eq("id", id);

    if (error) {
      console.error("[memories] DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[memories] DELETE unhandled:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
