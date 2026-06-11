"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  loadMeds,
  loadMedLog,
  todayStr,
  MED_LOG_KEY,
  MED_ACK_KEY,
  MED_SNOOZE_KEY,
  type MedLogEntry,
} from "./MedicationPage";

/* 시간이 되면 화면 전체 알림 + 음성 안내를 띄우는 전역 컴포넌트 (layout.tsx에 마운트) */

const ALARM_I18N: Record<
  string,
  { title: string; sub: string; taken: string; later: string; speech: (names: string) => string }
> = {
  ko: {
    title: "약 드실 시간이에요",
    sub: "드신 후 아래 버튼을 눌러주세요",
    taken: "네, 먹었어요 ✓",
    later: "10분 뒤에 다시",
    speech: (n) => `어르신, 약 드실 시간이에요. ${n} 잊지 말고 챙겨 드세요.`,
  },
  en: {
    title: "Time for your medication",
    sub: "Tap the button below after taking it",
    taken: "I took it ✓",
    later: "Remind me in 10 min",
    speech: (n) => `It's time to take your medication: ${n}. Please don't forget.`,
  },
  es: {
    title: "Hora de tu medicina",
    sub: "Toca el botón después de tomarla",
    taken: "Ya la tomé ✓",
    later: "En 10 minutos",
    speech: (n) => `Es hora de tomar su medicina: ${n}. Por favor no lo olvide.`,
  },
  zh: {
    title: "该吃药了",
    sub: "服药后请按下面的按钮",
    taken: "我吃了 ✓",
    later: "10分钟后再提醒",
    speech: (n) => `该吃药了:${n}。请不要忘记。`,
  },
  vi: {
    title: "Đến giờ uống thuốc",
    sub: "Nhấn nút bên dưới sau khi uống",
    taken: "Tôi đã uống ✓",
    later: "Nhắc lại sau 10 phút",
    speech: (n) => `Đến giờ uống thuốc rồi: ${n}. Xin đừng quên.`,
  },
  ja: {
    title: "お薬の時間です",
    sub: "飲んだら下のボタンを押してください",
    taken: "飲みました ✓",
    later: "10分後にもう一度",
    speech: (n) => `お薬の時間です。${n}。忘れずに飲んでくださいね。`,
  },
};

const SPEECH_LANG: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  es: "es-ES",
  zh: "zh-CN",
  vi: "vi-VN",
  ja: "ja-JP",
};

function getSavedLangCode(): string {
  try {
    const raw = localStorage.getItem("ello-language");
    if (!raw) return "ko";
    const parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed.code === "string") return parsed.code;
    return "ko";
  } catch {
    try {
      const raw = localStorage.getItem("ello-language");
      return raw && raw.length <= 5 ? raw : "ko";
    } catch {
      return "ko";
    }
  }
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

interface DueAlarm {
  time: string; // HH:MM
  names: string[];
}

const WINDOW_MIN = 5; // 알림 유효 시간 (분)

