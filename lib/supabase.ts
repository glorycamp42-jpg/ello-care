import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set");
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

export interface Memory {
  id: string;
  user_id: string;
  date: string;
  time: string;
  content: string;
  created_at: string;
}

/*
  Supabase SQL to create the memories table:

  CREATE TABLE memories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow all" ON memories FOR ALL USING (true) WITH CHECK (true);
*/
