"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import CharacterAvatar from "@/components/CharacterAvatar";
import VoiceButton from "@/components/VoiceButton";
import ImageButton from "@/components/ImageButton";
import SpeakerButton from "@/components/SpeakerButton";
import CharacterSelect, { PERSONAS, Persona, getPersonaText } from "@/components/CharacterSelect";
import { createClient } from "@/lib/supabase/client";
import { useTickets } from "@/components/useTickets";
import TicketToast from "@/components/TicketToast";
import HappinessGarden from "@/components/HappinessGarden";
import RemindersPage from "@/components/RemindersPage";
import BiblePage from "@/components/BiblePage";
import HomelandPage from "@/components/HomelandPage";
import SafetyPage from "@/components/SafetyPage";
import HealthWalletPage from "@/components/HealthWalletPage";
import { findContactByKeyword } from "@/components/SafetyPage";
import LanguageSelect from "@/components/LanguageSelect";
import { Language, getSavedLang } from "@/lib/i18n";
import { parseMemories } from "@/lib/parseMemory";

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

function getSavedPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem("ello-persona");
    return PERSONAS.find((p) => p.id === id) || null;
  } catch { return null; }
}
function savePersona(p: Persona) {
  try { localStorage.setItem("ello-persona", p.id); } catch {}
}

