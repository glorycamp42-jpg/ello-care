"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/supabase";
import Link from "next/link";

export default function FamilySignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다"); return; }
    setLoading(true);
    try {
      await signUp(email, password, { name, role: "family", phone });
      router.push("/family");
    } catch (err: unknown) {
      setError((err as Error).message || "회원가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#F0F7FF] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-[#1B6FE8] flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">가족 회원가입</h1>
          <p className="text-gray-500 text-sm mt-1">Ello Family에 가입하세요</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1.5">이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="이름" required
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1.5">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com" required
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1.5">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="6자 이상" required
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>
          <div>
            <label className="block text-gray-600 text-sm font-medium mb-1.5">전화번호</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1B6FE8] focus:ring-2 focus:ring-[#1B6FE8]/20" />
          </div>

          {error && <p className="text-red-500 text-xs text-center bg-red-50 rounded-lg py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-[#1B6FE8] text-white rounded-xl text-sm font-bold shadow-md shadow-[#1B6FE8]/25 hover:bg-[#1558C0] active:scale-[0.98] transition-all disabled:opacity-50">
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="text-center mt-5 text-gray-500 text-sm">
          이미 계정이 있으신가요?{" "}
          <Link href="/family/login" className="text-[#1B6FE8] font-bold">로그인</Link>
        </p>
      </div>
    </div>
  );
}
