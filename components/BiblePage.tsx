"use client";

import { useState, useEffect } from "react";
import { PSALMS, TOTAL_CHAPTERS } from "@/lib/bible";

interface BibleProgress {
  day: number;
  verseIndex: number;
}

interface BiblePageProps {
  onClose: () => void;
  onComplete: () => void;
  langCode?: string;
}

const BIBLE_I18N: Record<string, {
  back: string; header: string; psalm: string; chapterUnit: string;
  verseUnit: string; reread: string; complete: string; nextVerse: string;
  completeTitle: string; completeMsg1: string; completeMsg2: string;
  ticketEarn: string; backToChat: string;
}> = {
  ko: { back: "돌아가기", header: "성경", psalm: "시편", chapterUnit: "편", verseUnit: "절",
    reread: "다시 읽기", complete: "완료!", nextVerse: "다음 절",
    completeTitle: "편 완료!", completeMsg1: "오늘 말씀 다 읽으셨어요!",
    completeMsg2: "은혜로운 하루 되세요.", ticketEarn: "+3 행복티켓 획득!", backToChat: "대화로 돌아가기" },
  en: { back: "Back", header: "Bible", psalm: "Psalm", chapterUnit: "", verseUnit: "verses",
    reread: "Re-read", complete: "Complete!", nextVerse: "Next Verse",
    completeTitle: " Complete!", completeMsg1: "You finished today's reading!",
    completeMsg2: "Have a blessed day.", ticketEarn: "+3 Happiness Tickets!", backToChat: "Back to Chat" },
  es: { back: "Volver", header: "Biblia", psalm: "Salmo", chapterUnit: "", verseUnit: "versículos",
    reread: "Releer", complete: "¡Completo!", nextVerse: "Siguiente versículo",
    completeTitle: " ¡Completado!", completeMsg1: "¡Terminaste la lectura de hoy!",
    completeMsg2: "Que tengas un día bendecido.", ticketEarn: "¡+3 boletos de felicidad!", backToChat: "Volver al chat" },
  zh: { back: "返回", header: "圣经", psalm: "诗篇", chapterUnit: "篇", verseUnit: "节",
    reread: "重读", complete: "完成!", nextVerse: "下一节",
    completeTitle: "篇 完成!", completeMsg1: "你完成了今天的阅读!",
    completeMsg2: "祝你有蒙福的一天。", ticketEarn: "+3 幸福票!", backToChat: "返回聊天" },
  vi: { back: "Quay lại", header: "Kinh Thánh", psalm: "Thi Thiên", chapterUnit: "", verseUnit: "câu",
    reread: "Đọc lại", complete: "Hoàn thành!", nextVerse: "Câu tiếp",
    completeTitle: " Hoàn thành!", completeMsg1: "Bạn đã đọc xong hôm nay!",
    completeMsg2: "Chúc một ngày được phước.", ticketEarn: "+3 vé hạnh phúc!", backToChat: "Quay lại trò chuyện" },
  ja: { back: "戻る", header: "聖書", psalm: "詩篇", chapterUnit: "編", verseUnit: "節",
    reread: "もう一度読む", complete: "完了!", nextVerse: "次の節",
    completeTitle: "編 完了!", completeMsg1: "今日の御言葉を読み終えました!",
    completeMsg2: "恵みある一日を。", ticketEarn: "+3 幸せチケット獲得!", backToChat: "チャットに戻る" },
};

const STORAGE_KEY = "ello-bible-progress";

function loadProgress(): BibleProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { day: 1, verseIndex: 0 };
}

