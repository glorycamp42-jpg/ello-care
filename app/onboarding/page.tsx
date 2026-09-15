"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ELLO } from "@/lib/ello";
import { saveLang, LangCode } from "@/lib/i18n";

/* ── 엘로가 말로 하는 온보딩 (본인 사용자, 1분) ──
   1) 이름   — 말하거나 타이핑
   2) 목적   — [병원·관공서 통역] [일정이랑 약 챙기기] [둘 다]
   3) 언어   — 내가 쓰는 언어 (통역 상대 언어와는 별개)
   저장: auth user_metadata {name, goal, ui_lang, mode:'assistant', onboarded:true} + users 테이블 */

type Step = "name" | "goal" | "lang" | "done";
const GOALS = [
  { id: "interpret", label: "병원·관공서에서 통역", hint: "영어를 대신 말해드려요" },
  { id: "schedule", label: "일정이랑 약 챙기기", hint: "잊지 않게 먼저 알려드려요" },
  { id: "both", label: "둘 다", hint: "" },
];
const UI_LANGS: { code: LangCode; label: string }[] = [
  { code: "ko", label: "한국어" }, { code: "en", label: "English" }, { code: "es", label: "Español" },
  { code: "zh", label: "中文" }, { code: "vi", label: "Tiếng Việt" }, { code: "ja", label: "日本語" },
];

interface SR extends EventTarget { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string }; isFinal: boolean }; length: number } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void; }