export default function MedicationAlarm() {
  const pathname = usePathname();
  const [due, setDue] = useState<DueAlarm | null>(null);
  const dueRef = useRef<DueAlarm | null>(null);
  const repeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const langCode = typeof window !== "undefined" ? getSavedLangCode() : "ko";
  const t = ALARM_I18N[langCode] || ALARM_I18N.ko;

  const speak = useCallback(
    (names: string[]) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const tt = ALARM_I18N[getSavedLangCode()] || ALARM_I18N.ko;
        const u = new SpeechSynthesisUtterance(tt.speech(names.join(", ")));
        u.lang = SPEECH_LANG[getSavedLangCode()] || "ko-KR";
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      } catch {}
    },
    []
  );

  const check = useCallback(() => {
    // 메인 앱 화면에서만 작동 (로그인/광고 페이지 제외)
    if (pathname !== "/") return;
    if (dueRef.current) return; // 이미 알림 떠 있음

    const meds = loadMeds().filter((m) => m.enabled);
    if (meds.length === 0) return;

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const today = todayStr();
    const acks = loadJSON<Record<string, boolean>>(MED_ACK_KEY, {});
    const snoozes = loadJSON<Record<string, number>>(MED_SNOOZE_KEY, {});

    const dueNames: string[] = [];
    let dueTime = "";

    for (const med of meds) {
      for (const time of med.times) {
        const [h, m] = time.split(":").map((x) => parseInt(x, 10));
        if (isNaN(h) || isNaN(m)) continue;
        const tMin = h * 60 + m;
        const inWindow = nowMin >= tMin && nowMin < tMin + WINDOW_MIN;
        const ackKey = `${today}|${time}|${med.id}`;
        const snoozeUntil = snoozes[ackKey] || 0;
        const snoozeDue = snoozeUntil > 0 && Date.now() >= snoozeUntil && nowMin < tMin + 60;
        if ((inWindow || snoozeDue) && !acks[ackKey]) {
          dueNames.push(med.name);
          dueTime = time;
        }
      }
    }

    if (dueNames.length > 0) {
      const alarm = { time: dueTime, names: dueNames };
      dueRef.current = alarm;
      setDue(alarm);
      speak(dueNames);
      // 30초 후에도 안 누르면 한 번 더 음성 안내
      repeatTimerRef.current = setTimeout(() => {
        if (dueRef.current) speak(dueRef.current.names);
      }, 30000);
    }
  }, [pathname, speak]);

  useEffect(() => {
    const interval = setInterval(check, 20000);
    const initial = setTimeout(check, 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(initial);
      if (repeatTimerRef.current) clearTimeout(repeatTimerRef.current);
    };
  }, [check]);

  function markKeys(fn: (ackKey: string) => void) {
    const today = todayStr();
    const meds = loadMeds().filter((m) => m.enabled);
    const alarm = dueRef.current;
    if (!alarm) return;
    for (const med of meds) {
      if (alarm.names.includes(med.name)) {
        fn(`${today}|${alarm.time}|${med.id}`);
      }
    }
  }

  function handleTaken() {
    const alarm = dueRef.current;
    if (!alarm) return;
    const acks = loadJSON<Record<string, boolean>>(MED_ACK_KEY, {});
    markKeys((k) => {
      acks[k] = true;
    });
    saveJSON(MED_ACK_KEY, acks);
    // 복용 기록 저장 (가족 리포트에서 활용)
    const log = loadMedLog();
    const entry: MedLogEntry = {
      date: todayStr(),
      time: alarm.time,
      names: alarm.names,
      takenAt: new Date().toISOString(),
    };
    saveJSON(MED_LOG_KEY, [...log, entry].slice(-500));
    closeAlarm();
  }

  function handleSnooze() {
    const snoozes = loadJSON<Record<string, number>>(MED_SNOOZE_KEY, {});
    markKeys((k) => {
      snoozes[k] = Date.now() + 10 * 60 * 1000;
    });
    saveJSON(MED_SNOOZE_KEY, snoozes);
    closeAlarm();
  }

  function closeAlarm() {
    if (repeatTimerRef.current) {
      clearTimeout(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    dueRef.current = null;
    setDue(null);
  }

  if (!due || pathname !== "/") return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl p-7 w-full max-w-md text-center shadow-2xl">
        <div className="text-7xl mb-4 animate-bounce">💊</div>
        <h2 className="text-[26px] font-bold text-warm-gray mb-2">{t.title}</h2>
        <div className="flex flex-wrap justify-center gap-2 my-4">
          {due.names.map((n) => (
            <span
              key={n}
              className="px-4 py-2 bg-coral/10 text-coral rounded-full text-[20px] font-bold"
            >
              {n}
            </span>
          ))}
        </div>
        <p className="text-[15px] text-warm-gray-light mb-6">{t.sub}</p>
        <button
          onClick={handleTaken}
          className="w-full py-5 rounded-2xl text-[22px] font-bold bg-coral text-white shadow-lg shadow-coral/25 active:scale-95 transition-transform mb-3"
        >
          {t.taken}
        </button>
        <button
          onClick={handleSnooze}
          className="w-full py-4 rounded-2xl text-[17px] font-bold bg-warm-gray-light/15 text-warm-gray active:scale-95 transition-transform"
        >
          {t.later}
        </button>
      </div>
    </div>
  );
}
