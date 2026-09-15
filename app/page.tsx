"use client";

import { useState, useRef, useEffect } from "react";
import CharacterAvatar from "@/components/CharacterAvatar";
import RemindersPage from "@/components/RemindersPage";
import SafetyPage, { findContactByKeyword, FamilyContact } from "@/components/SafetyPage";
import HealthWalletPage from "@/components/HealthWalletPage";
import MedicationPage, { loadMeds, saveMeds } from "@/components/MedicationPage";
import SettingsPage from "@/components/SettingsPage";
import InterpreterPage from "@/components/InterpreterPage";
import { createClient } from "@/lib/supabase/client";
import { startGPSTracking, stopGPSTracking } from "@/lib/gps-tracker";
import { getSavedLang } from "@/lib/i18n";
import { ELLO, ELLO_GREETING, FONT_STEPS, FONT_LABELS, applyFontScale, loadFontIdx, saveFontIdx } from "@/lib/ello";

/* ── Web Speech API types ── */
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
interface SpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}
interface SpeechRecognitionResultEvent extends Event { results: SpeechRecognitionResultList; resultIndex: number; }
interface SpeechRecognitionResultList { [i: number]: SpeechRecognitionResult; length: number; }
interface SpeechRecognitionResult { [i: number]: SpeechRecognitionAlternative; length: number; isFinal: boolean; }
interface SpeechRecognitionAlternative { transcript: string; confidence: number; }

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: { base64: string; mediaType: string; dataUrl: string };
}

interface TodayItem { time: string; label: string; kind: "appointment" | "med" }

/* "통역해줘" / "영어로 말해줘" by voice → opens the interpreter screen (no hidden mode) */
const INTERPRET_TRIGGERS = /통역|영어로 (해줘|말해|얘기해|대화해)|스페인어로|중국어로|일본어로|베트남어로/i;
function detectTargetLang(text: string): string {
  if (/스페인어|스페니시/.test(text)) return "es";
  if (/중국어|중국말/.test(text)) return "zh";
  if (/일본어|일본말/.test(text)) return "ja";
  if (/베트남어|베트남말/.test(text)) return "vi";
  return "en";
}

