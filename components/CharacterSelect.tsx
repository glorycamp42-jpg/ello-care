"use client";

import { useState } from "react";
import { getSavedLang, LangCode } from "@/lib/i18n";
import CharacterAvatar from "@/components/CharacterAvatar";

/* ── Character persona definitions ── */
export interface Persona {
  id: string;
  emoji: string;
  name: string;
  sample: string;
  greeting: string;
  promptAddition: string;
  voiceId: string;
  color: string;
  iconBg: string;
}

/* ── Translated names and samples per language ── */
const PERSONA_I18N: Record<string, Record<LangCode, { name: string; sample: string }>> = {
  granddaughter: {
    ko: { name: "손주처럼", sample: "사랑해요 할머니!" },
    en: { name: "Like a Grandchild", sample: "I love you, Grandma!" },
    es: { name: "Como un nieto", sample: "¡Te quiero, abuelita!" },
    zh: { name: "像孙子一样", sample: "奶奶我爱你！" },
    vi: { name: "Như cháu", sample: "Con yêu bà!" },
    ja: { name: "孫のように", sample: "おばあちゃん大好き！" },
  },
  oldfriend: {
    ko: { name: "옛친구처럼", sample: "오랜만이야, 잘 지냈어?" },
    en: { name: "Like an Old Friend", sample: "Long time no see! How've you been?" },
    es: { name: "Como un viejo amigo", sample: "¡Cuánto tiempo! ¿Cómo has estado?" },
    zh: { name: "像老朋友一样", sample: "好久不见，最近怎么样？" },
    vi: { name: "Như bạn cũ", sample: "Lâu rồi không gặp! Dạo này sao rồi?" },
    ja: { name: "旧友のように", sample: "久しぶり！元気だった？" },
  },
  church: {
    ko: { name: "교회친구처럼", sample: "오늘 말씀 들었어요?" },
    en: { name: "Like a Church Friend", sample: "Did you hear today's sermon?" },
    es: { name: "Como un amigo de iglesia", sample: "¿Escuchaste el sermón de hoy?" },
    zh: { name: "像教会朋友一样", sample: "今天的讲道听了吗？" },
    vi: { name: "Như bạn nhà thờ", sample: "Hôm nay bạn nghe bài giảng chưa?" },
    ja: { name: "教会の友のように", sample: "今日の説教聞いた？" },
  },
  assistant: {
    ko: { name: "비서처럼", sample: "일정 도와드릴게요" },
    en: { name: "Like an Assistant", sample: "Let me help with your schedule" },
    es: { name: "Como un asistente", sample: "Déjame ayudarte con tu agenda" },
    zh: { name: "像秘书一样", sample: "让我帮你安排日程" },
    vi: { name: "Như trợ lý", sample: "Để tôi giúp bạn sắp xếp lịch" },
    ja: { name: "秘書のように", sample: "スケジュールをお手伝いします" },
  },
};

export const PERSONAS: Persona[] = [
  {
    id: "granddaughter",
    emoji: "\uD83D\uDC9B",
    name: "손주처럼",
    sample: "사랑해요 할머니!",
    greeting: "할머니~ 소연이에요! 보고싶었어요. 오늘 하루 어떠셨어요?",
    promptAddition:
      "너는 사랑스러운 손녀야. 항상 할머니를 사랑하고 애교있게 대해. '할머니~', '보고싶었어요' 같은 표현 자주 써. 항상 한국어로 존댓말로 대화해.",
    voiceId: "xi3rF0t7dg7uN2M0WUhr",
    color: "#FF6B35",
    iconBg: "#FFE6D9",
  },
  {
    id: "oldfriend",
    emoji: "\uD83D\uDC99",
    name: "옛친구처럼",
    sample: "오랜만이야, 잘 지냈어?",
    greeting: "야~ 오랜만이다! 잘 지냈어?",
    promptAddition:
      "너는 할머니의 오랜 친구야. 편하게 반말로 대화하고 옛날 추억 얘기도 자주 해. '야~', '그때 기억나?' 같은 표현 써. 한국어로 대화해.",
    voiceId: "6yp5xWNuHEXOVkwW5Ghz",
    color: "#4EAACC",
    iconBg: "#DDF0F7",
  },
  {
    id: "church",
    emoji: "\uD83D\uDC9A",
    name: "교회친구처럼",
    sample: "오늘 말씀 들었어요?",
    greeting: "안녕하세요! 오늘도 감사한 하루 보내고 계시죠?",
    promptAddition:
      "너는 교회 친구야. 따뜻하고 신앙적인 대화를 해. 가끔 성경 말씀이나 기도 얘기도 자연스럽게 꺼내. 항상 한국어 존댓말로 대화해.",
    voiceId: "8yL2rVx40vjDeu5pTbg6",
    color: "#3DA87A",
    iconBg: "#DDF3EA",
  },
  {
    id: "assistant",
    emoji: "\uD83E\uDDE1",
    name: "비서처럼",
    sample: "일정 도와드릴게요",
    greeting: "안녕하세요! 오늘 일정 확인 도와드릴까요?",
    promptAddition:
      "너는 유능한 AI 비서야. 일정 관리, 약 복용 알림, 병원 예약 등을 도와줘. 친절하지만 프로페셔널하게. 항상 한국어로 대화해.",
    voiceId: "sf8Bpb1IU97NI9BHSMRf",
    color: "#E0820D",
    iconBg: "#FFF0DC",
  },
];

