"use client";

import { useState } from "react";

/* ── Character persona definitions ── */
export interface Persona {
  id: string;
  emoji: string;
  name: string;
  sample: string;
  greeting: string;
  promptAddition: string;
  color: string;
  iconBg: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "granddaughter",
    emoji: "\uD83D\uDC9B",
    name: "손주처럼",
    sample: "사랑해요 할머니!",
    greeting: "할머니~ 소연이에요! 보고싶었어요. 오늘 하루 어떠셨어요?",
    promptAddition:
      "너는 사랑스러운 손녀야. 항상 할머니를 사랑하고 애교있게 대해. '할머니~', '보고싶었어요' 같은 표현 자주 써. 항상 한국어로 존댓말로 대화해.",
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
    color: "#E0820D",
    iconBg: "#FFF0DC",
  },
];

/* ── Character Selection Screen ── */
interface CharacterSelectProps {
  onSelect: (persona: Persona) => void;
  initialId?: string;
}

export default function CharacterSelect({ onSelect, initialId }: CharacterSelectProps) {
  const [selected, setSelected] = useState<string>(initialId || "granddaughter");

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
          소연이와 어떻게 대화할까요?
        </h1>
        <p className="text-sm text-warm-gray-light mt-2">
          편한 방식으로 골라주세요
        </p>
      </div>

      {/* 2x2 Character grid */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {PERSONAS.map((p) => {
            const isActive = selected === p.id;
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

                {/* Emoji */}
                <span className="text-[40px] leading-none">{p.emoji}</span>

                {/* Name */}
                <span className="text-warm-brown font-bold text-[15px] mt-3">{p.name}</span>

                {/* Sample phrase pill */}
                <span
                  className="text-[12px] mt-2.5 px-2.5 py-1 rounded-full font-medium leading-tight"
                  style={{ background: p.iconBg, color: p.color }}
                >
                  &ldquo;{p.sample}&rdquo;
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
          시작하기
        </button>
      </div>
    </div>
  );
}
