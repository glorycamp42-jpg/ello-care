"use client";

import { useEffect, useRef, useState } from "react";
import { ELLO } from "@/lib/ello";
import { FamilyContact } from "@/components/SafetyPage";

/* ── 문자 ──
   받은 문자 확인: 붙여넣기 / 사진 → 한국어로 "누가·무슨 내용·할 일·기한·사기 여부" → 답장 후보
   문자 보내기: 받는 사람 → 한국어로 말하기 → 영어 초안(+한국어 뜻) → [문자 앱으로 보내기] (sms: 링크, 받는사람·내용 채워짐) */

type Tab = "read" | "write";
type Explained = { from: string; summary: string; todo: string; deadline: string; scam: boolean; scamWhy: string; needsReply: boolean; replies: string[]; repliesBack: string[] };
type Draft = { text: string; back: string; subject?: string };

interface SR extends EventTarget { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string }; isFinal: boolean }; length: number } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start(): void; stop(): void; }

interface Props {
  onClose: () => void;
  contacts: FamilyContact[];
  initialTab?: Tab;
  initialIntent?: string;   // from voice: "내일 못 간다고"
  initialTo?: string;       // from voice: "딸" / "학교"
  initialIncoming?: string; // from voice/share: pasted text
}

const Card = ({ children, tone: c }: { children: React.ReactNode; tone?: "green" | "coral" | "red" }) => (
  <div className={`rounded-[22px] border-2 px-[18px] py-4 ${c === "red" ? "border-[#B42318] bg-[#FDECEC]" : c === "green" ? "border-[#1F7A47] bg-[#E8F5EE]" : c === "coral" ? "border-[#FF6B35] bg-[#FFE6D9]" : "border-[#EADFD3] bg-white"}`}>{children}</div>
);

function loadContacts(): FamilyContact[] { try { return JSON.parse(localStorage.getItem("ello-family-contacts") || "[]"); } catch { return []; } }

