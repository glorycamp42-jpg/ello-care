"use client";

import { useEffect, useRef, useState } from "react";
import { ELLO } from "@/lib/ello";

/* ── 통역 화면 ──
   병원·약국·관공서에서 쓰는 대면 통역. 누가 말할지 사람이 누른다 (타이머로 끝나지 않음).
   [내가 말하기] → 한국어 인식 → 상대방 언어로 번역해 크게 보여주고 소리로 읽어줌
   [상대방 말하기] → 상대방 언어 인식 → 한국어로 번역해 크게 보여주고 소리로 읽어줌 */

type Who = "user" | "other";

const LANGS: { code: string; label: string; speech: string }[] = [
  { code: "en", label: "영어", speech: "en-US" },
  { code: "es", label: "스페인어", speech: "es-ES" },
  { code: "zh", label: "중국어", speech: "zh-CN" },
  { code: "vi", label: "베트남어", speech: "vi-VN" },
  { code: "ja", label: "일본어", speech: "ja-JP" },
];

interface SR extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string }; isFinal: boolean; length: number }; length: number } }) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}

interface Props {
  onClose: () => void;
  initialLang?: string;
}

export default function InterpreterPage({ onClose, initialLang = "en" }: Props) {
  const [langCode, setLangCode] = useState(initialLang);
  const [listening, setListening] = useState<Who | null>(null);
  const [live, setLive] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<{ original: string; translated: string } | null>(null);   // 내가 한 말 → 상대 언어
  const [theirs, setTheirs] = useState<{ original: string; translated: string } | null>(null); // 상대 말 → 한국어
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");

  const recRef = useRef<SR | null>(null);
  const accRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<{ speaker: string; original: string; translated: string }[]>([]);
  const lang = LANGS.find(l => l.code === langCode) || LANGS[0];

  useEffect(() => () => { stopListening(false); stopAudio(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stopAudio() {
    if (audioRef.current) { audioRef.current.pause(); const s = audioRef.current.src; audioRef.current = null; if (s.startsWith("blob:")) URL.revokeObjectURL(s); }
    setSpeaking(false);
  }
  async function speak(text: string, speechLang: string) {
    stopAudio();
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voiceId: ELLO.voiceId, languageCode: speechLang }) });
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url); audioRef.current = audio;
      audio.onplay = () => setSpeaking(true);
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
    } catch { audioRef.current = null; setSpeaking(false); }
  }

  /* ── listening: tap to start, tap again (or 4s silence after speech) to finish ── */
  function startListening(who: Who) {
    if (listening) { stopListening(true); return; }
    stopAudio();
    const Ctor = typeof window !== "undefined" ? ((window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition) : undefined;
    if (!Ctor) { setError("이 브라우저는 음성 인식을 지원하지 않아요."); return; }
    const r = new Ctor();
    r.lang = who === "user" ? "ko-KR" : lang.speech; r.continuous = true; r.interimResults = true;
    recRef.current = r; accRef.current = ""; setLive(""); setError("");
    const arm = (ms: number) => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { timerRef.current = null; stopListening(true); }, ms); };
    r.onresult = (ev) => {
      if (recRef.current !== r) return;
      let finalText = ""; let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const t = (ev.results[i][0]?.transcript || "").trim(); if (!t) continue;
        if (ev.results[i].isFinal) { if (!finalText) finalText = t; else if (t.includes(finalText)) finalText = t; else if (!finalText.includes(t)) finalText = `${finalText} ${t}`; }
        else interim = t;
      }
      accRef.current = finalText;
      setLive((finalText + (interim && !finalText.endsWith(interim) ? " " + interim : "")).trim());
      arm(4000); // 4s of silence after speech = done
    };
    r.onerror = () => { if (recRef.current === r) stopListening(false); };
    r.onend = () => { if (recRef.current === r) stopListening(true); };
    r.start(); setListening(who);
    arm(12000); // up to 12s to start talking
  }
  function stopListening(send: boolean) {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const r = recRef.current; recRef.current = null;
    try { r?.stop(); } catch {}
    const who = listening; const text = accRef.current.trim(); accRef.current = "";
    setListening(null);
    if (send && text && who) translate(text, who); else setLive("");
  }

  async function translate(text: string, who: Who) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interpreterMode: true, messages: [{ role: "user", content: text }], targetLang: langCode, speakerRole: who, history: historyRef.current }),
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      if (data.exit && !data.forOther && !data.forUser) {
        setError("끝내려면 왼쪽 위 '끝내기'를 눌러 주세요.");
        return;
      }
      if (who === "user") {
        const translated = data.forOther || "";
        if (!translated) throw new Error("no translation");
        historyRef.current.push({ speaker: "user", original: text, translated });
        setMine({ original: text, translated });
        await speak(translated, lang.speech);
      } else {
        const translated = data.forUser || "";
        if (!translated) throw new Error("no translation");
        historyRef.current.push({ speaker: "other", original: text, translated });
        setTheirs({ original: text, translated });
        await speak(translated, "ko-KR");
      }
    } catch {
      setError("번역이 안 됐어요. 다시 한 번 말씀해 주세요.");
    } finally { setBusy(false); setLive(""); }
  }

  const micIcon = (color: string) => <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="1" width="6" height="14" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" /></svg>;

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-1.5">
        <button onClick={() => { stopListening(false); stopAudio(); onClose(); }} className="h-12 pl-2.5 pr-4 rounded-full bg-white border-2 border-[#D9CCC0] flex items-center gap-1.5 active:scale-95">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="text-[20px] font-bold text-[#2B211C]">끝내기</span>
        </button>
        <span className="text-[26px] font-bold text-[#2B211C]">통역</span>
      </div>

      {/* language */}
      <div className="px-4 pt-1 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {LANGS.map(l => (
          <button key={l.code} onClick={() => !listening && setLangCode(l.code)}
            className={`h-12 px-4 rounded-full text-[18px] font-bold border-2 shrink-0 ${l.code === langCode ? "bg-[#1F7A47] border-[#1F7A47] text-white" : "bg-white border-[#D9CCC0] text-[#2B211C]"}`}>
            {l.label}
          </button>
        ))}
      </div>

      {/* transcripts */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 flex flex-col gap-3">
        {/* 상대방 → 한국어 */}
        <div className={`rounded-[22px] border-2 p-4 ${listening === "other" ? "border-[#1F7A47] bg-[#E8F5EE]" : "border-[#EADFD3] bg-white"}`}>
          <div className="text-[18px] font-bold text-[#1F7A47] mb-1">상대방 ({lang.label}) → 한국어</div>
          {listening === "other" ? (
            <div className="text-[24px] leading-[1.4] text-[#2B211C] min-h-[40px]">{live || <span className="text-[#1F7A47]">듣고 있어요…</span>}</div>
          ) : theirs ? (
            <>
              <div className="text-[26px] leading-[1.35] font-bold text-[#2B211C]">{theirs.translated}</div>
              <div className="text-[17px] text-[#5C4F48] mt-1">{theirs.original}</div>
            </>
          ) : (
            <div className="text-[22px] text-[#5C4F48]">상대방이 말하면 한국어로 보여드려요</div>
          )}
        </div>

        {/* 나 → 상대방 언어 */}
        <div className={`rounded-[22px] border-2 p-4 ${listening === "user" ? "border-[#FF6B35] bg-[#FFE6D9]" : "border-[#EADFD3] bg-white"}`}>
          <div className="text-[18px] font-bold text-[#C2410C] mb-1">나 (한국어) → {lang.label}</div>
          {listening === "user" ? (
            <div className="text-[24px] leading-[1.4] text-[#2B211C] min-h-[40px]">{live || <span className="text-[#C2410C]">말씀하세요…</span>}</div>
          ) : mine ? (
            <>
              <div className="text-[26px] leading-[1.35] font-bold text-[#2B211C]">{mine.translated}</div>
              <div className="text-[17px] text-[#5C4F48] mt-1">{mine.original}</div>
            </>
          ) : (
            <div className="text-[22px] text-[#5C4F48]">말씀하시면 {lang.label}로 바꿔서 들려드려요</div>
          )}
        </div>

        {(busy || speaking || error) && (
          <div className={`text-center text-[20px] font-bold ${error ? "text-[#B42318]" : "text-[#5C4F48]"}`}>
            {error || (busy ? "번역하고 있어요…" : "읽어주고 있어요")}
          </div>
        )}
      </div>

      {/* two big buttons: who speaks */}
      <div className="px-4 pt-3 pb-5 grid grid-cols-2 gap-3">
        <button onClick={() => startListening("user")} disabled={busy || (listening !== null && listening !== "user")}
          className={`h-[112px] rounded-[22px] flex flex-col items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-40 ${listening === "user" ? "bg-white border-[3px] border-[#C2410C]" : "bg-[#FF6B35]"}`}>
          {micIcon(listening === "user" ? "#C2410C" : "#FFFFFF")}
          <span className={`text-[22px] font-bold ${listening === "user" ? "text-[#C2410C]" : "text-white"}`}>{listening === "user" ? "다 말했어요" : "내가 말하기"}</span>
        </button>
        <button onClick={() => startListening("other")} disabled={busy || (listening !== null && listening !== "other")}
          className={`h-[112px] rounded-[22px] flex flex-col items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-40 ${listening === "other" ? "bg-white border-[3px] border-[#1F7A47]" : "bg-[#1F7A47]"}`}>
          {micIcon(listening === "other" ? "#1F7A47" : "#FFFFFF")}
          <span className={`text-[22px] font-bold ${listening === "other" ? "text-[#1F7A47]" : "text-white"}`}>{listening === "other" ? "Done" : "상대방 말하기"}</span>
        </button>
      </div>
    </div>
  );
}
