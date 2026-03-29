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
  if (error) {
    if (error.message?.includes("Email not confirmed")) {
      throw new Error("이메일 인증이 필요합니다. Supabase 대시보드에서 이메일 인증을 비활성화하거나, 관리자에게 문의하세요.");
    }
    if (error.message?.includes("Invalid login credentials")) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    throw error;
  }
  return data;
}

export async function signUp(email: string, password: string, metadata: { name: string; role: string; phone?: string }) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: undefined, // skip email confirmation redirect
    },
  });
  if (error) {
    // If user exists but unconfirmed, try signing in directly
    if (error.message?.includes("already registered")) {
      throw new Error("이미 가입된 이메일입니다. 로그인을 시도해주세요.");
    }
    throw error;
  }
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
