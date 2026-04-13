"use client";

import { useState, useEffect } from "react";

interface Appointment {
  id: string;
  elder_id: string;
  title: string;
  type: string;
  location: string;
  scheduled_at: string;
  notes: string;
  source: string;
  created_at: string;
}

// 다국어 텍스트
const REMIND_I18N: Record<string, {
  back: string; header: string; title: string;
  loading: string; emptyMain: string; emptySub: string; tip: string;
  types: { hospital: string; adhc: string; pharmacy: string; general: string; other: string };
  months: string[]; days: string[]; am: string; pm: string;
  dateFmt: (m: string, d: number, w: string) => string;
  timeFmt: (ampm: string, h: number, min: string) => string;
}> = {
  ko: {
    back: "돌아가기", header: "일정", title: "예약 / 일정",
    loading: "불러오는 중...", emptyMain: "아직 저장된 일정이 없어요",
    emptySub: "소연이와 대화하면서 약속이나 예약을 말씀해보세요",
    tip: '소연이에게 "병원 예약"이나 "약속" 얘기를 하면 자동으로 일정이 저장돼요',
    types: { hospital: "병원", adhc: "ADHC", pharmacy: "약국", general: "일정", other: "기타" },
    months: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
    days: ["일","월","화","수","목","금","토"], am: "오전", pm: "오후",
    dateFmt: (m, d, w) => `${m} ${d}일 (${w})`,
    timeFmt: (ampm, h, min) => `${ampm} ${h}:${min}`,
  },
  en: {
    back: "Back", header: "Schedule", title: "Appointments / Schedule",
    loading: "Loading...", emptyMain: "No appointments saved yet",
    emptySub: "Talk to Sophie about your appointments and they'll be saved automatically",
    tip: 'Tell Sophie about a "doctor visit" or "appointment" and it will be saved automatically',
    types: { hospital: "Hospital", adhc: "ADHC", pharmacy: "Pharmacy", general: "Schedule", other: "Other" },
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], am: "AM", pm: "PM",
    dateFmt: (m, d, w) => `${m} ${d} (${w})`,
    timeFmt: (ampm, h, min) => `${h}:${min} ${ampm}`,
  },
  es: {
    back: "Volver", header: "Horario", title: "Citas / Horario",
    loading: "Cargando...", emptyMain: "Aún no hay citas guardadas",
    emptySub: "Habla con Sofía sobre tus citas y se guardarán automáticamente",
    tip: 'Cuéntale a Sofía sobre una "cita médica" y se guardará automáticamente',
    types: { hospital: "Hospital", adhc: "ADHC", pharmacy: "Farmacia", general: "Horario", other: "Otro" },
    months: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
    days: ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"], am: "AM", pm: "PM",
    dateFmt: (m, d, w) => `${d} ${m} (${w})`,
    timeFmt: (ampm, h, min) => `${h}:${min} ${ampm}`,
  },
  zh: {
    back: "返回", header: "日程", title: "预约 / 日程",
    loading: "加载中...", emptyMain: "还没有保存的日程",
    emptySub: "和小燕聊天时说说你的预约或约会吧",
    tip: '告诉小燕"医院预约"或"约会"，会自动保存日程',
    types: { hospital: "医院", adhc: "ADHC", pharmacy: "药店", general: "日程", other: "其他" },
    months: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    days: ["日","一","二","三","四","五","六"], am: "上午", pm: "下午",
    dateFmt: (m, d, w) => `${m}${d}日 (${w})`,
    timeFmt: (ampm, h, min) => `${ampm} ${h}:${min}`,
  },
  vi: {
    back: "Quay lại", header: "Lịch", title: "Cuộc hẹn / Lịch trình",
    loading: "Đang tải...", emptyMain: "Chưa có lịch hẹn nào",
    emptySub: "Hãy nói chuyện với Lan về các cuộc hẹn của bạn",
    tip: 'Hãy nói với Lan về "lịch hẹn bác sĩ" và nó sẽ được lưu tự động',
    types: { hospital: "Bệnh viện", adhc: "ADHC", pharmacy: "Nhà thuốc", general: "Lịch", other: "Khác" },
    months: ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"],
    days: ["CN","T2","T3","T4","T5","T6","T7"], am: "Sáng", pm: "Chiều",
    dateFmt: (m, d, w) => `${d} ${m} (${w})`,
    timeFmt: (ampm, h, min) => `${h}:${min} ${ampm}`,
  },
  ja: {
    back: "戻る", header: "予定", title: "予約 / 予定",
    loading: "読み込み中...", emptyMain: "まだ保存された予定はありません",
    emptySub: "さくらとお話しするときに予約や約束を教えてください",
    tip: 'さくらに「病院の予約」や「約束」を伝えると、自動で予定が保存されます',
    types: { hospital: "病院", adhc: "ADHC", pharmacy: "薬局", general: "予定", other: "その他" },
    months: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    days: ["日","月","火","水","木","金","土"], am: "午前", pm: "午後",
    dateFmt: (m, d, w) => `${m}${d}日 (${w})`,
    timeFmt: (ampm, h, min) => `${ampm} ${h}:${min}`,
  },
};

