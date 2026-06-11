"use client";

import { useState, useEffect } from "react";

/* ── Shared types & storage helpers (used by MedicationAlarm too) ── */
export interface Medication {
  id: string;
  name: string;
  times: string[]; // "HH:MM" (24h)
  enabled: boolean;
}

export const MEDS_KEY = "ello-medications";
export const MED_LOG_KEY = "ello-med-log";
export const MED_ACK_KEY = "ello-med-ack";
export const MED_SNOOZE_KEY = "ello-med-snooze";

export function loadMeds(): Medication[] {
  try {
    const raw = localStorage.getItem(MEDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMeds(meds: Medication[]) {
  try {
    localStorage.setItem(MEDS_KEY, JSON.stringify(meds));
  } catch {}
}

export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export interface MedLogEntry {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  names: string[];
  takenAt: string; // ISO
}

export function loadMedLog(): MedLogEntry[] {
  try {
    const raw = localStorage.getItem(MED_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ── i18n ── */
const MED_I18N: Record<
  string,
  {
    back: string;
    header: string;
    empty: string;
    emptySub: string;
    add: string;
    namePlaceholder: string;
    timesLabel: string;
    presets: { morning: string; noon: string; evening: string; night: string };
    customTime: string;
    save: string;
    cancel: string;
    remove: string;
    needNameTime: string;
    takenToday: string;
    am: string;
    pm: string;
    alarmNote: string;
  }
> = {
  ko: {
    back: "돌아가기",
    header: "약 챙겨먹기",
    empty: "아직 등록된 약이 없어요",
    emptySub: "아래 버튼을 눌러 드시는 약을 등록해보세요",
    add: "+ 약 등록하기",
    namePlaceholder: "약 이름 (예: 혈압약)",
    timesLabel: "드시는 시간",
    presets: { morning: "아침 8:00", noon: "점심 12:30", evening: "저녁 6:30", night: "자기 전 9:00" },
    customTime: "직접 시간 정하기",
    save: "저장하기",
    cancel: "취소",
    remove: "삭제",
    needNameTime: "약 이름과 시간을 넣어주세요",
    takenToday: "오늘 드셨어요",
    am: "오전",
    pm: "오후",
    alarmNote: "시간이 되면 화면과 음성으로 알려드려요 (앱이 켜져 있을 때)",
  },
  en: {
    back: "Back",
    header: "My Medications",
    empty: "No medications added yet",
    emptySub: "Tap the button below to add your medication",
    add: "+ Add medication",
    namePlaceholder: "Medication name (e.g. blood pressure)",
    timesLabel: "Times to take",
    presets: { morning: "Morning 8:00", noon: "Noon 12:30", evening: "Evening 6:30", night: "Bedtime 9:00" },
    customTime: "Custom time",
    save: "Save",
    cancel: "Cancel",
    remove: "Delete",
    needNameTime: "Please enter a name and time",
    takenToday: "Taken today",
    am: "AM",
    pm: "PM",
    alarmNote: "You'll get a screen + voice reminder when it's time (while the app is open)",
  },
  es: {
    back: "Volver",
    header: "Mis Medicinas",
    empty: "Aún no hay medicinas",
    emptySub: "Toca el botón para agregar tu medicina",
    add: "+ Agregar medicina",
    namePlaceholder: "Nombre (ej. presión arterial)",
    timesLabel: "Horas de tomar",
    presets: { morning: "Mañana 8:00", noon: "Mediodía 12:30", evening: "Tarde 6:30", night: "Noche 9:00" },
    customTime: "Hora personalizada",
    save: "Guardar",
    cancel: "Cancelar",
    remove: "Eliminar",
    needNameTime: "Ingresa nombre y hora",
    takenToday: "Tomada hoy",
    am: "AM",
    pm: "PM",
    alarmNote: "Recibirás un recordatorio con voz cuando sea la hora (con la app abierta)",
  },
  zh: {
    back: "返回",
    header: "我的药物",
    empty: "还没有添加药物",
    emptySub: "点击下方按钮添加您的药物",
    add: "+ 添加药物",
    namePlaceholder: "药名(例:降压药)",
    timesLabel: "服药时间",
    presets: { morning: "早上 8:00", noon: "中午 12:30", evening: "晚上 6:30", night: "睡前 9:00" },
    customTime: "自定义时间",
    save: "保存",
    cancel: "取消",
    remove: "删除",
    needNameTime: "请输入药名和时间",
    takenToday: "今天已服用",
    am: "上午",
    pm: "下午",
    alarmNote: "到时间会有屏幕和语音提醒(应用打开时)",
  },
  vi: {
    back: "Quay lại",
    header: "Thuốc của tôi",
    empty: "Chưa có thuốc nào",
    emptySub: "Nhấn nút bên dưới để thêm thuốc",
    add: "+ Thêm thuốc",
    namePlaceholder: "Tên thuốc (vd: thuốc huyết áp)",
    timesLabel: "Giờ uống thuốc",
    presets: { morning: "Sáng 8:00", noon: "Trưa 12:30", evening: "Chiều 6:30", night: "Trước khi ngủ 9:00" },
    customTime: "Chọn giờ khác",
    save: "Lưu",
    cancel: "Hủy",
    remove: "Xóa",
    needNameTime: "Vui lòng nhập tên và giờ",
    takenToday: "Đã uống hôm nay",
    am: "SA",
    pm: "CH",
    alarmNote: "Sẽ có nhắc nhở bằng màn hình và giọng nói khi đến giờ (khi app đang mở)",
  },
  ja: {
    back: "戻る",
    header: "お薬の管理",
    empty: "まだお薬が登録されていません",
    emptySub: "下のボタンからお薬を登録してください",
    add: "+ お薬を登録",
    namePlaceholder: "お薬の名前(例:血圧の薬)",
    timesLabel: "飲む時間",
    presets: { morning: "朝 8:00", noon: "昼 12:30", evening: "夜 6:30", night: "寝る前 9:00" },
    customTime: "時間を指定",
    save: "保存",
    cancel: "キャンセル",
    remove: "削除",
    needNameTime: "名前と時間を入力してください",
    takenToday: "今日飲みました",
    am: "午前",
    pm: "午後",
    alarmNote: "時間になると画面と音声でお知らせします(アプリ起動中)",
  },
};

const PRESET_TIMES: { key: "morning" | "noon" | "evening" | "night"; time: string }[] = [
  { key: "morning", time: "08:00" },
  { key: "noon", time: "12:30" },
  { key: "evening", time: "18:30" },
  { key: "night", time: "21:00" },
];

function formatTime(t: string, i18n: { am: string; pm: string }): string {
  const [hStr, m] = t.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h < 12 ? i18n.am : i18n.pm;
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return `${ampm} ${h}:${m}`;
}

/* ── Component ── */
export default function MedicationPage({
  onClose,
  langCode,
}: {
  onClose: () => void;
  langCode: string;
}) {
  const t = MED_I18N[langCode] || MED_I18N.ko;
  const [meds, setMeds] = useState<Medication[]>([]);
  const [takenKeys, setTakenKeys] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [selTimes, setSelTimes] = useState<string[]>([]);
  const [customTime, setCustomTime] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setMeds(loadMeds());
    const today = todayStr();
    const keys = new Set<string>();
    loadMedLog().forEach((e) => {
      if (e.date === today) keys.add(e.time);
    });
    setTakenKeys(keys);
  }, []);

  function persist(next: Medication[]) {
    setMeds(next);
    saveMeds(next);
  }

  function toggleTime(time: string) {
    setSelTimes((prev) =>
      prev.includes(time) ? prev.filter((x) => x !== time) : [...prev, time].sort()
    );
  }

  function handleSave() {
    const times = [...selTimes];
    if (customTime && !times.includes(customTime)) times.push(customTime);
    times.sort();
    if (!name.trim() || times.length === 0) {
      setFormError(t.needNameTime);
      return;
    }
    const med: Medication = {
      id: `med-${Date.now()}`,
      name: name.trim(),
      times,
      enabled: true,
    };
    persist([...meds, med]);
    setName("");
    setSelTimes([]);
    setCustomTime("");
    setFormError("");
    setAdding(false);
  }

  function handleRemove(id: string) {
    persist(meds.filter((m) => m.id !== id));
  }

  function handleToggle(id: string) {
    persist(meds.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m)));
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-warm-gray-light/15 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-coral font-bold text-[16px] active:scale-95 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t.back}
        </button>
        <h1 className="text-[20px] font-bold text-warm-gray flex-1 text-center pr-16">
          💊 {t.header}
        </h1>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg w-full mx-auto">
        <p className="text-[14px] text-warm-gray-light text-center mb-5">{t.alarmNote}</p>

        {/* Medication list */}
        {meds.length === 0 && !adding && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-5xl mb-3">💊</div>
            <p className="text-[18px] font-bold text-warm-gray mb-1">{t.empty}</p>
            <p className="text-[14px] text-warm-gray-light">{t.emptySub}</p>
          </div>
        )}

        <div className="space-y-3">
          {meds.map((med) => (
            <div
              key={med.id}
              className={`bg-white rounded-2xl p-5 shadow-sm ${med.enabled ? "" : "opacity-50"}`}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[20px] font-bold text-warm-gray">💊 {med.name}</p>
                <button
                  onClick={() => handleToggle(med.id)}
                  className={`w-[52px] h-[30px] rounded-full transition-colors relative ${
                    med.enabled ? "bg-coral" : "bg-warm-gray-light/30"
                  }`}
                  aria-label={med.enabled ? "off" : "on"}
                >
                  <span
                    className={`absolute top-[3px] w-[24px] h-[24px] bg-white rounded-full shadow transition-all ${
                      med.enabled ? "left-[25px]" : "left-[3px]"
                    }`}
                  />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {med.times.map((time) => {
                  const taken = takenKeys.has(time);
                  return (
                    <span
                      key={time}
                      className={`px-3 py-1.5 rounded-full text-[15px] font-semibold ${
                        taken
                          ? "bg-green-100 text-green-700"
                          : "bg-coral/10 text-coral"
                      }`}
                    >
                      {formatTime(time, t)} {taken ? `✓ ${t.takenToday}` : ""}
                    </span>
                  );
                })}
              </div>
              <button
                onClick={() => handleRemove(med.id)}
                className="text-[13px] text-red-400 font-semibold"
              >
                {t.remove}
              </button>
            </div>
          ))}
        </div>

        {/* Add form */}
        {adding ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm mt-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full px-4 py-3.5 text-[18px] bg-cream rounded-xl border border-warm-gray-light/20 text-warm-gray placeholder:text-warm-gray-light/60 focus:outline-none focus:border-coral/40 mb-4"
            />
            <p className="text-[15px] font-bold text-warm-gray mb-2">{t.timesLabel}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRESET_TIMES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => toggleTime(p.time)}
                  className={`py-3.5 rounded-xl text-[16px] font-bold transition-colors ${
                    selTimes.includes(p.time)
                      ? "bg-coral text-white"
                      : "bg-coral/10 text-coral"
                  }`}
                >
                  {t.presets[p.key]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[14px] text-warm-gray-light shrink-0">{t.customTime}</span>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="px-3 py-2 text-[16px] bg-cream rounded-xl border border-warm-gray-light/20 text-warm-gray"
              />
            </div>
            {formError && (
              <p className="text-[14px] text-red-500 font-semibold mb-3">{formError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAdding(false);
                  setFormError("");
                }}
                className="flex-1 py-4 rounded-xl text-[17px] font-bold bg-warm-gray-light/15 text-warm-gray"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-4 rounded-xl text-[17px] font-bold bg-coral text-white active:scale-95 transition-transform"
              >
                {t.save}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full mt-5 py-5 rounded-2xl text-[19px] font-bold bg-coral text-white shadow-lg shadow-coral/20 active:scale-95 transition-transform"
          >
            {t.add}
          </button>
        )}
      </main>
    </div>
  );
}