export default function Home() {
  const [lang, setLang] = useState<Language | null>(null);
  const [showLangSelect, setShowLangSelect] = useState(true);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [showSelect, setShowSelect] = useState(true);
  const [showTicketPage, setShowTicketPage] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showBible, setShowBible] = useState(false);
  const [showHomeland, setShowHomeland] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showHealthWallet, setShowHealthWallet] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [appointmentToast, setAppointmentToast] = useState(false);
  const [userId, setUserId] = useState("default");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const [userCity, setUserCity] = useState("Los Angeles");

  const tickets = useTickets();

  useEffect(() => {
    // Load saved language
    const savedLang = getSavedLang();
    const hasLang = typeof window !== "undefined" && localStorage.getItem("ello-language");
    if (hasLang) {
      setLang(savedLang);
      setShowLangSelect(false);
    }
    // Load saved persona
    const saved = getSavedPersona();
    if (saved) { setPersona(saved); setShowSelect(false); }

    // Get current user ID for appointment saving
    try {
      const sb = createClient();
      const tryGetUser = async (attempt = 1): Promise<void> => {
        console.log(`[auth] Attempt ${attempt} to get user...`);
        const { data: { session } } = await sb.auth.getSession();
        if (session?.user?.id) {
          setUserId(session.user.id);
          console.log("[auth] User ID from getSession:", session.user.id, "email:", session.user.email);
          return;
        }
        const { data: { user } } = await sb.auth.getUser();
        if (user?.id) {
          setUserId(user.id);
          console.log("[auth] User ID from getUser:", user.id);
          return;
        }
        // 재시도 (PIN 로그인 후 세션 설정 지연 대비)
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1000));
          return tryGetUser(attempt + 1);
        }
        // 최후의 fallback: localStorage에서 userId 복구
        const savedId = localStorage.getItem('ello-userId');
        if (savedId) {
          setUserId(savedId);
          console.log("[auth] Recovered userId from localStorage:", savedId);
          return;
        }
        console.log("[auth] No session after retries, redirecting to /login");
        window.location.href = "/login";
      };
      tryGetUser();
    } catch (err) {
      console.error("[auth] Failed to get user:", err);
    }

    // Load saved location or request geolocation
    try {
      const savedLoc = localStorage.getItem("ello-user-location");
      if (savedLoc) {
        const loc = JSON.parse(savedLoc);
        if (loc.city) setUserCity(loc.city);
        console.log(`[geo] Loaded saved location: ${loc.city}`);
      } else {
        requestGeolocation();
      }
    } catch { requestGeolocation(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        console.log(`[geo] Got coordinates: ${latitude}, ${longitude}`);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "ElloCare/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.county || "Los Angeles";
            const loc = { lat: latitude, lon: longitude, city };
            localStorage.setItem("ello-user-location", JSON.stringify(loc));
            setUserCity(city);
            console.log(`[geo] Resolved city: ${city}`);
          }
        } catch (err) {
          console.error("[geo] Reverse geocoding failed:", err);
        }
      },
      (err) => console.log(`[geo] Permission denied or error: ${err.message}`),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  async function generateSmartGreeting(currentLang: Language): Promise<string> {
    const defaultGreeting = currentLang.greeting;
    if (userId === "default") return defaultGreeting;

    try {
      // Fetch memories from API
      const res = await fetch(`/api/appointments?userId=${userId}`);
      const memRes = await fetch(`/api/memories`);
      const memData = await memRes.json();
      const apptData = await res.json();

      const memories = memData.memories || [];
      const appointments = apptData.appointments || [];

      if (memories.length === 0 && appointments.length === 0) return defaultGreeting;

      // Claude will use memories/appointments from DB via system prompt
      // Ask Claude for a warm personalized greeting
      const greetRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "안녕" }],
          persona: persona?.id || "granddaughter",
          langPrompt: currentLang.systemPrompt,
          charName: currentLang.charName,
          userId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          greetingMode: true,
        }),
      });
      const greetData = await greetRes.json();
      if (greetData.text && !greetData.error) {
        // Filter out any raw system prompt text that might leak through
        const filtered = greetData.text
          .replace(/\[SYSTEM\][\s\S]*$/, "")
          .replace(/Memories:[\s\S]*$/, "")
          .replace(/Keep it to \d+-\d+ sentences[\s\S]*$/, "")
          .replace(/Be warm and caring\.?/gi, "")
          .replace(/\bcaring\.?\s*/gi, "")
          .replace(/\bwarm\.?\s*/gi, "")
          .replace(/ABSOLUTE RULE[\s\S]*$/, "")
          .replace(/CRITICAL[\s\S]*$/, "")
          .replace(/You are a[\s\S]*companion[\s\S]*$/, "")
          .replace(/Conversation style:[\s\S]*$/, "")
          .trim();
        if (filtered.length > 5 && !/^[a-zA-Z.\s]{1,20}$/.test(filtered)) {
          console.log("[greeting] Smart greeting generated:", filtered.slice(0, 50));
          return filtered;
        }
      }
    } catch (err) {
      console.error("[greeting] Failed, using default:", err);
    }
    return defaultGreeting;
  }

  // 대화 복구는 단 한 번만 실행되도록 ref로 추적
  const restoredRef = useRef(false);

  useEffect(() => {
    // userId 가 default 면 PIN 로그인 대기 중 — 아직 복구 시도 안 함
    if (!persona || showSelect || showLangSelect) return;
    if (userId === "default") return;
    if (restoredRef.current) return;
    restoredRef.current = true;

    const currentLang = lang || getSavedLang();
    console.log(`[chat] Attempting to restore conversation for userId=${userId}`);

    fetch(`/api/conversations?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        const restored = (data.messages || []).map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        if (restored.length > 0) {
          console.log(`[chat] Restored ${restored.length} messages from last 24h`);
          setMessages(restored);
          setLastAssistantText(restored[restored.length - 1]?.content || "");
        } else {
          console.log("[chat] No previous conversation, generating smart greeting");
          generateSmartGreeting(currentLang).then((greetingText) => {
            setMessages([{ role: "assistant", content: greetingText }]);
            setLastAssistantText(greetingText);
          });
        }
      })
      .catch((err) => {
        console.error("[chat] Restore failed, using default greeting:", err);
        setMessages([{ role: "assistant", content: currentLang.greeting }]);
        setLastAssistantText(currentLang.greeting);
      });

    checkMorningReminders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona, showSelect, showLangSelect, userId]);

  async function checkMorningReminders() {
    try {
      const res = await fetch("/api/memories");
      const data = await res.json();
      const memories = data.memories || [];
      if (memories.length === 0) return;

      const today = new Date();
      const todayStr = `${today.getMonth() + 1}월${today.getDate()}일`;
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getMonth() + 1}월${tomorrow.getDate()}일`;

      const urgent = memories.filter((m: { date: string }) =>
        m.date.includes(todayStr) || m.date.includes("오늘") ||
        m.date.includes(tomorrowStr) || m.date.includes("내일")
      );

      if (urgent.length > 0) {
        const m = urgent[0];
        const when = m.date.includes("오늘") || m.date.includes(todayStr) ? "오늘" : "내일";
        const reminder = `할머니, ${when} ${m.time ? m.time + "에 " : ""}${m.content} 있어요!`;
        setTimeout(() => {
          setMessages((prev) => [...prev, { role: "assistant", content: reminder }]);
          setLastAssistantText(reminder);
        }, 2000);
      }
    } catch {
      // Silently fail if Supabase not configured
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handlePersonaSelect(p: Persona) {
    // Allow conversation to restore again when persona changes
    restoredRef.current = false;
    setPersona(p); savePersona(p); setMessages([]); setShowSelect(false);
  }

  function handleChangeCharacter() {
    window.speechSynthesis?.cancel(); setShowSelect(true);
  }

  function handleLangSelect(l: Language) {
    setLang(l);
    setShowLangSelect(false);
  }

  function handleChangeLanguage() {
    window.speechSynthesis?.cancel();
    setShowLangSelect(true);
  }

  /* ── Screens ── */
  if (showLangSelect) {
    return <LanguageSelect onSelect={handleLangSelect} initialCode={lang?.code} />;
  }
  if (showSelect) {
    return <CharacterSelect onSelect={handlePersonaSelect} initialId={persona?.id} />;
  }
  if (showTicketPage) {
    return <HappinessGarden userId={userId} onClose={() => setShowTicketPage(false)} langCode={lang?.code || getSavedLang().code} />;
  }
  if (showReminders) {
    return <RemindersPage onClose={() => setShowReminders(false)} userId={userId} langCode={lang?.code || getSavedLang().code} />;
  }
  if (showBible) {
    const currentLang = lang || getSavedLang();
    return <BiblePage
      onClose={() => setShowBible(false)}
      langCode={currentLang.code}
      onComplete={() => {
        tickets.earn("checkin"); // +2 for completing Bible reading
        tickets.earn("chat");   // +1 bonus
        setShowBible(false);
        const completeMsgs: Record<string, string> = {
          ko: "오늘 말씀 다 읽으셨어요! 은혜로운 하루 되세요.",
          en: "You finished today's reading! Have a blessed day.",
          es: "¡Terminaste la lectura de hoy! Que tengas un día bendecido.",
          zh: "你完成了今天的阅读!祝你有蒙福的一天。",
          vi: "Bạn đã đọc xong hôm nay! Chúc một ngày được phước.",
          ja: "今日の御言葉を読み終えました!恵みある一日を。",
        };
        const msg = completeMsgs[currentLang.code] || completeMsgs.ko;
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
        setLastAssistantText(msg);
        playTTS(msg);
      }}
    />;
  }
  if (showHomeland) {
    return <HomelandPage onClose={() => setShowHomeland(false)} langCode={lang?.code || getSavedLang().code} />;
  }
  if (showSafety) {
    return <SafetyPage onClose={() => setShowSafety(false)} langCode={lang?.code || getSavedLang().code} />;
  }
  if (showHealthWallet) {
    return <HealthWalletPage onClose={() => setShowHealthWallet(false)} userId={userId} langCode={lang?.code || getSavedLang().code} />;
  }

  /* ── Helpers ── */
  function createRecognition(): SpeechRecognition | null {
    if (typeof window === "undefined") return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.lang = "ko-KR";
    // Keep listening through pauses — elderly users speak slowly with breaths
    r.continuous = true;
    // Show interim results so user sees they're being heard
    r.interimResults = true;
    return r;
  }

  function stopCurrentAudio() {
    // Abort any in-flight TTS fetch
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    // Stop and clean up any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      const src = audioRef.current.src;
      audioRef.current = null;
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
    }
    setIsSpeaking(false);
  }

  async function playTTS(text: string) {
    if (!persona) return;

    // Always stop previous audio/request first
    stopCurrentAudio();

    const controller = new AbortController();
    ttsAbortRef.current = controller;

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: persona.voiceId, languageCode: lang?.speechLang }),
        signal: controller.signal,
      });

      // If aborted while waiting, exit silently
      if (controller.signal.aborted) return;
      if (!res.ok) return;

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
      // Ignore abort errors
      if (err instanceof DOMException && err.name === "AbortError") return;
      setIsSpeaking(false);
    }
  }

  function stopOrReplayTTS() {
    if (isSpeaking || audioRef.current) {
      stopCurrentAudio();
    } else if (lastAssistantText) {
      playTTS(lastAssistantText);
    }
  }

  /* ── Chat JSX (inline to keep state access simple) ── */
  return <ChatUI
    persona={persona!} messages={messages} setMessages={(m) => { setMessages(m); messagesRef.current = m; }}
    input={input} setInput={setInput}
    isLoading={isLoading} setIsLoading={setIsLoading}
    isListening={isListening} setIsListening={setIsListening}
    isSpeaking={isSpeaking} lastAssistantText={lastAssistantText} setLastAssistantText={setLastAssistantText}
    chatEndRef={chatEndRef} recognitionRef={recognitionRef} fileInputRef={fileInputRef} messagesRef={messagesRef}
    playTTS={playTTS} stopOrReplayTTS={stopOrReplayTTS} createRecognition={createRecognition}
    onChangeCharacter={handleChangeCharacter}
    tickets={tickets} onShowTickets={() => setShowTicketPage(true)}
    onShowReminders={() => setShowReminders(true)}
    onShowBible={() => setShowBible(true)}
    onShowHomeland={() => setShowHomeland(true)}
    onShowHealthWallet={() => setShowHealthWallet(true)}
    onChangeLang={handleChangeLanguage}
    userCity={userCity}
    lang={lang || getSavedLang()}
    checkedIn={checkedIn} setCheckedIn={setCheckedIn}
    appointmentToast={appointmentToast} setAppointmentToast={setAppointmentToast}
    userId={userId}
  />;
}