function saveProgress(p: BibleProgress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

export default function BiblePage({ onClose, onComplete, langCode = "ko" }: BiblePageProps) {
  const t = BIBLE_I18N[langCode] || BIBLE_I18N.ko;
  const [progress, setProgress] = useState<BibleProgress>({ day: 1, verseIndex: 0 });
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const chapter = progress.day;
  const verses = PSALMS[chapter] || PSALMS[1];
  const totalVerses = verses.length;
  const currentVerse = verses[progress.verseIndex];
  const progressPct = totalVerses > 0 ? ((progress.verseIndex + 1) / totalVerses) * 100 : 0;

  function nextVerse() {
    if (progress.verseIndex + 1 >= totalVerses) {
      // Chapter complete
      setCompleted(true);
      const nextDay = progress.day >= TOTAL_CHAPTERS ? 1 : progress.day + 1;
      saveProgress({ day: nextDay, verseIndex: 0 });
      onComplete();
    } else {
      const next = { ...progress, verseIndex: progress.verseIndex + 1 };
      setProgress(next);
      saveProgress(next);
    }
  }

  function restart() {
    const reset = { ...progress, verseIndex: 0 };
    setProgress(reset);
    saveProgress(reset);
    setCompleted(false);
  }

  if (completed) {
    return (
      <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
        <header className="flex items-center justify-between px-5 py-3.5">
          <button onClick={onClose} className="text-warm-gray text-sm font-medium flex items-center gap-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {t.back}
          </button>
          <span className="text-warm-brown font-bold text-base">{t.header}</span>
          <div className="w-16" />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-[64px]">&#x2728;</span>
          <h2 className="text-xl font-bold text-warm-brown mt-4">
            {t.psalm} {chapter}{t.completeTitle}
          </h2>
          <p className="text-warm-gray text-[15px] mt-3 leading-relaxed">
            {t.completeMsg1}<br />{t.completeMsg2}
          </p>
          <div className="mt-3 bg-coral-pastel text-coral-dark text-sm font-medium px-4 py-2 rounded-full">
            {t.ticketEarn}
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={restart}
              className="px-5 py-3 bg-warm-white text-warm-gray rounded-2xl text-sm font-medium shadow-sm">
              {t.reread}
            </button>
            <button onClick={onClose}
              className="px-5 py-3 bg-coral text-white rounded-2xl text-sm font-bold shadow-md shadow-coral/20">
              {t.backToChat}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5">
        <button onClick={onClose} className="text-warm-gray text-sm font-medium flex items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t.back}
        </button>
        <span className="text-warm-brown font-bold text-base">{t.header}</span>
        <button onClick={restart} className="text-coral text-sm font-medium">
          {t.reread}
        </button>
      </header>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-warm-brown font-bold text-sm">{t.psalm} {chapter}{t.chapterUnit}</span>
          <span className="text-warm-gray-light text-[12px]">{progress.verseIndex + 1} / {totalVerses} {t.verseUnit}</span>
        </div>
        <div className="w-full h-2 bg-coral-pastel rounded-full overflow-hidden">
          <div
            className="h-full bg-coral rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Verse display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="bg-warm-white rounded-3xl shadow-sm p-8 w-full max-w-[340px]">
          {/* Verse number */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-coral font-bold text-sm bg-coral-pastel w-8 h-8 rounded-full flex items-center justify-center">
              {currentVerse?.verse}
            </span>
            <span className="text-warm-gray-light text-[12px]">{t.psalm} {chapter}{t.chapterUnit} {currentVerse?.verse}{langCode === "ko" ? "절" : ""}</span>
          </div>

          {/* Verse text */}
          <p className="text-[20px] leading-[1.8] text-warm-brown font-medium">
            {currentVerse?.text}
          </p>
        </div>
      </div>

      {/* Next button */}
      <div className="px-5 pt-3 pb-8">
        <button onClick={nextVerse}
          className="w-full py-4 bg-coral text-white rounded-2xl font-bold text-base
                     shadow-md shadow-coral/25 hover:bg-coral-dark active:scale-[0.98] transition-all">
          {progress.verseIndex + 1 >= totalVerses ? t.complete : t.nextVerse}
        </button>
      </div>
    </div>
  );
}
