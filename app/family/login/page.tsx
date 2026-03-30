"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FamilyLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }

    // Lookup role from users table
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = userData?.role || data.user.user_metadata?.role || "family";

    if (role === "elder") {
      window.location.href = "/";
    } else {
      window.location.href = "/family";
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-dvh bg-[#F0F7FF] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-[#1B6FE8] flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Ello Family</h1>
          <p className="text-gray-500 text-sm mt-1">가족 돌봄 대시보드</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1.5">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1.5">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>

          {error && <p className="text-red-500 text-xs text-center bg-red-50 rounded-lg py-2">{error}</p>}

          <button type="button" onClick={handleLogin} disabled={loading}
            className="w-full py-3 bg-[#1B6FE8] text-white rounded-xl text-sm font-bold shadow-md shadow-[#1B6FE8]/25 hover:bg-[#1558C0] active:scale-[0.98] transition-all disabled:opacity-50">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" /><span className="text-gray-400 text-xs">또는</span><div className="flex-1 h-px bg-gray-200" />
        </div>

        <button onClick={handleGoogle}
          className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          구글로 로그인
        </button>

        <p className="text-center mt-5 text-gray-500 text-sm">
          계정이 없으신가요?{" "}
          <Link href="/family/login/signup" className="text-[#1B6FE8] font-bold">회원가입</Link>
        </p>
        <p className="text-center mt-2 text-gray-400 text-xs">
          <Link href="/login" className="underline">어르신 로그인은 여기</Link>
        </p>
      </div>
    </div>
  );
}
