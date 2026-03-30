"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import CharacterAvatar from "@/components/CharacterAvatar";
import VoiceButton from "@/components/VoiceButton";
import ImageButton from "@/components/ImageButton";
import SpeakerButton from "@/components/SpeakerButton";
import CharacterSelect, { PERSONAS, Persona, getPersonaText } from "@/components/CharacterSelect";
import { createClient } from "@supabase/supabase-js";
import { useTickets } from "@/components/useTickets";
import TicketToast from "@/components/TicketToast";
import TicketPage from "@/components/TicketPage";
import RemindersPage from "@/components/RemindersPage";
import BiblePage from "@/components/BiblePage";
import SafetyPage from "@/components/SafetyPage";
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
interface SpeechRecognitionResultEvent extends Event { results: SpeechRecognitionResultList; }
interface SpeechRecognitionResultList { [i: number]: SpeechRecognitionResult; length: number; }
interface SpeechRecognitionResult { [i: number]: SpeechRecognitionAlternative; length: number; }
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
  const [showSafety, setShowSafety] = useState(false);
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
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          setUserId(session.user.id);
          console.log("[auth] User ID from session:", session.user.id);
        } else {
          console.log("[auth] No session found, userId stays 'default'");
        }
      });
    } catch (err) {
      console.error("[auth] Failed to get session:", err);
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

  useEffect(() => {
    if (persona && !showSelect && !showLangSelect && messages.length === 0) {
      const currentLang = lang || getSavedLang();
      const greetingText = currentLang.greeting;
      const greeting: Message = { role: "assistant", content: greetingText };
      setMessages([greeting]);
      setLastAssistantText(greetingText);

      // Check for today/tomorrow reminders
      checkMorningReminders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona, showSelect, messages.length]);

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
    return <TicketPage state={tickets.state} onClose={() => setShowTicketPage(false)} />;
  }
  if (showReminders) {
    return <RemindersPage onClose={() => setShowReminders(false)} />;
  }
  if (showBible) {
    return <BiblePage
      onClose={() => setShowBible(false)}
      onComplete={() => {
        tickets.earn("checkin"); // +2 for completing Bible reading
        tickets.earn("chat");   // +1 bonus
        setShowBible(false);
        const msg = "오늘 말씀 다 읽으셨어요! 은혜로운 하루 되세요.";
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
        setLastAssistantText(msg);
        playTTS(msg);
      }}
    />;
  }
  if (showSafety) {
    return <SafetyPage onClose={() => setShowSafety(false)} />;
  }

  /* ── Helpers ── */
  function createRecognition(): SpeechRecognition | null {
    if (typeof window === "undefined") return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR(); r.lang = "ko-KR"; r.continuous = false; r.interimResults = false;
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
    onShowSafety={() => setShowSafety(true)}
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
  onShowSafety: () => void;
  onChangeLang: () => void;
  userCity: string;
  lang: Language;
  checkedIn: boolean; setCheckedIn: (b: boolean) => void;
  appointmentToast: boolean; setAppointmentToast: (b: boolean) => void;
  userId: string;
}

function ChatUI({
  persona, messages, setMessages, input, setInput,
  isLoading, setIsLoading, isListening, setIsListening, isSpeaking,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lastAssistantText, setLastAssistantText,
  chatEndRef, recognitionRef, fileInputRef, messagesRef,
  playTTS, stopOrReplayTTS, createRecognition, onChangeCharacter,
  tickets, onShowTickets, onShowReminders, onShowBible, onShowSafety, onChangeLang, userCity, lang, checkedIn, setCheckedIn, appointmentToast, setAppointmentToast, userId,
}: ChatUIProps) {

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

      tickets.earn("chat");

      if (!checkedIn && /기분|안녕|잘 지|어떠/.test(text)) {
        tickets.earn("checkin");
        setCheckedIn(true);
      }
      if (/노래|부르|singing/.test(text)) {
        tickets.earn("sing");
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
        console.log(`[sendMessage] Fetching /api/chat with ${newMsgs.length} messages, userId=${userId}`);
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMsgs, persona: persona.id, langPrompt: lang.systemPrompt, charName: lang.charName, userCity, userId }),
        });
        console.log(`[sendMessage] Response status: ${res.status}`);
        const data = await res.json();
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
    [input, isLoading, persona.id, messagesRef, setMessages, setInput, setIsLoading, setLastAssistantText, playTTS, tickets, checkedIn, setCheckedIn]
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

  const toggleListening = useCallback(() => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const r = createRecognition();
    if (!r) { alert("음성 인식이 지원되지 않습니다. Chrome을 사용해주세요."); return; }
    recognitionRef.current = r;
    r.onresult = (ev) => { const t = ev.results[0][0].transcript; setInput(t); setTimeout(() => sendMessage(t), 300); };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start(); setIsListening(true);
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

          {/* Settings gear */}
          <button onClick={onChangeCharacter}
            className="w-8 h-8 rounded-full bg-coral-pastel flex items-center justify-center hover:bg-coral/15 transition-colors"
            aria-label="캐릭터 변경">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Avatar section (40% height when few messages) ── */}
      {messages.length <= 1 && (
        <div className="flex flex-col items-center justify-center" style={{ minHeight: "40vh" }}>
          <CharacterAvatar
            personaId={persona.id}
            size={160}
            speaking={isSpeaking}
            showLabel
            label={lang.charName}
            badge={lang.ui.aiCompanion}
          />
        </div>
      )}

      {/* ── Chat area ── */}
      <div className="flex-1 overflow-y-auto chat-scroll px-4 py-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="shrink-0 mb-0.5">
                <CharacterAvatar personaId={persona.id} size={32} speaking={isSpeaking && i === messages.length - 1} />
              </div>
            )}
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
            <div className="shrink-0 mb-0.5"><CharacterAvatar personaId={persona.id} size={32} /></div>
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
        <button onClick={onShowBible}
          className="px-3.5 py-2 bg-coral/10 text-coral rounded-full text-[13px] font-bold hover:bg-coral/20 active:bg-coral/25 transition-colors whitespace-nowrap shrink-0 border border-coral/20">
          {lang.ui.bible}
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

      {/* ── Bottom Tab Navigation ── */}
      <nav className="bg-cream border-t border-warm-gray-light/15 px-2 pt-1.5 pb-4">
        <div className="flex items-center justify-around">
          {/* 홈 */}
          <button onClick={onShowTickets} className="flex flex-col items-center gap-0.5 min-w-[56px] py-1 text-coral">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="text-[10px] font-medium">{lang.ui.home}</span>
          </button>

          {/* 대화 - currently active */}
          <button className="flex flex-col items-center gap-0.5 min-w-[56px] py-1 text-coral">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-[10px] font-bold">{lang.ui.chat}</span>
          </button>

          {/* 일정 */}
          <button onClick={onShowReminders} className="flex flex-col items-center gap-0.5 min-w-[56px] py-1 text-warm-gray-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-[10px] font-medium">{lang.ui.schedule}</span>
          </button>

          {/* 성경 */}
          <button onClick={onShowBible} className="flex flex-col items-center gap-0.5 min-w-[56px] py-1 text-warm-gray-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="12" y1="6" x2="12" y2="13" />
              <line x1="9" y1="9" x2="15" y2="9" />
            </svg>
            <span className="text-[10px] font-medium">{lang.ui.bible}</span>
          </button>

          {/* 안전 */}
          <button onClick={onShowSafety} className="flex flex-col items-center gap-0.5 min-w-[56px] py-1 text-warm-gray-light">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-[10px] font-medium">{lang.ui.safety}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
