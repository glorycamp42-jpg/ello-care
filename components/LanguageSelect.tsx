"use client";

import { useState } from "react";
import { LANGUAGES, Language, saveLang } from "@/lib/i18n";

interface LanguageSelectProps {
  onSelect: (lang: Language) => void;
  initialCode?: string;
}

export default function LanguageSelect({ onSelect, initialCode }: LanguageSelectProps) {
  const [selected, setSelected] = useState(initialCode || "ko");

  const selectedLang = LANGUAGES.find((l) => l.code === selected)!;

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
          언어를 선택하세요
        </h1>
        <p className="text-sm text-warm-gray-light mt-1.5">
          Select Language
        </p>
      </div>

      {/* 2x3 Language grid */}
      <div className="flex-1 px-5 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((lang) => {
            const isActive = selected === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className={`
                  relative flex flex-col items-center text-center
                  px-3 pt-5 pb-4 rounded-2xl
                  transition-all duration-200 active:scale-[0.97]
                  ${isActive
                    ? "bg-white shadow-lg border-2 border-coral"
                    : "bg-warm-white shadow-sm border-2 border-transparent hover:shadow-md"
                  }
                `}
              >
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 w-[22px] h-[22px] rounded-full bg-coral flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                <span className="text-[40px] leading-none">{lang.flag}</span>
                <span className="text-warm-brown font-bold text-[16px] mt-3">{lang.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start button */}
      <div className="px-5 pt-5 pb-8">
        <button
          onClick={() => {
            saveLang(selectedLang.code);
            onSelect(selectedLang);
          }}
          className="w-full py-4 bg-coral text-white rounded-2xl font-bold text-base
                     shadow-md shadow-coral/25 hover:bg-coral-dark active:scale-[0.98]
                     transition-all"
        >
          시작 / Start
        </button>
      </div>
    </div>
  );
}