function loadContacts(): FamilyContact[] {
  try { const raw = localStorage.getItem("ello-family-contacts"); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveContacts(list: FamilyContact[]) {
  try { localStorage.setItem("ello-family-contacts", JSON.stringify(list)); } catch {}
}
/* What the phone knows — sent with every message so 엘로 can act on it */
function buildClientContext() {
  return {
    contacts: loadContacts().map(c => ({ name: c.name, relation: c.relation })),
    medications: loadMeds().filter(m => m.enabled).map(m => ({ name: m.name, times: m.times })),
    fontSize: FONT_LABELS[loadFontIdx()],
  };
}
type ClientAction = { type: string } & Record<string, unknown>;
function todayLocalISO(): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function Home() {
  const lang = getSavedLang(); // ko by default; language selection screen removed

  /* ── state ── */
  const [userId, setUserId] = useState("default");
  const [userName, setUserName] = useState("어르신");
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastAssistantText, setLastAssistantText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [today, setToday] = useState<TodayItem[]>([]);
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [userCity, setUserCity] = useState("Los Angeles");
  const [appointmentToast, setAppointmentToast] = useState(false);
  const [textInputOn, setTextInputOn] = useState(false);
  const [bigFont, setBigFont] = useState(false);
  const [photoHint, setPhotoHint] = useState(false); // 엘로 asked the user to take a photo → pulse the 사진 button

  const [showSettings, setShowSettings] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showHealthWallet, setShowHealthWallet] = useState(false);
  const [showMedications, setShowMedications] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showInterpreter, setShowInterpreter] = useState<string | null>(null); // target lang code when open

  /* refs */
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const restoredRef = useRef(false);
  const accumulatedTranscriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SILENCE_MS = 2800;
  const FIRST_SPEECH_MS = 8000;

  /* ── boot: auth, font scale, contacts, location ── */
  useEffect(() => {
    applyFontScale(FONT_STEPS[loadFontIdx()]);
    setBigFont(loadFontIdx() > 0);
    setContacts(loadContacts());
    try { setTextInputOn(localStorage.getItem("ello-text-input") === "1"); } catch {}

    const sb = createClient();
    const tryGetUser = async (attempt = 1): Promise<void> => {
      const { data: { session } } = await sb.auth.getSession();
      const user = session?.user || (await sb.auth.getUser()).data.user;
      if (user?.id) {
        setUserId(user.id);
        const n = user.user_metadata?.name || user.user_metadata?.full_name;
        if (n) setUserName(`${n} 님`);
        return;
      }
      if (attempt < 3) { await new Promise(r => setTimeout(r, 1000)); return tryGetUser(attempt + 1); }
      window.location.href = "/login";
    };
    tryGetUser().catch(() => { window.location.href = "/login"; });

    try {
      const savedLoc = localStorage.getItem("ello-user-location");
      if (savedLoc) { const loc = JSON.parse(savedLoc); if (loc.city) setUserCity(loc.city); }
      else requestGeolocation();
    } catch { requestGeolocation(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`, { headers: { "User-Agent": "ElloCare/1.0" } });
        if (res.ok) {
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.county || "Los Angeles";
          localStorage.setItem("ello-user-location", JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, city }));
          setUserCity(city);
        }
      } catch {}
    }, () => {}, { enableHighAccuracy: false, timeout: 10000 });
  }

  /* ── GPS sharing for the family app ── */
  useEffect(() => {
    if (userId === "default") return;
    startGPSTracking(userId);
    return () => stopGPSTracking();
  }, [userId]);

  /* ── today card: appointments (DB) + medication times (device) ── */
  async function loadToday() {
    if (userId === "default") return;
    const items: TodayItem[] = [];
    try {
      const res = await fetch(`/api/appointments?userId=${userId}`);
      const data = await res.json();
      const d = todayLocalISO();
      for (const a of (data.appointments || []) as { title: string; scheduled_at: string; status?: string }[]) {
        if (!a.scheduled_at?.startsWith(d)) continue;
        if (a.status && a.status !== "upcoming") continue;
        const m = a.scheduled_at.match(/T(\d{2}):(\d{2})/);
        items.push({ time: m ? `${m[1]}:${m[2]}` : "", label: a.title, kind: "appointment" });
      }
    } catch {}
    try {
      for (const med of loadMeds()) {
        if (!med.enabled) continue;
        for (const t of med.times) items.push({ time: t, label: `${med.name} 약`, kind: "med" });
      }
    } catch {}
    items.sort((a, b) => a.time.localeCompare(b.time));
    // show what is still ahead today first; if nothing is ahead, show the day's list
    const now = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const ahead = items.filter(i => i.time >= now);
    setToday((ahead.length > 0 ? ahead : items).slice(0, 3));
  }
  useEffect(() => { loadToday(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId, showReminders, showMedications]);

  /* ── restore last 24h or greet ── */
  useEffect(() => {
    if (userId === "default" || restoredRef.current) return;
    restoredRef.current = true;
    fetch(`/api/conversations?userId=${userId}`)
      .then(r => r.json())
      .then(async (data) => {
        const restored: Message[] = (data.messages || []).map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (restored.length > 0) {
          setMessages(restored);
          const lastA = [...restored].reverse().find(m => m.role === "assistant");
          setLastAssistantText(lastA?.content || "");
          return;
        }
        const greeting = await generateGreeting();
        setMessages([{ role: "assistant", content: greeting }]);
        setLastAssistantText(greeting);
        playTTS(greeting);
      })
      .catch(() => { setMessages([{ role: "assistant", content: ELLO_GREETING }]); setLastAssistantText(ELLO_GREETING); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function generateGreeting(): Promise<string> {
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "안녕" }], persona: ELLO.id, langPrompt: lang.systemPrompt, charName: ELLO.name, userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, greetingMode: true, clientContext: buildClientContext() }),
      });
      const data = await res.json();
      if (data.text && !data.error && data.text.length > 5) return data.text;
    } catch {}
    return ELLO_GREETING;
  }

  /* ── TTS ── */
  function stopCurrentAudio() {
    if (ttsAbortRef.current) { ttsAbortRef.current.abort(); ttsAbortRef.current = null; }
    if (audioRef.current) {
      audioRef.current.pause();
      const src = audioRef.current.src;
      audioRef.current.onplay = null; audioRef.current.onended = null; audioRef.current.onerror = null;
      audioRef.current = null;
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    }
    setIsSpeaking(false);
  }
  async function playTTS(text: string, voiceLang?: string) {
    stopCurrentAudio();
    const controller = new AbortController();
    ttsAbortRef.current = controller;
    try {
      const res = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: ELLO.voiceId, languageCode: voiceLang || lang.speechLang }),
        signal: controller.signal,
      });
      if (controller.signal.aborted || !res.ok) return;
      const blob = await res.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // autoplay blocked (no gesture yet) or playback error: forget the audio so the next bubble tap plays
      if (audioRef.current) { const src = audioRef.current.src; audioRef.current = null; if (src.startsWith("blob:")) URL.revokeObjectURL(src); }
      setIsSpeaking(false);
    }
  }
  function onBubbleTap() {
    if (isSpeaking || audioRef.current) stopCurrentAudio();
    else if (lastAssistantText) playTTS(lastAssistantText);
  }

  /* ── chat ── */
  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;
    setLiveTranscript("");

    if (INTERPRET_TRIGGERS.test(text)) {
      setInput(""); setShowInterpreter(detectTargetLang(text));
      return;
    }

    // "딸한테 전화해줘"
    const callMatch = text.match(/(딸|아들|손자|손녀|며느리|사위|엄마|아빠|형|누나|동생|언니|오빠)(한테|에게|이랑|랑|)?.*(전화|연락)\s*(해|걸|해줘|해 줘|좀|하고 싶|하자|할래)/);
    if (callMatch) {
      const c = findContactByKeyword(callMatch[1]);
      if (c) { window.location.href = `tel:${c.phone}`; return; }
    }

    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...messagesRef.current, userMsg];
    setMessages(newMsgs); setInput(""); setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs, persona: ELLO.id, langPrompt: lang.systemPrompt, charName: ELLO.name, userCity, userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, clientContext: buildClientContext() }),
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      const reply = data.error ? "죄송해요, 잠시 문제가 있었어요. 다시 말씀해 주세요." : data.text;
      if (data.appointmentSaved) { setAppointmentToast(true); setTimeout(() => setAppointmentToast(false), 3000); }
      const actions: ClientAction[] = Array.isArray(data.actions) ? data.actions : [];
      const wantsRepeat = actions.some(a => a.type === "repeat_last") && !!lastAssistantText;
      if (wantsRepeat) {
        // "다시 말해줘": read the previous answer again instead of a new sentence
        setMessages([...newMsgs, { role: "assistant", content: lastAssistantText }]);
        playTTS(lastAssistantText);
      } else {
        setMessages([...newMsgs, { role: "assistant", content: reply }]);
        setLastAssistantText(reply);
        if (!data.error) playTTS(reply);
      }
      loadToday(); // appointments may have been added/cancelled, meds may change below
      for (const a of actions) runAction(a);
    } catch {
      const reply = "연결에 문제가 있어요. 잠시 후 다시 말씀해 주세요.";
      setMessages([...newMsgs, { role: "assistant", content: reply }]); setLastAssistantText(reply);
    } finally { setIsLoading(false); }
  }

  /* ── 엘로 operates the app: actions decided by the model, executed here ── */
  function runAction(a: ClientAction) {
    switch (a.type) {
      case "open_interpreter":
        setShowInterpreter(typeof a.language === "string" && a.language ? a.language : "en");
        break;
      case "call_family": {
        const who = String(a.who || "");
        const c = findContactByKeyword(who) || (contacts.length === 1 ? contacts[0] : null);
        if (c) setTimeout(() => { window.location.href = `tel:${c.phone}`; }, 800); // let the confirmation start playing first
        break;
      }
      case "add_family_contact": {
        const phone = String(a.phone || "").replace(/[^\d+]/g, "");
        if (!phone) break;
        const list = loadContacts();
        const relation = String(a.relation || ""); const name = String(a.name || relation || "가족");
        const existing = list.findIndex(x => x.phone.replace(/[^\d]/g, "") === phone.replace(/[^\d]/g, ""));
        const entry: FamilyContact = { id: existing >= 0 ? list[existing].id : `c_${Date.now()}`, name, relation, phone };
        if (existing >= 0) list[existing] = entry; else list.push(entry);
        saveContacts(list); setContacts(list);
        break;
      }
      case "add_medication_reminder": {
        const name = String(a.name || "").trim();
        const times = (Array.isArray(a.times) ? a.times : []).map(String).filter(t => /^\d{2}:\d{2}$/.test(t));
        if (!name || times.length === 0) break;
        const meds = loadMeds();
        const i = meds.findIndex(m => m.name === name);
        if (i >= 0) meds[i] = { ...meds[i], times: Array.from(new Set([...meds[i].times, ...times])).sort(), enabled: true };
        else meds.push({ id: `m_${Date.now()}`, name, times: times.sort(), enabled: true });
        saveMeds(meds); loadToday();
        break;
      }
      case "remove_medication_reminder": {
        const name = String(a.name || "").trim();
        if (!name) break;
        saveMeds(loadMeds().filter(m => !m.name.includes(name) && !name.includes(m.name))); loadToday();
        break;
      }
      case "set_font_size": {
        const idx = Math.max(0, (FONT_LABELS as readonly string[]).indexOf(String(a.level || "보통")));
        applyFontScale(FONT_STEPS[idx]); saveFontIdx(idx); setBigFont(idx > 0);
        break;
      }
      case "open_screen": {
        const map: Record<string, () => void> = {
          reminders: () => setShowReminders(true), health_wallet: () => setShowHealthWallet(true),
          medications: () => setShowMedications(true), safety: () => setShowSafety(true), settings: () => setShowSettings(true),
        };
        const open = map[String(a.screen || "")]; if (open) setTimeout(open, 600);
        break;
      }
      case "take_photo":
        setPhotoHint(true); setTimeout(() => setPhotoHint(false), 8000);
        try { fileInputRef.current?.click(); } catch {} // may be blocked without a gesture → the pulsing 사진 button is the fallback
        break;
      case "repeat_last":
        break; // handled inline in sendMessage
    }
  }

  /* ── photo → chat (documents, letters, suspicious texts) ── */
  function compressImage(file: File, maxSizeKB = 900): Promise<{ base64: string; mediaType: string; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image(); const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          let { width, height } = img; const MAX = 1200;
          if (width > MAX || height > MAX) { const s = MAX / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
          const c = document.createElement("canvas"); c.width = width; c.height = height;
          c.getContext("2d")!.drawImage(img, 0, 0, width, height);
          let q = 0.85; let d = c.toDataURL("image/jpeg", q);
          while (d.length > maxSizeKB * 1365 && q > 0.3) { q -= 0.1; d = c.toDataURL("image/jpeg", q); }
          resolve({ base64: d.split(",")[1], mediaType: "image/jpeg", dataUrl: d });
        };
        img.onerror = () => reject(new Error("image")); img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("read")); reader.readAsDataURL(file);
    });
  }
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || isLoading) return; e.target.value = "";
    try {
      const image = await compressImage(file);
      const userMsg: Message = { role: "user", content: "이 사진 좀 봐주세요", image };
      const newMsgs = [...messagesRef.current, userMsg];
      setMessages(newMsgs); setIsLoading(true);
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: ELLO.id, langPrompt: lang.systemPrompt, charName: ELLO.name, userCity, userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, clientContext: buildClientContext(),
          messages: newMsgs.map(m => ({ role: m.role, content: m.content, ...(m.image ? { image: { base64: m.image.base64, mediaType: m.image.mediaType } } : {}) })) }),
      });
      const data = await res.json();
      const reply = data.error ? "죄송해요, 사진을 확인하는 데 문제가 있었어요." : data.text;
      setMessages([...newMsgs, { role: "assistant", content: reply }]); setLastAssistantText(reply);
      if (!data.error) playTTS(reply);
    } catch {} finally { setIsLoading(false); }
  }

  /* ── voice input ── */
  function createRecognition(): SpeechRecognition | null {
    const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SR) return null;
    const r = new SR(); r.lang = lang.speechLang || "ko-KR"; r.continuous = true; r.interimResults = true;
    return r;
  }
  function finishListening(send: boolean) {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    const r = recognitionRef.current;
    recognitionRef.current = null; // detach first: any late onresult/onend from r is ignored
    try { r?.stop(); } catch {}
    setIsListening(false);
    const finalText = accumulatedTranscriptRef.current.trim();
    accumulatedTranscriptRef.current = "";
    if (send && finalText) sendMessage(finalText);
    else setLiveTranscript("");
  }
  function toggleListening() {
    if (isListening) { finishListening(true); return; }
    stopCurrentAudio();
    const r = createRecognition();
    if (!r) { alert("이 브라우저는 음성 인식을 지원하지 않아요. Chrome이나 Safari를 사용해 주세요."); return; }
    recognitionRef.current = r; accumulatedTranscriptRef.current = ""; setLiveTranscript("");
    const scheduleAutoSend = (ms = SILENCE_MS) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => { silenceTimerRef.current = null; finishListening(true); }, ms);
    };
    r.onresult = (ev) => {
      if (recognitionRef.current !== r) return; // finished already (button tap) — ignore late results
      const finals: string[] = []; let interim = "";
      for (let i = 0; i < ev.results.length; i++) { const t = (ev.results[i][0]?.transcript || "").trim(); if (!t) continue; if (ev.results[i].isFinal) finals.push(t); else interim = t; }
      let finalText = "";
      for (const t of finals) { if (!finalText) { finalText = t; continue; } if (finalText === t || finalText.includes(t)) continue; if (t.includes(finalText)) { finalText = t; continue; } finalText = `${finalText} ${t}`; }
      let shownInterim = interim;
      if (finalText && shownInterim) {
        if (shownInterim === finalText || finalText.endsWith(shownInterim)) shownInterim = "";
        else if (shownInterim.startsWith(finalText + " ")) shownInterim = shownInterim.slice(finalText.length + 1);
        else for (let len = Math.min(finalText.length, shownInterim.length); len > 0; len--) { if (shownInterim.startsWith(finalText.slice(-len))) { shownInterim = shownInterim.slice(len).trim(); break; } }
      }
      accumulatedTranscriptRef.current = finalText;
      setLiveTranscript((finalText + (shownInterim ? " " + shownInterim : "")).trim());
      scheduleAutoSend();
    };
    r.onerror = () => { if (recognitionRef.current === r) finishListening(false); };
    r.onend = () => { if (recognitionRef.current === r) finishListening(true); };
    r.start(); setIsListening(true);
    scheduleAutoSend(FIRST_SPEECH_MS); // elders pause before speaking — give them time before the first word
  }

  /* ── family call ── */
  const primary = contacts[0];
  const callLabel = primary ? `${primary.relation || primary.name}에게 전화` : "가족 연락처 등록";
  function onFamilyCall() {
    if (primary) window.location.href = `tel:${primary.phone}`;
    else setShowSafety(true);
  }
  function toggleTextInput() {
    const next = !textInputOn; setTextInputOn(next);
    try { localStorage.setItem("ello-text-input", next ? "1" : "0"); } catch {}
  }

  /* ── sub pages (all hooks are above this line) ── */
  const closeAll = () => { setShowSettings(false); setShowReminders(false); setShowHealthWallet(false); setShowMedications(false); setShowSafety(false); setContacts(loadContacts()); setBigFont(loadFontIdx() > 0); };
  if (showReminders) return <RemindersPage onClose={closeAll} userId={userId} langCode="ko" />;
  if (showHealthWallet) return <HealthWalletPage onClose={closeAll} userId={userId} langCode="ko" />;
  if (showMedications) return <MedicationPage onClose={closeAll} langCode="ko" />;
  if (showSafety) return <SafetyPage onClose={closeAll} langCode="ko" />;
  if (showInterpreter) return <InterpreterPage onClose={() => setShowInterpreter(null)} initialLang={showInterpreter} />;
  if (showSettings) return (
    <SettingsPage userName={userName} onClose={closeAll}
      onOpenReminders={() => setShowReminders(true)} onOpenHealthWallet={() => setShowHealthWallet(true)}
      onOpenMedications={() => setShowMedications(true)} onOpenSafety={() => setShowSafety(true)}
      textInputOn={textInputOn} onToggleTextInput={toggleTextInput} />
  );

  /* ── HOME ── */
  const showingTranscript = isListening || (!!liveTranscript && !lastAssistantText);
  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream overflow-hidden">

      {/* toast: 일정 저장됨 */}
      {appointmentToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-lg border-2 border-[#EADFD3] px-5 py-3 text-[20px] font-bold text-[#1F7A47]">일정을 저장했어요</div>
      )}

      {/* header */}
      <div className="flex items-center justify-between px-5 pt-3">
        <div className="flex items-center gap-1.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF6B35"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
          <span className="text-[22px] font-bold text-[#2B211C]">Ello</span>
        </div>
        <button onClick={() => setShowSettings(true)} className="h-12 px-[18px] rounded-full bg-white border-2 border-[#D9CCC0] flex items-center gap-2 active:scale-95" aria-label="설정">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.4" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
          <span className="text-[20px] font-bold text-[#2B211C]">설정</span>
        </button>
      </div>

      {/* Ello */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <CharacterAvatar personaId={ELLO.id} size={104} speaking={isSpeaking} showLabel label={ELLO.name} badge={ELLO.badge} />
      </div>

      {/* middle: words + today. Scrolls only if the screen is short or the font is enlarged; controls stay pinned. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-5 pt-2">
        {showingTranscript ? (
          <div className="bg-[#FFE6D9] rounded-[22px] rounded-br-md px-[18px] py-3.5 border-2 border-[#EADFD3] min-h-[64px] max-h-[170px] overflow-y-auto text-[24px] leading-[1.4] font-medium text-[#2B211C]">
            {liveTranscript || <span className="text-[#C2410C]">말씀하세요…</span>}
          </div>
        ) : (
          <button onClick={onBubbleTap} className="w-full text-left bg-white rounded-[22px] rounded-bl-md px-[18px] py-3.5 border-2 border-[#EADFD3] active:bg-[#FFF2E8]">
            {isSpeaking && (
              <div className="flex items-end gap-[3px] h-[18px] mb-1.5">
                {[9, 18, 12, 15].map((h, i) => <span key={i} className="w-[5px] rounded-sm bg-[#C2410C] animate-pulse" style={{ height: h, animationDelay: `${i * 0.12}s` }} />)}
                <span className="text-[18px] font-bold text-[#C2410C] ml-1.5">말하는 중 · 누르면 멈춰요</span>
              </div>
            )}
            <div className="text-[24px] leading-[1.4] font-medium text-[#2B211C] max-h-[170px] overflow-y-auto" style={{ textWrap: "pretty" }}>
              {isLoading ? <span className="text-[#5C4F48]">생각하고 있어요…</span> : (lastAssistantText || ELLO_GREETING)}
            </div>
          </button>
        )}
      </div>

      {/* today */}
      <div className="px-5 pt-3 pb-2">
        <div className="bg-white rounded-[22px] border-2 border-[#EADFD3] px-[18px] pt-3 pb-1">
          <div className="text-[20px] font-bold text-[#5C4F48] pb-1">오늘</div>
          {today.length === 0 ? (
            <div className="h-[54px] flex items-center text-[22px] font-medium text-[#5C4F48]">오늘은 일정이 없어요</div>
          ) : today.slice(0, bigFont ? 2 : 3).map((t, i, arr) => (
            <div key={i} className={`flex items-center gap-3.5 h-[54px] ${i < arr.length - 1 ? "border-b-2 border-[#F0E6DA]" : ""}`}>
              <span className="w-[92px] text-[28px] font-black text-[#C2410C]">{t.time}</span>
              <span className="text-[24px] font-medium text-[#2B211C] truncate">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* optional keyboard input (off by default; family can turn on in 설정) */}
      {textInputOn && !isListening && (
        <div className="px-5 pb-2 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
            placeholder="글로 쓰기" className="flex-1 h-14 px-4 rounded-2xl bg-white border-2 border-[#D9CCC0] text-[20px] text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
          {input.trim() && <button onClick={() => sendMessage()} disabled={isLoading} className="h-14 px-5 rounded-2xl bg-[#FF6B35] text-white text-[20px] font-bold">보내기</button>}
        </div>
      )}

      {/* mic row */}
      <div className="relative flex flex-col items-center gap-2 px-5 shrink-0">
        <button onClick={toggleListening} disabled={isLoading && !isListening} aria-label={isListening ? "말하기 끝" : "말하기"}
          className={`relative w-[120px] h-[120px] rounded-full bg-[#FF6B35] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-60 ${isListening ? "shadow-[0_10px_26px_rgba(255,107,53,0.45)]" : "shadow-[0_10px_26px_rgba(255,107,53,0.35)]"}`}>
          {isListening && (<>
            <span className="absolute inset-0 rounded-full bg-[#FF6B35]/35 pulse-ring" />
            <span className="absolute inset-0 rounded-full bg-[#FF6B35]/25 pulse-ring" style={{ animationDelay: "0.4s" }} />
          </>)}
          <svg className="relative" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="1" width="6" height="14" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" /></svg>
        </button>
        <span className={`text-[20px] font-bold ${isListening ? "text-[#C2410C]" : "text-[#2B211C]"}`}>{isListening ? "듣고 있어요" : "누르고 말씀하세요"}</span>

        <div className="absolute left-5 bottom-1 flex flex-col items-center gap-1">
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
          <button onClick={() => { setPhotoHint(false); fileInputRef.current?.click(); }} disabled={isLoading || isListening} aria-label="사진"
            className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-95 disabled:opacity-50 ${photoHint ? "bg-[#FFE6D9] border-[3px] border-[#FF6B35] animate-pulse" : "bg-white border-2 border-[#D9CCC0]"}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          </button>
          <span className="text-[18px] font-bold text-[#2B211C]">사진</span>
        </div>

        <div className="absolute right-5 bottom-1 flex flex-col items-center gap-1">
          <button onClick={() => { stopCurrentAudio(); setShowInterpreter("en"); }} disabled={isLoading || isListening} aria-label="통역"
            className="w-16 h-16 rounded-full bg-white border-2 border-[#D9CCC0] flex items-center justify-center active:scale-95 disabled:opacity-50">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" /></svg>
          </button>
          <span className="text-[18px] font-bold text-[#2B211C]">통역</span>
        </div>
      </div>

      {/* family call / finish listening */}
      <div className="px-5 pt-3 pb-5 shrink-0">
        {isListening ? (
          <button onClick={() => finishListening(true)} className="w-full h-[68px] rounded-[22px] bg-white border-[3px] border-[#C2410C] flex items-center justify-center gap-3 active:scale-[0.98]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            <span className="text-[26px] font-bold text-[#C2410C]">다 말했어요</span>
          </button>
        ) : (
          <button onClick={onFamilyCall} className="w-full h-[68px] rounded-[22px] bg-[#1F7A47] flex items-center justify-center gap-3 active:scale-[0.98]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" /></svg>
            <span className="text-[26px] font-bold text-white">{callLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