/* ── Helper to get translated name/sample ── */
export function getPersonaText(personaId: string, langCode: LangCode) {
  const t = PERSONA_I18N[personaId]?.[langCode];
  if (t) return t;
  return PERSONA_I18N[personaId]?.ko || { name: personaId, sample: "" };
}

/* ── Character Selection Screen ── */
interface CharacterSelectProps {
  onSelect: (persona: Persona) => void;
  initialId?: string;
}

export default function CharacterSelect({ onSelect, initialId }: CharacterSelectProps) {
  const [selected, setSelected] = useState<string>(initialId || "granddaughter");
  const lang = getSavedLang();

  const selectedPersona = PERSONAS.find((p) => p.id === selected)!;

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
      {/* Logo */}
      <div className="flex items-center justify-center gap-1.5 pt-10 pb-2">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#FF6B35" stroke="none">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="text-warm-brown font-bold text-xl tracking-tight">Ello</span>
      </div>

      {/* Title */}
      <div className="text-center px-6 pt-5 pb-6">
        <h1 className="text-[22px] font-bold text-warm-brown leading-snug">
          {lang.ui.charSelectTitle}
        </h1>
        <p className="text-sm text-warm-gray-light mt-2">
          {lang.ui.charSelectSubtitle}
        </p>
      </div>

      {/* 2x2 Character grid */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {PERSONAS.map((p) => {
            const isActive = selected === p.id;
            const t = getPersonaText(p.id, lang.code);
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`
                  relative flex flex-col items-center text-center
                  px-3 pt-5 pb-4 rounded-2xl
                  transition-all duration-200 active:scale-[0.97]
                  ${isActive
                    ? "bg-white shadow-lg border-2"
                    : "bg-warm-white shadow-sm border-2 border-transparent hover:shadow-md"
                  }
                `}
                style={isActive ? { borderColor: p.color } : undefined}
              >
                {/* Checkmark */}
                {isActive && (
                  <div
                    className="absolute top-2.5 right-2.5 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                    style={{ background: p.color }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                {/* Character image */}
                <CharacterAvatar personaId={p.id} size={72} />

                {/* Translated Name */}
                <span className="text-warm-brown font-bold text-[15px] mt-3">{t.name}</span>

                {/* Translated Sample phrase pill */}
                <span
                  className="text-[12px] mt-2.5 px-2.5 py-1 rounded-full font-medium leading-tight"
                  style={{ background: p.iconBg, color: p.color }}
                >
                  &ldquo;{t.sample}&rdquo;
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start button */}
      <div className="px-5 pt-5 pb-8">
        <button
          onClick={() => onSelect(selectedPersona)}
          className="w-full py-4 bg-coral text-white rounded-2xl font-bold text-base
                     shadow-md shadow-coral/25 hover:bg-coral-dark active:scale-[0.98]
                     transition-all"
        >
          {lang.ui.start}
        </button>
      </div>
    </div>
  );
}
