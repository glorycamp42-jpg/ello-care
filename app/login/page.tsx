"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ── 입구 ──
   [내가 쓸게요]            → 전화번호 문자 인증 (SMS 미설정 시 이메일 코드로 자동 대체)
   [부모님 폰 설정해 드릴게요] → 자녀 계정 → /family/setup 에서 PIN·QR 발급
   시설에서 받은 번호로 시작   → 4자리 PIN (ADHC / 가족 발급)
   ?pin=1234 로 열면 바로 PIN 로그인 (QR) */

const supabase = createClient();

type Step = "entry" | "self-phone" | "self-code" | "pin";

function LoginInner() {
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("entry");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [useEmail, setUseEmail] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [pin, setPin] = useState(["", "", "", ""]);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // QR: /login?pin=1234  ·  /login?error=link when a mail link could not be verified
  useEffect(() => {
    if (params.get("error") === "link") { setError("이메일 링크로는 확인이 안 됐어요. 메일에 있는 6자리 번호를 넣어주세요."); setUseEmail(true); setStep("self-phone"); }
    const p = params.get("pin");
    if (p && /^\d{4}$/.test(p)) { setStep("pin"); setPin(p.split("")); pinLogin(p); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── self: phone OTP with email fallback ── */
  function normalizePhone(v: string): string {
    const d = v.replace(/[^\d]/g, "");
    if (v.trim().startsWith("+")) return "+" + d;
    if (d.length === 10) return "+1" + d;           // US default
    if (d.length === 11 && d.startsWith("1")) return "+" + d;
    if (d.length === 11 && d.startsWith("0")) return "+82" + d.slice(1); // KR mobile
    return "+" + d;
  }
  async function sendCode() {
    setError(""); setBusy(true);
    try {
      if (!useEmail) {
        const p = normalizePhone(phone);
        if (p.replace(/\D/g, "").length < 10) { setError("전화번호를 다시 확인해 주세요."); return; }
        const { error } = await supabase.auth.signInWithOtp({ phone: p, options: { data: { role: "elder", mode: "assistant" } } });
        if (error) {
          // SMS provider not configured on Supabase → fall back to email code
          const code = (error as { code?: string }).code || "";
          if (code === "phone_provider_disabled" || /unsupported phone provider|phone.*(disabled|not enabled)/i.test(error.message)) {
            setUseEmail(true); setNotice("문자 인증이 아직 준비 중이라 이메일로 인증 번호를 보내드릴게요.");
            return;
          }
          setError(error.message); return;
        }
        setStep("self-code");
      } else {
        const e = email.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setError("이메일을 다시 확인해 주세요."); return; }
        const { error } = await supabase.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`, data: { role: "elder", mode: "assistant" } } });
        if (error) { setError(error.message); return; }
        setStep("self-code");
      }
    } finally { setBusy(false); }
  }
  async function verifyCode() {
    setError(""); setBusy(true);
    try {
      const token = code.replace(/\D/g, "");
      const { data, error } = useEmail
        ? await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" })
        : await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token, type: "sms" });
      if (error || !data.session) { setError("인증 번호가 맞지 않아요. 다시 입력해 주세요."); return; }
      const onboarded = !!data.user?.user_metadata?.onboarded;
      window.location.href = onboarded ? "/" : "/onboarding";
    } finally { setBusy(false); }
  }

  /* ── PIN (ADHC / family-issued) ── */
  function onPinChange(i: number, v: string) {
    if (!/^\d*$/.test(v)) return;
    const next = [...pin]; next[i] = v.slice(-1); setPin(next); setError("");
    if (v && i < 3) pinRefs[i + 1].current?.focus();
    if (v && i === 3) { const full = next.join(""); if (full.length === 4) pinLogin(full); }
  }
  async function pinLogin(full: string) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/pin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: full }) });
      const data = await res.json();
      if (!data.success) { setError(data.error || "번호가 맞지 않아요."); setPin(["", "", "", ""]); pinRefs[0].current?.focus(); return; }
      const { data: otp, error } = await supabase.auth.verifyOtp({ email: data.email, token: data.token, type: "magiclink" });
      if (error || !otp.session) { setError("로그인 처리 중 문제가 생겼어요. 다시 시도해 주세요."); return; }
      try { localStorage.setItem("ello-userId", otp.user?.id || data.userId); } catch {}
      window.location.href = "/";
    } catch { setError("연결에 문제가 있어요."); }
    finally { setBusy(false); }
  }

  const Back = ({ to }: { to: Step }) => (
    <button onClick={() => { setStep(to); setError(""); setNotice(""); }} className="h-12 pl-2.5 pr-4 rounded-full bg-white border-2 border-[#D9CCC0] flex items-center gap-1.5 active:scale-95 self-start">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      <span className="text-[20px] font-bold text-[#2B211C]">뒤로</span>
    </button>
  );

  return (
    <div className="min-h-dvh max-w-app mx-auto bg-cream flex flex-col px-5 pt-6 pb-8">
      {/* Ello */}
      <div className="flex flex-col items-center gap-2 pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/characters/secretary.png?v=2" alt="엘로" className="w-[120px] h-[120px] rounded-full object-cover" />
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#FF6B35"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          <span className="text-[28px] font-bold text-[#2B211C]">Ello</span>
        </div>
      </div>

      {step === "entry" && (
        <div className="flex flex-col gap-4 pt-8">
          <p className="text-[24px] leading-[1.4] font-medium text-[#2B211C] text-center" style={{ textWrap: "pretty" }}>
            안녕하세요, 엘로예요.<br />통역하고, 일정과 약을 챙겨드려요.
          </p>
          <button onClick={() => setStep("self-phone")} className="mt-2 h-[84px] rounded-[22px] bg-[#FF6B35] text-white text-[26px] font-bold active:scale-[0.98]">
            내가 쓸게요
          </button>
          <a href="/family/login/signup?next=/family/setup" className="h-[84px] rounded-[22px] bg-[#1F7A47] text-white text-[26px] font-bold flex items-center justify-center active:scale-[0.98]">
            부모님 폰 설정해 드릴게요
          </a>
          <button onClick={() => { setStep("pin"); setTimeout(() => pinRefs[0].current?.focus(), 50); }} className="mt-4 h-14 text-[20px] font-bold text-[#5C4F48] underline underline-offset-4">
            시설에서 받은 번호로 시작
          </button>
          <a href="/family/login" className="h-12 text-[18px] font-medium text-[#5C4F48] text-center">가족 계정으로 로그인</a>
        </div>
      )}

      {step === "self-phone" && (
        <div className="flex flex-col gap-4 pt-6">
          <Back to="entry" />
          <p className="text-[24px] font-medium text-[#2B211C]">{useEmail ? "이메일을 알려주세요" : "전화번호를 알려주세요"}</p>
          {notice && <p className="text-[18px] text-[#1F7A47] font-bold">{notice}</p>}
          {useEmail ? (
            <input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
              className="h-16 px-4 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[22px] text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
          ) : (
            <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="213 555 1234"
              className="h-16 px-4 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[26px] tracking-wider text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
          )}
          <p className="text-[18px] text-[#5C4F48]">{useEmail ? "6자리 인증 번호를 이메일로 보내드려요." : "문자로 인증 번호를 보내드려요. 비밀번호는 없어요."}</p>
          {error && <p className="text-[18px] font-bold text-[#B42318]">{error}</p>}
          <button onClick={sendCode} disabled={busy} className="h-[72px] rounded-[22px] bg-[#FF6B35] text-white text-[24px] font-bold disabled:opacity-60">
            {busy ? "보내는 중…" : "인증 번호 받기"}
          </button>
          <button onClick={() => { setUseEmail(!useEmail); setError(""); setNotice(""); }} className="h-12 text-[18px] font-medium text-[#5C4F48] underline underline-offset-4">
            {useEmail ? "전화번호로 할게요" : "이메일로 할게요"}
          </button>
        </div>
      )}

      {step === "self-code" && (
        <div className="flex flex-col gap-4 pt-6">
          <Back to="self-phone" />
          <p className="text-[24px] font-medium text-[#2B211C]">{useEmail ? "이메일을 확인해 주세요" : "문자로 보낸 인증 번호를 넣어주세요"}</p>
          {useEmail && <p className="text-[18px] text-[#5C4F48]">메일에 있는 <b>6자리 번호</b>를 넣어주세요. 메일의 링크를 눌러도 돼요.</p>}
          <input type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} placeholder="123456"
            className="h-16 px-4 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[30px] tracking-[0.3em] text-center text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
          {error && <p className="text-[18px] font-bold text-[#B42318]">{error}</p>}
          <button onClick={verifyCode} disabled={busy || code.replace(/\D/g, "").length < 6} className="h-[72px] rounded-[22px] bg-[#FF6B35] text-white text-[24px] font-bold disabled:opacity-60">
            {busy ? "확인 중…" : "확인"}
          </button>
          <button onClick={sendCode} disabled={busy} className="h-12 text-[18px] font-medium text-[#5C4F48] underline underline-offset-4">번호 다시 받기</button>
        </div>
      )}

      {step === "pin" && (
        <div className="flex flex-col gap-4 pt-6">
          <Back to="entry" />
          <p className="text-[24px] font-medium text-[#2B211C]">받으신 숫자 4개를 눌러주세요</p>
          <div className="flex justify-between gap-3">
            {pin.map((d, i) => (
              <input key={i} ref={pinRefs[i]} type="tel" inputMode="numeric" maxLength={1} value={d}
                onChange={e => onPinChange(i, e.target.value)}
                onKeyDown={e => { if (e.key === "Backspace" && !pin[i] && i > 0) pinRefs[i - 1].current?.focus(); }}
                className="w-full h-[84px] rounded-2xl bg-white border-2 border-[#D9CCC0] text-[40px] font-bold text-center text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
            ))}
          </div>
          {busy && <p className="text-[18px] font-bold text-[#5C4F48]">확인하고 있어요…</p>}
          {error && <p className="text-[18px] font-bold text-[#B42318]">{error}</p>}
          <p className="text-[18px] text-[#5C4F48]">가족이나 시설에서 받은 번호예요. 모르시면 가족에게 물어보세요.</p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginInner /></Suspense>;
}