/* ── ChatUI Component ── */
interface ChatUIProps {
  persona: Persona;
  messages: Message[]; setMessages: (m: Message[]) => void;
  input: string; setInput: (s: string) => void;
  isLoading: boolean; setIsLoading: (b: boolean) => void;
  isListening: boolean; setIsListening: (b: boolean) => void;
  isSpeaking: boolean;
  lastAssistantText: string; setLastAssistantText: (s: string) => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  recognitionRef: React.MutableRefObject<SpeechRecognition | null>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  messagesRef: React.MutableRefObject<Message[]>;
  playTTS: (t: string) => void; stopOrReplayTTS: () => void;
  createRecognition: () => SpeechRecognition | null;
  onChangeCharacter: () => void;
  tickets: ReturnType<typeof useTickets>;
  onShowTickets: () => void;
  onShowReminders: () => void;
  onShowBible: () => void;
  onShowHomeland: () => void;
  onShowHealthWallet: () => void;
  onChangeLang: () => void;
  userCity: string;
  lang: Language;
  checkedIn: boolean; setCheckedIn: (b: boolean) => void;
  appointmentToast: boolean; setAppointmentToast: (b: boolean) => void;
  userId: string;
}

/* ── Interpreter keyword detection ── */
const INTERPRET_TRIGGERS = /통역|interpret|영어로 (해줘|말해|얘기해|대화해|통역해)|스페니시|스페인어로|중국어로|일본어로|베트남어로/i;
const INTERPRET_EXIT = /^(끝|그만|종료|done|stop|통역 끝|대화 끝)$/i;