// 자주 저장되는 한국어 제목/장소 → 다국어 매핑
const TITLE_MAP: Record<string, Record<string, string>> = {
  "병원 예약": { en: "Doctor Appointment", es: "Cita médica", zh: "医院预约", vi: "Lịch hẹn bác sĩ", ja: "病院の予約" },
  "병원": { en: "Hospital", es: "Hospital", zh: "医院", vi: "Bệnh viện", ja: "病院" },
  "약속": { en: "Appointment", es: "Cita", zh: "约会", vi: "Cuộc hẹn", ja: "約束" },
  "약국": { en: "Pharmacy", es: "Farmacia", zh: "药店", vi: "Nhà thuốc", ja: "薬局" },
  "ADHC": { en: "ADHC", es: "ADHC", zh: "ADHC", vi: "ADHC", ja: "ADHC" },
  "ADHC 방문": { en: "ADHC Visit", es: "Visita ADHC", zh: "ADHC访问", vi: "Đến ADHC", ja: "ADHC訪問" },
};

function translateContent(text: string, langCode: string): string {
  if (!text || langCode === "ko") return text;
  // 정확 매칭 우선
  if (TITLE_MAP[text] && TITLE_MAP[text][langCode]) return TITLE_MAP[text][langCode];
  // 부분 매칭으로 치환
  let result = text;
  for (const [ko, translations] of Object.entries(TITLE_MAP)) {
    if (translations[langCode]) {
      result = result.replace(new RegExp(ko, "g"), translations[langCode]);
    }
  }
  // 시간 표현 번역
  if (langCode !== "ko") {
    result = result.replace(/오전/g, langCode === "en" ? "AM" : langCode === "es" ? "AM" : langCode === "ja" ? "午前" : langCode === "zh" ? "上午" : "Sáng");
    result = result.replace(/오후/g, langCode === "en" ? "PM" : langCode === "es" ? "PM" : langCode === "ja" ? "午後" : langCode === "zh" ? "下午" : "Chiều");
    result = result.replace(/(\d+)시/g, (_, h) => langCode === "en" || langCode === "es" || langCode === "vi" ? `${h}:00` : `${h}时`);
  }
  return result;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  hospital: { bg: "#FEE2E2", text: "#DC2626" },
  adhc: { bg: "#DBEAFE", text: "#2563EB" },
  pharmacy: { bg: "#D1FAE5", text: "#059669" },
  general: { bg: "#F3F4F6", text: "#6B7280" },
  other: { bg: "#F3F4F6", text: "#6B7280" },
};

interface RemindersPageProps {
  onClose: () => void;
  userId?: string;
  langCode?: string;
}

export default function RemindersPage({ onClose, userId, langCode = "ko" }: RemindersPageProps) {
  const t = REMIND_I18N[langCode] || REMIND_I18N.ko;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = userId && userId !== "default" ? userId : localStorage.getItem("ello-userId") || "default";
    console.log("[reminders] userId:", uid);
    fetchAppointments(uid);
  }, [userId]);

  async function fetchAppointments(uid: string) {
    try {
      const res = await fetch(`/api/appointments?userId=${uid}`);
      const data = await res.json();
      const sorted = (data.appointments || []).sort(
        (a: Appointment, b: Appointment) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
      setAppointments(sorted);
    } catch (err) {
      console.error("[reminders] Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch("/api/appointments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("[reminders] Delete failed:", err);
    }
  }

  function formatDate(iso: string): string {
    if (!iso) return "";
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return iso;
    const [, y, m, d] = match;
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return t.dateFmt(t.months[parseInt(m) - 1], parseInt(d), t.days[date.getDay()]);
  }

  function formatTime(iso: string): string {
    if (!iso) return "";
    const match = iso.match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const h = parseInt(match[1]);
    const m = match[2];
    const ampm = h < 12 ? t.am : t.pm;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return t.timeFmt(ampm, h12, m);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 390, margin: "0 auto", background: "#FFF8EE", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#5C4F48", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          {t.back}
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#3D3530" }}>{t.header}</span>
        <div style={{ width: 64 }} />
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
          <span style={{ fontSize: 28 }}>📅</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#3D3530", margin: 0 }}>{t.title}</h1>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "48px 0", color: "#A89B94" }}>{t.loading}</p>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <span style={{ fontSize: 48 }}>💭</span>
            <p style={{ color: "#A89B94", fontSize: 14, marginTop: 12 }}>{t.emptyMain}</p>
            <p style={{ color: "#A89B94", fontSize: 12, marginTop: 4 }}>{t.emptySub}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {appointments.map((a) => {
              const colors = TYPE_COLORS[a.type] || TYPE_COLORS.other;
              const typeLabel = t.types[a.type as keyof typeof t.types] || t.types.other;
              const dateStr = formatDate(a.scheduled_at);
              const timeStr = formatTime(a.scheduled_at);

              return (
                <div key={a.id} onClick={() => window.location.href = `/appointments/${a.id}`} style={{ background: "#FFFBF7", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: colors.bg, color: colors.text }}>
                        {typeLabel}
                      </span>
                      <span style={{ fontSize: 13, color: "#FF6B35", fontWeight: 600 }}>{dateStr}</span>
                      {timeStr && <span style={{ fontSize: 12, color: "#A89B94" }}>{timeStr}</span>}
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#3D3530", margin: 0 }}>{translateContent(a.title, langCode)}</p>
                    {a.location && <p style={{ fontSize: 12, color: "#A89B94", marginTop: 4 }}>📍 {translateContent(a.location, langCode)}</p>}
                    {a.notes && <p style={{ fontSize: 12, color: "#A89B94", marginTop: 2 }}>{translateContent(a.notes, langCode)}</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(a.id); }} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 16, background: "#FEF2F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div style={{ marginTop: 24, background: "#FFE6D9", borderRadius: 16, padding: 16, textAlign: "center" }}>
          <p style={{ color: "#E55A2B", fontSize: 13 }}>{t.tip}</p>
        </div>
      </div>
    </div>
  );
}
