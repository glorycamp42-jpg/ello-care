"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/supabase";
import Link from "next/link";

export default function ElderSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다"); return; }
    setLoading(true);
    try {
      await signUp(email, password, { name, role: "elder" });
      router.push("/");
    } catch (err: unknown) {
      setError((err as Error).message || "회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#F0F7FF] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1B6FE8] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
          <p className="text-gray-500 text-base mt-1">소연이와 함께 시작해요</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-lg font-medium mb-2">이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요" required
              className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>
          <div>
            <label className="block text-gray-700 text-lg font-medium mb-2">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com" required
              className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>
          <div>
            <label className="block text-gray-700 text-lg font-medium mb-2">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상 입력하세요" required
              className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 rounded-xl py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-[#1B6FE8] text-white rounded-2xl text-lg font-bold shadow-md shadow-[#1B6FE8]/25 hover:bg-[#1558C0] active:scale-[0.98] transition-all disabled:opacity-50">
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-base">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-[#1B6FE8] font-bold">로그인</Link>
        </p>
      </div>
    </div>
  );
}