function detectTargetLang(text: string): string {
  if (/스페니시|스페인어|spanish|español/i.test(text)) return "es";
  if (/중국어|chinese|중국말/i.test(text)) return "zh";
  if (/일본어|japanese|일본말/i.test(text)) return "ja";
  if (/베트남어|vietnamese|베트남말/i.test(text)) return "vi";
  return "en";
}

const LANG_SPEECH_CODES: Record<string, string> = {
  en: "en-US", es: "es-ES", zh: "zh-CN", ja: "ja-JP", vi: "vi-VN", ko: "ko-KR",
};
const LANG_LABELS: Record<string, string> = {
  en: "English", es: "Español", zh: "中文", ja: "日本語", vi: "Tiếng Việt", ko: "한국어",
};

function ChatUI({
  persona, messages, setMessages, input, setInput,
  isLoading, setIsLoading, isListening, setIsListening, isSpeaking,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lastAssistantText, setLastAssistantText,
  chatEndRef, recognitionRef, fileInputRef, messagesRef,
  playTTS, stopOrReplayTTS, createRecognition, onChangeCharacter,
  tickets, onShowTickets, onShowReminders, onShowBible, onShowHomeland, onShowHealthWallet, onChangeLang, userCity, lang, checkedIn, setCheckedIn, appointmentToast, setAppointmentToast, userId,
}: ChatUIProps) {

  /* ── Interpreter mode state ── */
  const [interpreterMode, setInterpreterMode] = useState(false);
  const [interpreterLang, setInterpreterLang] = useState("en");
  const [interpreterTurn, setInterpreterTurn] = useState<"user" | "other">("user");
  const interpreterHistoryRef = useRef<{ speaker: string; original: string; translated: string }[]>([]);

  async function playInterpreterTTS(text: string, targetLangCode: string) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: persona.voiceId, languageCode: targetLangCode }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      });
    } catch { /* ignore */ }
  }

  function listenInLanguage(langCode: string): Promise<string> {
    return new Promise((resolve) => {
      if (typeof window === "undefined") { resolve(""); return; }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }
      const r = new SR();
      r.lang = LANG_SPEECH_CODES[langCode] || "en-US";
      r.continuous = true;
      r.interimResults = true;
      let accumulated = "";
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      const finish = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        try { r.stop(); } catch {}
        resolve(accumulated.trim());
      };
      const resetSilence = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(finish, 3000);
      };
      r.onresult = (ev: SpeechRecognitionResultEvent) => {
        const allFinals: string[] = [];
        for (let i = 0; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) allFinals.push(ev.results[i][0].transcript.trim());
        }
        let finalText = "";
        for (const t of allFinals) {
          if (!finalText) { finalText = t; continue; }
          if (finalText === t || finalText.includes(t)) continue;
          if (t.includes(finalText)) { finalText = t; continue; }
          finalText = finalText + " " + t;
        }
        if (finalText) accumulated = finalText;
        setInput(accumulated);
        resetSilence();
      };
      r.onerror = () => finish();
      r.onend = () => finish();
      r.start();
      setIsListening(true);
      resetSilence();
    });
  }

  async function interpreterSend(text: string, speaker: "user" | "other") {
    if (!text.trim()) return;
    if (INTERPRET_EXIT.test(text.trim())) {
      setInterpreterMode(false);
      setInterpreterTurn("user");
      const summary = interpreterHistoryRef.current.length > 0
        ? "통역이 끝났어요. 대화 잘 하셨어요!"
        : "통역 모드를 종료했어요.";
      setMessages([...messagesRef.current, { role: "assistant", content: summary }]);
      setLastAssistantText(summary);
      playTTS(summary);
      interpreterHistoryRef.current = [];
      return;
    }
    const userMsg: Message = { role: "user", content: text };
    setMessages([...messagesRef.current, userMsg]);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interpreterMode: true,
          messages: [{ role: "user", content: text }],
          targetLang: interpreterLang,
          speakerRole: speaker,
          history: interpreterHistoryRef.current,
        }),
      });
      const data = await res.json();
      if (data.exit) {
        setInterpreterMode(false);
        setInterpreterTurn("user");
        const exitMsg = data.forUser || "통역이 끝났어요.";
        setMessages([...messagesRef.current, { role: "assistant", content: exitMsg }]);
        setLastAssistantText(exitMsg);
        playTTS(exitMsg);
        interpreterHistoryRef.current = [];
        setIsLoading(false);
        return;
      }
      if (speaker === "user" && data.forOther) {
        interpreterHistoryRef.current.push({ speaker: "user", original: text, translated: data.forOther });
        const displayMsg = "[" + (LANG_LABELS[interpreterLang] || "English") + "] " + data.forOther + (data.forUser ? "\n(" + data.forUser + ")" : "");
        setMessages([...messagesRef.current, userMsg, { role: "assistant", content: displayMsg }]);
        setLastAssistantText(displayMsg);
        setIsLoading(false);
        await playInterpreterTTS(data.forOther, interpreterLang);
        setInterpreterTurn("other");
        setInput("");
        const otherResponse = await listenInLanguage(interpreterLang);
        setIsListening(false);
        if (otherResponse) await interpreterSend(otherResponse, "other");
      } else if (speaker === "other" && data.forUser) {
        interpreterHistoryRef.current.push({ speaker: "other", original: text, translated: data.forUser });
        const displayMsg = data.forUser;
        setMessages([...messagesRef.current, userMsg, { role: "assistant", content: displayMsg }]);
        setLastAssistantText(displayMsg);
        setIsLoading(false);
        await playInterpreterTTS(data.forUser, "ko");
        setInterpreterTurn("user");
        setInput("");
        const userResponse = await listenInLanguage("ko");
        setIsListening(false);
        if (userResponse) await interpreterSend(userResponse, "user");
      } else {
        setIsLoading(false);
      }
    } catch {
      setMessages([...messagesRef.current, { role: "assistant", content: "통역 중 오류가 발생했어요." }]);
      setIsLoading(false);
    }
  }

  // Save parsed memories to Supabase
  async function saveMemories(memories: { date: string; time: string; content: string }[]) {
    for (const m of memories) {
      try {
        await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(m),
        });
      } catch (err) {
        console.error("[memory] Save failed:", err);
      }
    }
  }

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = textOverride || input.trim();
      console.log(`[sendMessage] called, text="${text}", isLoading=${isLoading}, input="${input}"`);
      if (!text || isLoading) { console.log("[sendMessage] BLOCKED: empty text or isLoading"); return; }

      // ── Interpreter mode handling ──
      if (interpreterMode) {
        interpreterSend(text, interpreterTurn);
        return;
      }
      if (INTERPRET_TRIGGERS.test(text)) {
        const tLang = detectTargetLang(text);
        setInterpreterMode(true);
        setInterpreterLang(tLang);
        setInterpreterTurn("user");
        interpreterHistoryRef.current = [];
        const langLabel = LANG_LABELS[tLang] || "English";
        const confirmMsg = "통역 모드를 시작할게요 (" + langLabel + "). 말씀하시면 제가 " + langLabel + "로 바꿔서 말할게요. 상대방이 말하면 한국어로 바꿔드릴게요. 끝나면 끝이라고 하세요.";
        setMessages([...messagesRef.current, { role: "user", content: text }, { role: "assistant", content: confirmMsg }]);
        setLastAssistantText(confirmMsg);
        setInput("");
        playTTS(confirmMsg);
        return;
      }

      tickets.earn("chat");

      if (!checkedIn && /기분|안녕|잘 지|어떠/.test(text)) {
        tickets.earn("checkin");
        setCheckedIn(true);
      }
      if (/노래|부르|singing/.test(text)) {
        tickets.earn("sing");
      }

      // Homeland (music/radio) detection
      if (/트로트|옛날\s?노래|라디오\s?틀|가요\s?틀|노래\s?틀|음악\s?틀|고향|찬송가|play\s?(music|radio|trot)/i.test(text)) {
        const confirmMsg = lang.code === "ko"
          ? "고향 페이지를 열어드릴게요! 라디오도 듣고 옛날 노래도 들어보세요."
          : "Opening the Homeland page for you! Enjoy radio and old songs.";
        setMessages([...messagesRef.current, { role: "user", content: text }, { role: "assistant", content: confirmMsg }]);
        setLastAssistantText(confirmMsg);
        setInput("");
        playTTS(confirmMsg);
        setTimeout(() => onShowHomeland(), 1500);
        return;
      }

      // Call detection: "딸한테 전화해줘", "아들에게 전화", etc.
      const callMatch = text.match(/(딸|아들|손자|손녀|며느리|사위|엄마|아빠|형|누나|동생).*(전화|연락|call)/);
      if (callMatch) {
        const contact = findContactByKeyword(callMatch[1]);
        if (contact) {
          window.location.href = `tel:${contact.phone}`;
          return;
        }
      }

      const userMsg: Message = { role: "user", content: text };
      const newMsgs = [...messagesRef.current, userMsg];
      setMessages(newMsgs);
      setInput("");
      setIsLoading(true);

      try {
        const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const clientNow = new Date().toString();
        console.log(`[sendMessage] Fetching /api/chat with ${newMsgs.length} messages, userId=${userId}, tz=${clientTz}, now=${clientNow}`);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMsgs, persona: persona.id, langPrompt: lang.systemPrompt, charName: lang.charName, userCity, userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        });
        console.log(`[sendMessage] Response status: ${res.status}`);
        const data = await res.json();
        console.log(`[sendMessage] appointmentSaved: ${data.appointmentSaved}, debug:`, data._debug);
        if (data._debug?.ticketChat) {
          console.log(`[ticket] chat grant result:`, data._debug.ticketChat);
          if (data._debug.ticketChat.granted > 0) {
            console.log(`✅ +${data._debug.ticketChat.granted} 포인트 적립됨 (total=${data._debug.ticketChat.total})`);
          } else {
            console.warn(`⚠️ 포인트 미적립 - reason: ${data._debug.ticketChat.reason}, elderId: ${data._debug.elderId}`);
          }
        }
        const rawReply = data.error ? "죄송해요, 잠시 문제가 있었어요. 다시 말씀해주세요." : data.text;

        // Parse and save any [MEMORY:] tags
        const { cleanText: reply, memories } = parseMemories(rawReply);
        if (memories.length > 0) saveMemories(memories);

        // Show toast if appointment was auto-saved
        if (data.appointmentSaved) {
          setAppointmentToast(true);
          setTimeout(() => setAppointmentToast(false), 3000);
        }

        setMessages([...newMsgs, { role: "assistant", content: reply }]);
        setLastAssistantText(reply);

        if (!data.error) playTTS(reply);
      } catch {
        setMessages([...newMsgs, { role: "assistant", content: "연결에 문제가 있어요." }]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, persona.id, messagesRef, setMessages, setInput, setIsLoading, setLastAssistantText, playTTS, tickets, checkedIn, setCheckedIn, interpreterMode, interpreterTurn, interpreterLang]
  );

  function startWordGame() {
    tickets.earn("wordgame");
    sendMessage("끝말잇기 하자! 소연이가 먼저 시작해줘.");
  }

  function compressImage(file: File, maxSizeKB = 900): Promise<{ base64: string; mediaType: string; dataUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          let { width, height } = img;
          const MAX = 1200;
          if (width > MAX || height > MAX) { const s = MAX / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
          const c = document.createElement("canvas"); c.width = width; c.height = height;
          c.getContext("2d")!.drawImage(img, 0, 0, width, height);
          let q = 0.85; let d = c.toDataURL("image/jpeg", q);
          while (d.length > maxSizeKB * 1365 && q > 0.3) { q -= 0.1; d = c.toDataURL("image/jpeg", q); }
          resolve({ base64: d.split(",")[1], mediaType: "image/jpeg", dataUrl: d });
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || isLoading) return;
    e.target.value = "";
    tickets.earn("photo");
    try {
      const imageData = await compressImage(file);
      const userMsg: Message = { role: "user", content: "이 사진 좀 봐주세요", image: imageData };
      const newMsgs = [...messagesRef.current, userMsg];
      setMessages(newMsgs);
      setIsLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona: persona.id,
            langPrompt: lang.systemPrompt,
            charName: lang.charName,
            userCity,
            userId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            messages: newMsgs.map((m) => ({
              role: m.role, content: m.content,
              ...(m.image ? { image: { base64: m.image.base64, mediaType: m.image.mediaType } } : {}),
            })),
          }),
        });
        const data = await res.json();
        const reply = data.error ? "죄송해요, 사진을 확인하는 데 문제가 있었어요." : data.text;
        setMessages([...newMsgs, { role: "assistant", content: reply }]);
        setLastAssistantText(reply);

        if (!data.error) playTTS(reply);
      } catch {
        setMessages([...newMsgs, { role: "assistant", content: "연결에 문제가 있어요." }]);
      } finally {
        setIsLoading(false);
      }
    } catch (err) { console.error("[image] Failed:", err); }
  }

  // Refs for accumulated transcript and silence timeout used during listening
  const accumulatedTranscriptRef = useRef<string>("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SILENCE_MS = 2800; // how long to wait after user stops speaking before auto-sending

  const toggleListening = useCallback(() => {
    // If already listening: stop + send whatever has been accumulated
    if (isListening) {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      recognitionRef.current?.stop();
      setIsListening(false);
      const finalText = accumulatedTranscriptRef.current.trim();
      accumulatedTranscriptRef.current = "";
      if (finalText) {
        setInput(finalText);
        setTimeout(() => sendMessage(finalText), 150);
      }
      return;
    }

    // Start a fresh listening session
    const r = createRecognition();
    if (!r) { alert("음성 인식이 지원되지 않습니다. Chrome을 사용해주세요."); return; }
    recognitionRef.current = r;
    accumulatedTranscriptRef.current = "";

    // Helper: (re)schedule the auto-send that fires after user has stopped talking
    const scheduleAutoSend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        try { recognitionRef.current?.stop(); } catch {}
        const finalText = accumulatedTranscriptRef.current.trim();
        accumulatedTranscriptRef.current = "";
        setIsListening(false);
        if (finalText) {
          setInput(finalText);
          sendMessage(finalText);
        }
      }, SILENCE_MS);
    };

    r.onresult = (ev) => {
      // Mobile Web Speech API quirks (especially iPhone Safari / Android Chrome):
      //  (a) emits the SAME final transcript multiple times → "오늘 오늘 오늘 ..."
      //  (b) emits CUMULATIVE finals where each later final contains the earlier
      //      one as a prefix (e.g. "오늘", "오늘 예약", "오늘 예약 잡아줘")
      //  (c) interim may repeat the already-finalized text
      // Strategy: overlap-aware merge (superset wins, strict duplicates dropped),
      // then strip overlap between finalText tail and interim head.
      const allFinals: string[] = [];
      let interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i];
        const transcript = (res[0]?.transcript || "").trim();
        if (!transcript) continue;
        if (res.isFinal) {
          allFinals.push(transcript);
        } else {
          // Keep only the latest interim (usually cumulative on mobile)
          interim = transcript;
        }
      }

      // Overlap-aware merge of finals: skip duplicates/subsets, upgrade to superset, append truly new phrases
      let finalText = "";
      for (const t of allFinals) {
        if (!finalText) { finalText = t; continue; }
        if (finalText === t) continue;              // exact duplicate
        if (finalText.includes(t)) continue;         // subset of current
        if (t.includes(finalText)) { finalText = t; continue; } // superset — upgrade
        finalText = finalText + " " + t;             // genuine new phrase
      }

      // Strip interim head if it overlaps with finalText tail
      let displayInterim = interim;
      if (finalText && displayInterim) {
        if (displayInterim === finalText || finalText.endsWith(displayInterim)) {
          displayInterim = "";
        } else if (displayInterim.startsWith(finalText + " ")) {
          displayInterim = displayInterim.slice(finalText.length + 1);
        } else {
          // Find longest suffix of finalText that is a prefix of interim
          for (let len = Math.min(finalText.length, displayInterim.length); len > 0; len--) {
            if (displayInterim.startsWith(finalText.slice(-len))) {
              displayInterim = displayInterim.slice(len).trim();
              break;
            }
          }
        }
      }

      accumulatedTranscriptRef.current = finalText;
      setInput((finalText + (displayInterim ? " " + displayInterim : "")).trim());
      // Any new speech activity → restart the silence countdown
      scheduleAutoSend();
    };

    r.onerror = () => {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      setIsListening(false);
    };

    // onend can fire due to browser's internal timeout even with continuous=true.
    // If it fires, send whatever we've captured so far.
    r.onend = () => {
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      setIsListening(false);
      const finalText = accumulatedTranscriptRef.current.trim();
      accumulatedTranscriptRef.current = "";
      if (finalText) {
        setInput(finalText);
        sendMessage(finalText);
      }
    };

    r.start();
    setIsListening(true);
    scheduleAutoSend(); // seed the timer so long silence from the start also terminates
  }, [isListening, sendMessage, recognitionRef, setIsListening, setInput, createRecognition]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream relative">

      {/* Toast notification */}
      {tickets.toast && <TicketToast points={tickets.toast.points} label={tickets.toast.label} />}

      {/* Appointment saved toast */}
      {appointmentToast && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 50,
          background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(27,111,232,0.15)",
          padding: "12px 20px", display: "flex", alignItems: "center", gap: 8,
          border: "1px solid #e0ecff",
        }}>
          <span style={{ fontSize: 20 }}>📅</span>
          <span style={{ color: "#1B6FE8", fontWeight: 700, fontSize: 14 }}>일정이 저장되었습니다</span>
        </div>
      )}

      {/* ── Interpreter mode banner ── */}
      {interpreterMode && (
        <div style={{
          background: "linear-gradient(135deg, #1B6FE8 0%, #4A90D9 100%)",
          color: "white", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 14, fontWeight: 600,
        }}>
          <span>
            {interpreterTurn === "user" ? "\uD83C\uDFA4 " : "\uD83D\uDDE3 "}
            통역 중 ({LANG_LABELS[interpreterLang]})
            {interpreterTurn === "user" ? " — 말씀하세요" : " — 상대방 차례"}
          </span>
          <button onClick={() => { setInterpreterMode(false); setInterpreterTurn("user"); interpreterHistoryRef.current = [];
            const exitMsg = "통역 모드를 종료했어요.";
            setMessages([...messagesRef.current, { role: "assistant", content: exitMsg }]);
            playTTS(exitMsg);
          }} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            끝
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-cream">
        <div className="flex items-center gap-1.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF6B35" stroke="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="text-warm-brown font-bold text-xl tracking-tight">Ello</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Ticket counter */}
          <button
            onClick={onShowTickets}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-coral-pastel rounded-full hover:bg-coral/15 transition-colors"
          >
            <span className="text-sm">&#x2B50;</span>
            <span className="text-coral font-bold text-[13px]">{tickets.state.total}</span>
          </button>

          {/* Language flag button */}
          <button onClick={onChangeLang}
            className="w-8 h-8 rounded-full bg-coral-pastel flex items-center justify-center hover:bg-coral/15 transition-colors text-sm"
            aria-label="언어 변경">
            {lang.flag}
          </button>

          {/* Persona badge */}
          <span className="text-[11px] font-medium px-2 py-1 rounded-full"
            style={{ background: persona.iconBg, color: persona.color }}>
            {getPersonaText(persona.id, lang.code).name}
          </span>

          {/* Settings menu */}
          <SettingsMenu onChangeCharacter={onChangeCharacter} />
        </div>
      </header>

      {/* ── Persistent hero avatar (video-call style, always visible) ── */}
      <div
        className="flex flex-col items-center justify-center shrink-0"
        style={{ height: "35vh", minHeight: 220 }}
      >
        <CharacterAvatar
          personaId={persona.id}
          size={180}
          speaking={isSpeaking}
          showLabel
          label={lang.charName}
          badge={getPersonaText(persona.id, lang.code).badge}
        />
      </div>

      {/* ── Chat area (scrolls within remaining 2/3) ── */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3.5 py-2.5 text-[14px] leading-relaxed ${
              msg.role === "user"
                ? "bg-coral text-white rounded-[18px] rounded-br-[5px] shadow-sm shadow-coral/15"
                : "bg-warm-white text-warm-gray rounded-[18px] rounded-bl-[5px] shadow-sm shadow-warm-gray/8"
            }`}>
              {msg.image && <img src={msg.image.dataUrl} alt="사진" className="rounded-xl mb-1.5 max-h-36 w-auto" />}
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-end gap-1.5 justify-start">
            <div className="bg-warm-white px-4 py-3 rounded-[18px] rounded-bl-[5px] shadow-sm shadow-warm-gray/8">
              <span className="inline-flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-coral/40 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-coral/40 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="w-1.5 h-1.5 bg-coral/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Quick suggestions + 끝말잇기 ── */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {lang.ui.quickButtons.map((t) => (
          <button key={t} onClick={() => sendMessage(t)}
            className="px-3.5 py-2 bg-coral-pastel text-coral-dark rounded-full text-[13px] font-medium hover:bg-coral/15 active:bg-coral/20 transition-colors whitespace-nowrap shrink-0">
            {t}
          </button>
        ))}
        <button onClick={startWordGame}
          className="px-3.5 py-2 bg-coral/10 text-coral rounded-full text-[13px] font-bold hover:bg-coral/20 active:bg-coral/25 transition-colors whitespace-nowrap shrink-0 border border-coral/20">
          {lang.ui.wordGame}
        </button>
        <button onClick={onShowHomeland}
          className="px-3.5 py-2 bg-coral/10 text-coral rounded-full text-[13px] font-bold hover:bg-coral/20 active:bg-coral/25 transition-colors whitespace-nowrap shrink-0 border border-coral/20">
          {lang.code === "ko" ? "고향" : "Homeland"}
        </button>
        <button onClick={onShowReminders}
          className="px-3.5 py-2 bg-coral/10 text-coral rounded-full text-[13px] font-bold hover:bg-coral/20 active:bg-coral/25 transition-colors whitespace-nowrap shrink-0 border border-coral/20">
          {lang.ui.schedule}
        </button>
      </div>

      {/* ── Bottom bar ── */}
      <div className="bg-cream border-t border-warm-gray-light/15 px-4 pt-3 pb-5">
        <div className="mb-3">
          <div className="flex items-end gap-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={lang.ui.placeholder} rows={1}
              className="flex-1 px-4 py-3 bg-warm-white rounded-2xl border border-warm-gray-light/15 text-[15px] text-warm-gray placeholder:text-warm-gray-light/50 focus:outline-none focus:border-coral/30 focus:ring-2 focus:ring-coral/10 resize-none min-h-[46px]" />
            {input.trim() && (
              <button onClick={() => sendMessage()} disabled={isLoading}
                className="w-[46px] h-[46px] bg-coral text-white rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-coral/20 active:scale-95 transition-all disabled:opacity-50"
                aria-label="보내기">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center gap-6">
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
          <ImageButton onClick={() => fileInputRef.current?.click()} disabled={isLoading} label={lang.ui.camera} />
          <VoiceButton isListening={isListening} onClick={toggleListening} disabled={isLoading} label={lang.ui.mic} />
          <SpeakerButton isSpeaking={isSpeaking} onClick={stopOrReplayTTS} label={lang.ui.speaker} labelActive={lang.ui.speaking} />
        </div>
        {isListening && <p className="text-center text-sm text-coral mt-2 animate-pulse font-medium">{lang.ui.listening}</p>}
      </div>

      {/* ── Bottom Tab Navigation (4 tabs, large icons) ── */}
      <nav className="bg-cream border-t border-warm-gray-light/15 px-2 pt-2 pb-5">
        <div className="flex items-center justify-around">
          {/* 홈 */}
          <button onClick={onChangeCharacter} className="flex flex-col items-center gap-1 min-w-0 flex-1 py-2 text-warm-gray-light active:scale-95 transition-transform">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[12px] font-semibold">{lang.ui.home}</span>
          </button>

          {/* 일정 */}
          <button onClick={onShowReminders} className="flex flex-col items-center gap-1 min-w-0 flex-1 py-2 text-warm-gray-light active:scale-95 transition-transform">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-[12px] font-semibold">{lang.ui.schedule}</span>
          </button>

          {/* 고향 */}
          <button onClick={onShowHomeland} className="flex flex-col items-center gap-1 min-w-0 flex-1 py-2 text-warm-gray-light active:scale-95 transition-transform">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12a9 9 0 0 0 6 0" />
              <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10A15 15 0 0 1 12 2z" />
            </svg>
            <span className="text-[12px] font-semibold">{lang.code === "ko" ? "고향" : "Homeland"}</span>
          </button>

          {/* 건강수첩 */}
          <button onClick={onShowHealthWallet} className="flex flex-col items-center gap-1 min-w-0 flex-1 py-2 text-warm-gray-light active:scale-95 transition-transform">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span className="text-[12px] font-semibold">{lang.code === "ko" ? "건강수첩" : "Health"}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

/* ── Settings Dropdown Menu ── */
function SettingsMenu({ onChangeCharacter }: { onChangeCharacter: () => void }) {
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const sb = createClient();
    await sb.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 32, height: 32, borderRadius: 16,
          background: "#FFE6D9", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        aria-label="설정"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          {/* Menu */}
          <div style={{
            position: "absolute", top: 36, right: 0, zIndex: 50,
            background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            minWidth: 160, overflow: "hidden",
          }}>
            <button
              onClick={() => { setOpen(false); onChangeCharacter(); }}
              style={{
                display: "block", width: "100%", padding: "12px 16px",
                fontSize: 14, color: "#3D3530", background: "none", border: "none",
                textAlign: "left", cursor: "pointer",
              }}
            >
              캐릭터 변경
            </button>
            <div style={{ height: 1, background: "#f0f0f0" }} />
            <button
              onClick={() => { setOpen(false); handleLogout(); }}
              style={{
                display: "block", width: "100%", padding: "12px 16px",
                fontSize: 14, color: "#EF4444", background: "none", border: "none",
                textAlign: "left", cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
}
