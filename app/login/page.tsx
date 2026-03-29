"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithGoogle } from "@/lib/supabase";
import Link from "next/link";

export default function ElderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError((err as Error).message || "로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle(window.location.origin + "/");
    } catch (err: unknown) {
      setError((err as Error).message || "구글 로그인에 실패했습니다");
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#F0F7FF",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "#1B6FE8",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <span style={{ color: "white", fontSize: 32, fontWeight: 700 }}>E</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", margin: 0 }}>Ello Care</h1>
          <p style={{ fontSize: 16, color: "#888", marginTop: 6 }}>소연이와 함께해요</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <label style={{ display: "block", fontSize: 16, fontWeight: 600, color: "#444", marginBottom: 8 }}>
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            style={{
              width: "100%", padding: 14, fontSize: 16,
              background: "#fff", border: "1px solid #ddd", borderRadius: 12,
              outline: "none", boxSizing: "border-box", marginBottom: 16,
              color: "#111",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#1B6FE8"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#ddd"; }}
          />

          {/* Password */}
          <label style={{ display: "block", fontSize: 16, fontWeight: 600, color: "#444", marginBottom: 8 }}>
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
            style={{
              width: "100%", padding: 14, fontSize: 16,
              background: "#fff", border: "1px solid #ddd", borderRadius: 12,
              outline: "none", boxSizing: "border-box", marginBottom: 16,
              color: "#111",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#1B6FE8"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#ddd"; }}
          />

          {/* Error */}
          {error && (
            <p style={{
              color: "#e53e3e", fontSize: 14, textAlign: "center",
              background: "#fff5f5", borderRadius: 10, padding: "10px 12px",
              marginBottom: 16,
            }}>{error}</p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: 16, fontSize: 18, fontWeight: 700,
              background: loading ? "#7aacf0" : "#1B6FE8", color: "#fff",
              border: "none", borderRadius: 12, cursor: loading ? "default" : "pointer",
              boxShadow: "0 4px 12px rgba(27,111,232,0.25)",
              marginBottom: 0,
            }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#ddd" }} />
          <span style={{ color: "#aaa", fontSize: 14 }}>또는</span>
          <div style={{ flex: 1, height: 1, background: "#ddd" }} />
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          style={{
            width: "100%", padding: 14, fontSize: 16, fontWeight: 500,
            background: "#fff", color: "#444",
            border: "1px solid #ddd", borderRadius: 12,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          구글로 로그인
        </button>

        {/* Links */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 16, color: "#888" }}>
          계정이 없으신가요?{" "}
          <Link href="/login/signup" style={{ color: "#1B6FE8", fontWeight: 700, textDecoration: "none" }}>
            회원가입
          </Link>
        </p>
        <p style={{ textAlign: "center", marginTop: 12, fontSize: 14, color: "#aaa" }}>
          <Link href="/family/login" style={{ color: "#aaa", textDecoration: "underline" }}>
            가족 로그인은 여기
          </Link>
        </p>
      </div>
    </div>
  );
}