export default function MessagesPage({ onClose, contacts: contactsProp, initialTab = "read", initialIntent = "", initialTo = "", initialIncoming = "" }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const contacts = contactsProp.length ? contactsProp : loadContacts();

  /* read */
  const [incoming, setIncoming] = useState(initialIncoming);
  const [explained, setExplained] = useState<Explained | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* write */
  const [to, setTo] = useState<{ name: string; phone: string } | null>(null);
  const [toPhone, setToPhone] = useState("");
  const [intent, setIntent] = useState(initialIntent);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tone, setTone] = useState<"polite" | "short" | "warm">("polite");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialTo) {
      const c = contacts.find(x => x.relation.includes(initialTo) || x.name.includes(initialTo) || initialTo.includes(x.relation) || initialTo.includes(x.name));
      if (c) setTo({ name: c.relation || c.name, phone: c.phone });
    }
    if (initialTab === "write" && initialIntent) makeDraft(initialIntent, "polite");
    if (initialTab === "read" && initialIncoming) explain(initialIncoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function say(text: string) {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voiceId: ELLO.voiceId, languageCode: "ko-KR" }) });
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob()); const a = new Audio(url); audioRef.current = a; a.onended = () => URL.revokeObjectURL(url); await a.play();
    } catch {}
  }

  /* ── read: paste / photo → explain ── */
  async function pasteFromClipboard() {
    setError("");
    try {
      const t = (await navigator.clipboard.readText()).trim();
      if (!t) { setError("복사된 글이 없어요. 문자 앱에서 문자를 길게 눌러 '복사'한 뒤 다시 눌러주세요."); return; }
      setIncoming(t); explain(t);
    } catch { setError("붙여넣기 권한이 없어요. 아래 칸에 직접 붙여넣거나 사진으로 찍어주세요."); }
  }
  async function explain(text: string) {
    setBusy(true); setError(""); setExplained(null);
    try {
      const res = await fetch("/api/text-helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "explain", text }) });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExplained(data);
      say(`${data.from && data.from !== "모름" ? data.from + "에서 온 " : ""}${data.scam ? "사기로 보이는 " : ""}문자예요. ${data.summary || ""} ${data.todo && data.todo !== "없음" ? "하실 일은, " + data.todo : ""}`);
    } catch { setError("읽는 데 문제가 생겼어요. 다시 해주세요."); }
    finally { setBusy(false); }
  }
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    setImgBusy(true); setError(""); setExplained(null);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const img = new Image(); const reader = new FileReader();
        reader.onload = () => { img.onload = () => { let { width, height } = img; const MAX = 1400; if (width > MAX || height > MAX) { const s = MAX / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); } const c = document.createElement("canvas"); c.width = width; c.height = height; c.getContext("2d")!.drawImage(img, 0, 0, width, height); res(c.toDataURL("image/jpeg", 0.85)); }; img.onerror = rej; img.src = reader.result as string; };
        reader.onerror = rej; reader.readAsDataURL(file);
      });
      const res = await fetch("/api/text-helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ocr", image: dataUrl }) });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      const text = String(data.text || "").trim();
      if (!text || text.length < 5) throw new Error("no text");
      setIncoming(text); await explain(text);
    } catch { setError("글자를 읽지 못했어요. 더 밝은 곳에서 가까이 찍어주세요."); }
    finally { setImgBusy(false); }
  }

  /* ── write: speak → draft → sms: ── */
  function listenIntent() {
    if (listening) { try { recRef.current?.stop(); } catch {} return; } // onend → finish()
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (!Ctor) { setError("음성 인식이 안 돼요. 아래 칸에 적어주세요."); return; }
    const r = new Ctor(); r.lang = "ko-KR"; r.continuous = true; r.interimResults = true; recRef.current = r;
    let acc = ""; let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => { if (recRef.current !== r) return; recRef.current = null; if (timer) clearTimeout(timer); try { r.stop(); } catch {} setListening(false); if (acc.trim()) { setIntent(acc.trim()); makeDraft(acc.trim(), tone); } };
    r.onresult = (ev) => { let t = ""; for (let i = 0; i < ev.results.length; i++) { const x = ev.results[i][0].transcript.trim(); if (x) t = t.includes(x) ? t : (x.includes(t) ? x : `${t} ${x}`.trim()); } acc = t; setIntent(t); if (timer) clearTimeout(timer); timer = setTimeout(finish, 3500); };
    r.onerror = () => { if (recRef.current === r) { recRef.current = null; setListening(false); } }; r.onend = () => finish();
    r.start(); setListening(true); timer = setTimeout(finish, 10000);
  }
  async function makeDraft(text: string, t: typeof tone, prior?: string) {
    if (!text.trim()) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/text-helper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "draft", intent: text, to: to?.name || initialTo, tone: t, prior: prior || (explained ? incoming : "") }) });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      if (data.error || !data.text) throw new Error("draft");
      setDraft(data);
      say(`이렇게 보낼게요. ${data.back}`);
    } catch { setError("문장을 만들지 못했어요. 다시 말씀해 주세요."); }
    finally { setBusy(false); }
  }
  function smsHref(phone: string, body: string) {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const sep = isIOS ? "&" : "?";
    return `sms:${phone}${sep}body=${encodeURIComponent(body)}`;
  }
  function sendViaSms() {
    if (!draft) return;
    const phone = (to?.phone || toPhone).replace(/[^\d+]/g, "");
    if (!phone) { setError("받는 사람을 고르거나 번호를 넣어주세요. 번호를 모르면 '복사'해서 문자 앱에서 답장에 붙여넣으세요."); return; }
    window.location.href = smsHref(phone, draft.text);
  }
  async function copyDraft() { try { await navigator.clipboard.writeText(draft?.text || ""); setError(""); say("복사했어요. 문자나 카톡에 붙여넣으세요."); } catch {} }


  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3 pb-1.5">
        <button onClick={onClose} className="h-12 pl-2.5 pr-4 rounded-full bg-white border-2 border-[#D9CCC0] flex items-center gap-1.5 active:scale-95">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="text-[20px] font-bold text-[#2B211C]">뒤로</span>
        </button>
        <span className="text-[26px] font-bold text-[#2B211C]">문자</span>
      </div>

      {/* two tabs, huge */}
      <div className="px-4 pt-1 pb-2 grid grid-cols-2 gap-2">
        <button onClick={() => setTab("read")} className={`h-14 rounded-2xl text-[20px] font-bold border-2 ${tab === "read" ? "bg-[#2B211C] border-[#2B211C] text-white" : "bg-white border-[#D9CCC0] text-[#2B211C]"}`}>받은 문자 확인</button>
        <button onClick={() => setTab("write")} className={`h-14 rounded-2xl text-[20px] font-bold border-2 ${tab === "write" ? "bg-[#2B211C] border-[#2B211C] text-white" : "bg-white border-[#D9CCC0] text-[#2B211C]"}`}>영어로 보내기</button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 flex flex-col gap-3">
        {error && <Card tone="red"><span className="text-[20px] font-bold text-[#B42318]">{error}</span></Card>}

        {tab === "read" && (<>
          {!explained && (
            <Card><span className="text-[22px] leading-[1.4] text-[#2B211C]">문자 앱에서 문자를 <b>길게 눌러 복사</b>한 뒤 <b>붙여넣기</b>를 누르세요. 편지·고지서·스크린샷은 <b>사진</b>으로 올리세요.</span></Card>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={pasteFromClipboard} disabled={busy} className="h-[84px] rounded-[22px] bg-[#FF6B35] text-white text-[22px] font-bold active:scale-[0.98] disabled:opacity-60">붙여넣기</button>
            <button onClick={() => fileRef.current?.click()} disabled={busy || imgBusy} className="h-[84px] rounded-[22px] bg-white border-2 border-[#D9CCC0] text-[#2B211C] text-[22px] font-bold active:scale-[0.98] disabled:opacity-60">{imgBusy ? "읽는 중…" : "사진·스크린샷"}</button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </div>
          <textarea value={incoming} onChange={e => setIncoming(e.target.value)} placeholder="또는 여기에 영어 문자를 붙여넣으세요" rows={3}
            className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[18px] text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
          {incoming.trim() && !explained && !busy && <button onClick={() => explain(incoming)} className="h-16 rounded-[22px] bg-[#1F7A47] text-white text-[22px] font-bold">이 문자 읽어줘</button>}
          {busy && <p className="text-center text-[20px] font-bold text-[#5C4F48]">읽고 있어요…</p>}

          {explained && (<>
            {explained.scam ? (
              <Card tone="red"><div className="text-[24px] font-bold text-[#B42318]">⚠ 사기 같아요</div><div className="text-[20px] text-[#2B211C] mt-1">{explained.scamWhy}</div><div className="text-[20px] font-bold text-[#B42318] mt-2">답장하지 말고, 링크 누르지 마세요. 걱정되면 가족에게 전화하세요.</div></Card>
            ) : (
              <Card tone="green"><div className="text-[18px] font-bold text-[#1F7A47]">{explained.from && explained.from !== "모름" ? `${explained.from}에서 온 문자` : "받은 문자"}</div><div className="text-[24px] leading-[1.4] text-[#2B211C] mt-1">{explained.summary}</div></Card>
            )}
            {!explained.scam && explained.todo && explained.todo !== "없음" && (
              <Card tone="coral"><div className="text-[18px] font-bold text-[#C2410C]">하실 일{explained.deadline ? ` · ${explained.deadline}까지` : ""}</div><div className="text-[24px] leading-[1.4] text-[#2B211C] mt-1">{explained.todo}</div></Card>
            )}
            {!explained.scam && explained.replies?.length > 0 && (
              <Card>
                <div className="text-[18px] font-bold text-[#5C4F48] mb-2">이렇게 답장할까요? (받는 사람을 고르거나, 복사해서 붙여넣으세요)</div>
                <div className="flex flex-col gap-2">
                  {explained.replies.map((r, i) => (
                    <button key={i} onClick={() => { setDraft({ text: r, back: explained.repliesBack?.[i] || "" }); setTab("write"); }}
                      className="text-left rounded-2xl border-2 border-[#D9CCC0] bg-white px-4 py-3 active:bg-[#FFF2E8]">
                      <div className="text-[20px] font-bold text-[#2B211C]">{explained.repliesBack?.[i] || r}</div>
                      <div className="text-[16px] text-[#5C4F48] mt-0.5">{r}</div>
                    </button>
                  ))}
                  <button onClick={() => { setTab("write"); setDraft(null); }} className="h-14 rounded-2xl bg-[#FFE6D9] text-[#C2410C] text-[20px] font-bold">직접 말해서 답장 쓰기</button>
                </div>
              </Card>
            )}
            <button onClick={() => { setExplained(null); setIncoming(""); }} className="h-12 text-[18px] text-[#5C4F48] underline underline-offset-4">다른 문자 확인</button>
          </>)}
        </>)}

        {tab === "write" && (<>
          {/* to */}
          <Card>
            <div className="text-[18px] font-bold text-[#5C4F48] mb-2">누구에게</div>
            <div className="flex flex-wrap gap-2">
              {contacts.map(c => (
                <button key={c.id} onClick={() => { setTo({ name: c.relation || c.name, phone: c.phone }); setToPhone(""); }}
                  className={`h-12 px-4 rounded-full text-[18px] font-bold border-2 ${to?.phone === c.phone ? "bg-[#1F7A47] border-[#1F7A47] text-white" : "bg-white border-[#D9CCC0] text-[#2B211C]"}`}>{c.relation || c.name}</button>
              ))}
              <input value={toPhone} onChange={e => { setToPhone(e.target.value); setTo(null); }} type="tel" inputMode="tel" placeholder="또는 번호 입력"
                className="h-12 px-4 rounded-full bg-white border-2 border-[#D9CCC0] text-[18px] text-[#2B211C] w-[180px] focus:outline-none focus:border-[#FF6B35]" />
            </div>
          </Card>

          {/* what to say */}
          {!draft && (<>
            <button onClick={listenIntent} disabled={busy} className={`h-[96px] rounded-[22px] flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 ${listening ? "bg-white border-[3px] border-[#C2410C]" : "bg-[#FF6B35]"}`}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={listening ? "#C2410C" : "#fff"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="1" width="6" height="14" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" /></svg>
              <span className={`text-[24px] font-bold ${listening ? "text-[#C2410C]" : "text-white"}`}>{listening ? "듣고 있어요… (다 말하면 누르기)" : "한국어로 말하기"}</span>
            </button>
            <textarea value={intent} onChange={e => setIntent(e.target.value)} placeholder="예: 내일 병원 때문에 못 간다고 전해줘" rows={2}
              className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[20px] text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
            {intent.trim() && !listening && <button onClick={() => makeDraft(intent, tone)} disabled={busy} className="h-16 rounded-[22px] bg-[#1F7A47] text-white text-[22px] font-bold disabled:opacity-60">{busy ? "쓰고 있어요…" : "영어로 써줘"}</button>}
          </>)}

          {draft && (<>
            <Card tone="green">
              <div className="text-[18px] font-bold text-[#1F7A47]">보낼 영어 문자</div>
              <div className="text-[24px] leading-[1.4] font-bold text-[#2B211C] mt-1">{draft.text}</div>
              <div className="text-[19px] leading-[1.4] text-[#5C4F48] mt-2 border-t-2 border-[#CFE8D9] pt-2">뜻: {draft.back}</div>
            </Card>
            <div className="grid grid-cols-3 gap-2">
              {(["short", "polite", "warm"] as const).map(t => (
                <button key={t} onClick={() => { setTone(t); makeDraft(intent || draft.back, t); }} disabled={busy} className={`h-12 rounded-full text-[17px] font-bold border-2 ${tone === t ? "bg-[#2B211C] border-[#2B211C] text-white" : "bg-white border-[#D9CCC0] text-[#2B211C]"}`}>{t === "short" ? "더 짧게" : t === "polite" ? "정중하게" : "다정하게"}</button>
              ))}
            </div>
            <button onClick={sendViaSms} className="h-[84px] rounded-[22px] bg-[#1F7A47] text-white text-[24px] font-bold active:scale-[0.98] flex items-center justify-center gap-3">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              문자 앱으로 보내기
            </button>
            <p className="text-center text-[17px] text-[#5C4F48]">문자 앱이 열리면 <b>보내기</b>만 누르세요.</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyDraft} className="h-14 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[#2B211C] text-[18px] font-bold">복사 (카톡용)</button>
              <button onClick={() => { setDraft(null); setIntent(""); }} className="h-14 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[#2B211C] text-[18px] font-bold">다시 쓰기</button>
            </div>
          </>)}
        </>)}
      </div>
    </div>
  );
}