export default function OnboardingPage() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [uiLang, setUiLang] = useState<LangCode>("ko");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef<SR | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<Step>>(new Set());

  // already onboarded → home
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = "/login"; return; }
      if (data.user.user_metadata?.role === "family") { window.location.href = "/family"; return; }
      if (data.user.user_metadata?.onboarded) window.location.href = "/";
      const n = data.user.user_metadata?.name; if (n) setName(n);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function say(text: string) {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voiceId: ELLO.voiceId, languageCode: "ko-KR" }) });
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      const a = new Audio(url); audioRef.current = a;
      a.onended = () => URL.revokeObjectURL(url);
      await a.play();
    } catch {}
  }
  // Ello speaks each step once (first one needs a tap because of autoplay rules — the mic tap covers it)
  useEffect(() => {
    if (spokenRef.current.has(step)) return; spokenRef.current.add(step);
    if (step === "goal") say("반가워요. 주로 뭘 도와드릴까요?");
    if (step === "lang") say("어떤 언어로 말씀하세요?");
    if (step === "done") say(`${name} 님, 준비 끝났어요. 이제 마이크를 누르고 뭐든 말씀하세요.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function listenName() {
    if (listening) { try { recRef.current?.stop(); } catch {} setListening(false); return; }
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (!Ctor) { setError("음성 인식이 안 되는 브라우저예요. 아래에 이름을 적어주세요."); return; }
    say("안녕하세요, 엘로예요. 이름이 어떻게 되세요?");
    const r = new Ctor(); r.lang = "ko-KR"; r.continuous = false; r.interimResults = true; recRef.current = r;
    r.onresult = (ev) => {
      let t = ""; for (let i = 0; i < ev.results.length; i++) t = ev.results[i][0].transcript;
      // "저는 김영자예요" → 김영자
      const cleaned = t.replace(/^(저는|나는|내 이름은|제 이름은)\s*/, "").replace(/(이에요|예요|입니다|이야|야|라고 해요|라고 합니다)\.?$/, "").trim();
      setName(cleaned || t.trim());
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start(); setListening(true);
  }

  async function finish(lang: LangCode) {
    setBusy(true); setError("");
    try {
      const cleanName = name.trim().slice(0, 30);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { error: e1 } = await supabase.auth.updateUser({ data: { name: cleanName, full_name: cleanName, goal, ui_lang: lang, mode: "assistant", role: "elder", onboarded: true } });
      if (e1) throw e1;
      await supabase.from("users").update({ full_name: cleanName, goal, ui_lang: lang, mode: "assistant", onboarded_at: new Date().toISOString() }).eq("id", user.id);
      saveLang(lang);
      try { localStorage.setItem("ello-font-scale", "1"); } catch {}
      setStep("done");
    } catch (e) {
      setError("저장이 안 됐어요. 다시 눌러주세요."); console.error(e);
    } finally { setBusy(false); }
  }

  const Bubble = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-white rounded-[22px] rounded-bl-md px-[18px] py-4 border-2 border-[#EADFD3] text-[24px] leading-[1.4] font-medium text-[#2B211C]" style={{ textWrap: "pretty" }}>{children}</div>
  );

  return (
    <div className="min-h-dvh max-w-app mx-auto bg-cream flex flex-col px-5 pt-6 pb-8 gap-4">
      <div className="flex flex-col items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/characters/secretary.png?v=2" alt="엘로" className="w-[104px] h-[104px] rounded-full object-cover" />
        <span className="text-[20px] font-bold text-[#2B211C]">엘로</span>
      </div>

      {step === "name" && (<>
        <Bubble>안녕하세요, 엘로예요. 이름이 어떻게 되세요?</Bubble>
        <button onClick={listenName} className={`h-[96px] rounded-[22px] flex items-center justify-center gap-3 active:scale-[0.98] ${listening ? "bg-white border-[3px] border-[#C2410C]" : "bg-[#FF6B35]"}`}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={listening ? "#C2410C" : "#fff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="1" width="6" height="14" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" /></svg>
          <span className={`text-[24px] font-bold ${listening ? "text-[#C2410C]" : "text-white"}`}>{listening ? "듣고 있어요…" : "누르고 이름 말하기"}</span>
        </button>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="또는 여기에 적어주세요"
          className="h-16 px-4 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[24px] text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
        {error && <p className="text-[18px] font-bold text-[#B42318]">{error}</p>}
        <button onClick={() => name.trim() && setStep("goal")} disabled={!name.trim()} className="h-[72px] rounded-[22px] bg-[#1F7A47] text-white text-[24px] font-bold disabled:opacity-40">
          {name.trim() ? `${name.trim()} 님, 다음` : "다음"}
        </button>
      </>)}

      {step === "goal" && (<>
        <Bubble>{name} 님, 반가워요. 주로 뭘 도와드릴까요?</Bubble>
        {GOALS.map(g => (
          <button key={g.id} onClick={() => { setGoal(g.id); setStep("lang"); }}
            className="h-[84px] rounded-[22px] bg-white border-2 border-[#D9CCC0] px-5 text-left active:bg-[#FFF2E8]">
            <div className="text-[24px] font-bold text-[#2B211C]">{g.label}</div>
            {g.hint && <div className="text-[17px] text-[#5C4F48]">{g.hint}</div>}
          </button>
        ))}
      </>)}

      {step === "lang" && (<>
        <Bubble>어떤 언어로 말씀하세요?</Bubble>
        <div className="grid grid-cols-2 gap-3">
          {UI_LANGS.map(l => (
            <button key={l.code} onClick={() => { setUiLang(l.code); finish(l.code); }} disabled={busy}
              className={`h-[72px] rounded-[22px] border-2 text-[22px] font-bold active:scale-[0.98] disabled:opacity-60 ${uiLang === l.code ? "bg-[#1F7A47] border-[#1F7A47] text-white" : "bg-white border-[#D9CCC0] text-[#2B211C]"}`}>
              {l.label}
            </button>
          ))}
        </div>
        {error && <p className="text-[18px] font-bold text-[#B42318]">{error}</p>}
        <p className="text-[17px] text-[#5C4F48]">통역할 때 상대방 언어는 따로 고를 수 있어요.</p>
      </>)}

      {step === "done" && (<>
        <Bubble>{name} 님, 준비 끝났어요. 이제 마이크를 누르고 뭐든 말씀하세요.</Bubble>
        <div className="text-[20px] text-[#5C4F48] leading-[1.5]">
          예: &quot;내일 두 시 병원&quot; · &quot;혈압약 아침 8시&quot; · &quot;통역해줘&quot; · &quot;딸 번호 저장해줘&quot;
        </div>
        <button onClick={() => { window.location.href = "/"; }} className="h-[84px] rounded-[22px] bg-[#FF6B35] text-white text-[26px] font-bold active:scale-[0.98]">시작하기</button>
      </>)}
    </div>
  );
}
