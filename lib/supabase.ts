import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("[supabase] Env vars not set");
    return null;
  }
  _supabase = createClient(url, key);
  return _supabase;
}

/* ── Auth Functions ── */

export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, metadata: { name: string; role: string; phone?: string }) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle(redirectTo: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export async function getUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function getUserRole(): Promise<string | null> {
  const user = await getUser();
  return user?.user_metadata?.role || null;
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
  Supabase SQL:

  -- Profiles table (optional, for extended user data)
  CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    role TEXT DEFAULT 'elder',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
*/
