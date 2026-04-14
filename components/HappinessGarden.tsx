"use client";

import { useState, useEffect } from "react";
import GardenScene from "./GardenScene";
// i18n translations are defined inline below

interface GardenData {
  totalTickets: number;
  stage: number;
  stageName: string;
  nextStageAt: number;
  streakDays: number;
  harvestCount: number;
  canHarvest: boolean;
}

interface TodayData {
  dailyChat: boolean;
  moodBonus: boolean;
  streakBonus: number;
  appointmentBonus: number;
  totalToday: number;
}

// 다국어 텍스트
const GARDEN_I18N: Record<string, {
  title: string; back: string; harvest: string; harvestCount: string;
  loading: string; noData: string; nextStage: string; harvestReady: string;
  tickets: string; streakDays: string; todayActivity: string;
  chatLabel: string; moodLabel: string; streakLabel: string; appointLabel: string;
  todayTotal: string; harvestBtn: string; harvesting: string;
  celebTitle: string; celebMsg: string; celebSub: string;
  stages: string[];
}> = {
  ko: {
    title: "행복 정원", back: "← 돌아가기", harvest: "수확", harvestCount: "회",
    loading: "정원을 불러오는 중...", noData: "정원 데이터를 불러올 수 없습니다",
    nextStage: "다음 단계:", harvestReady: "수확 가능!", tickets: "장",
    streakDays: "일 연속 대화 중!", todayActivity: "오늘의 활동",
    chatLabel: "소연이와 대화", moodLabel: "기분 좋은 하루",
    streakLabel: "연속 보너스", appointLabel: "약속 이행",
    todayTotal: "오늘", harvestBtn: "🍎 열매 수확하기", harvesting: "수확 중...",
    celebTitle: "수확 완료!", celebMsg: "ADHC 센터에서 선물을 받으세요!",
    celebSub: "번째 수확", stages: ["씨앗", "새싹", "꽃봉오리", "만개", "열매"],
  },
  en: {
    title: "Happiness Garden", back: "← Back", harvest: "Harvest", harvestCount: " times",
    loading: "Loading garden...", noData: "Unable to load garden data",
    nextStage: "Next stage:", harvestReady: "Ready to harvest!", tickets: " tickets",
    streakDays: " day streak!", todayActivity: "Today's Activity",
    chatLabel: "Chat with Sophie", moodLabel: "Happy day bonus",
    streakLabel: "Streak bonus", appointLabel: "Appointment kept",
    todayTotal: "Today", harvestBtn: "🍎 Harvest Fruit", harvesting: "Harvesting...",
    celebTitle: "Harvest Complete!", celebMsg: "Claim your gift at the ADHC center!",
    celebSub: " harvest", stages: ["Seed", "Sprout", "Bud", "Bloom", "Fruit"],
  },
  es: {
    title: "Jardín de Felicidad", back: "← Volver", harvest: "Cosecha", harvestCount: " veces",
    loading: "Cargando jardín...", noData: "No se pudo cargar el jardín",
    nextStage: "Siguiente etapa:", harvestReady: "¡Listo para cosechar!", tickets: " boletos",
    streakDays: " días seguidos!", todayActivity: "Actividad de Hoy",
    chatLabel: "Charlar con Sofía", moodLabel: "Día feliz",
    streakLabel: "Bono de racha", appointLabel: "Cita cumplida",
    todayTotal: "Hoy", harvestBtn: "🍎 Cosechar Fruta", harvesting: "Cosechando...",
    celebTitle: "¡Cosecha completa!", celebMsg: "¡Reclama tu regalo en el centro ADHC!",
    celebSub: "ª cosecha", stages: ["Semilla", "Brote", "Capullo", "Flor", "Fruta"],
  },
  zh: {
    title: "幸福花园", back: "← 返回", harvest: "收获", harvestCount: " 次",
    loading: "正在加载花园...", noData: "无法加载花园数据",
    nextStage: "下一阶段:", harvestReady: "可以收获!", tickets: " 张",
    streakDays: " 天连续对话!", todayActivity: "今日活动",
    chatLabel: "与小燕聊天", moodLabel: "开心一天",
    streakLabel: "连续奖励", appointLabel: "按时赴约",
    todayTotal: "今天", harvestBtn: "🍎 收获果实", harvesting: "收获中...",
    celebTitle: "收获完成!", celebMsg: "在ADHC中心领取礼物!",
    celebSub: " 次收获", stages: ["种子", "嫩芽", "花苞", "盛开", "果实"],
  },
  vi: {
    title: "Vườn Hạnh Phúc", back: "← Quay lại", harvest: "Thu hoạch", harvestCount: " lần",
    loading: "Đang tải vườn...", noData: "Không thể tải dữ liệu vườn",
    nextStage: "Giai đoạn tiếp:", harvestReady: "Sẵn sàng thu hoạch!", tickets: " vé",
    streakDays: " ngày liên tiếp!", todayActivity: "Hoạt động hôm nay",
    chatLabel: "Trò chuyện với Lan", moodLabel: "Ngày vui",
    streakLabel: "Thưởng liên tiếp", appointLabel: "Giữ lịch hẹn",
    todayTotal: "Hôm nay", harvestBtn: "🍎 Thu hoạch", harvesting: "Đang thu hoạch...",
    celebTitle: "Thu hoạch xong!", celebMsg: "Nhận quà tại trung tâm ADHC!",
    celebSub: " lần thu hoạch", stages: ["Hạt giống", "Mầm", "Nụ", "Nở", "Quả"],
  },
  ja: {
    title: "幸せの庭", back: "← 戻る", harvest: "収穫", harvestCount: " 回",
    loading: "庭を読み込み中...", noData: "庭のデータを読み込めません",
    nextStage: "次のステージ:", harvestReady: "収穫可能!", tickets: " 枚",
    streakDays: " 日連続!", todayActivity: "今日の活動",
    chatLabel: "さくらとおしゃべり", moodLabel: "いい気分の日",
    streakLabel: "連続ボーナス", appointLabel: "約束を守った",
    todayTotal: "今日", harvestBtn: "🍎 果実を収穫", harvesting: "収穫中...",
    celebTitle: "収穫完了!", celebMsg: "ADHCセンターでプレゼントを受け取ろう!",
    celebSub: " 回目の収穫", stages: ["種", "芽", "つぼみ", "満開", "果実"],
  },
};

// 단계별 시각 요소
const STAGE_VISUALS = [
  { icon: "🌱", bg: "#F5F0E8", color: "#8D6E63" },
  { icon: "🌿", bg: "#E8F5E9", color: "#4CAF50" },
  { icon: "🌷", bg: "#FCE4EC", color: "#E91E63" },
  { icon: "🌸", bg: "#F3E5F5", color: "#9C27B0" },
  { icon: "🍎", bg: "#FFF3E0", color: "#FF9800" },
];

const THRESHOLDS = [0, 10, 25, 40, 60];

interface Props {
  userId: string;
  onClose: () => void;
  langCode?: string;
}

export default function HappinessGarden({ userId, onClose, langCode = "ko" }: Props) {
  const t = GARDEN_I18N[langCode] || GARDEN_I18N.ko;
  const [garden, setGarden] = useState<GardenData | null>(null);
  const [today, setToday] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [harvesting, setHarvesting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (userId && userId !== "default") fetchGarden();
  }, [userId]);

  async function fetchGarden() {
    try {
      const res = await fetch(`/api/tickets?userId=${userId}`);
      const data = await res.json();
      setGarden(data.garden);
      setToday(data.today);
    } catch (err) {
      console.error("[garden] Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleHarvest() {
    if (!garden?.canHarvest) return;
    setHarvesting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.harvested) {
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          fetchGarden();
        }, 3000);
      }
    } catch (err) {
      console.error("[garden] Harvest failed:", err);
    } finally {
      setHarvesting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFF8E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 18, color: "#8D6E63" }}>{t.loading}</p>
      </div>
    );
  }

  if (!garden) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFF8E1", padding: 20 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, color: "#8D6E63", cursor: "pointer" }}>{t.back}</button>
        <p style={{ textAlign: "center", marginTop: 40, fontSize: 18, color: "#999" }}>{t.noData}</p>
      </div>
    );
  }

  const stageIdx = garden.stage - 1;
  const stageVisual = STAGE_VISUALS[stageIdx];
  const stageName = t.stages[stageIdx];
  const prevThreshold = THRESHOLDS[stageIdx] || 0;
  const nextThreshold = garden.nextStageAt || 60;
  const progress = garden.canHarvest ? 100 : Math.min(100, ((garden.totalTickets - prevThreshold) / (nextThreshold - prevThreshold)) * 100);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${stageVisual.bg} 0%, #FFF8E1 100%)`, position: "relative", overflow: "hidden" }}>
      {/* 축하 효과 */}
      {showCelebration && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 24, padding: "40px 32px", textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉🍎🎊</div>
            <h2 style={{ fontSize: 24, color: "#FF9800", margin: "0 0 12px" }}>{t.celebTitle}</h2>
            <p style={{ fontSize: 16, color: "#666", margin: 0 }}>{t.celebMsg}</p>
            <p style={{ fontSize: 14, color: "#999", marginTop: 8 }}>{garden.harvestCount + 1}{t.celebSub}</p>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, color: "#8D6E63", cursor: "pointer", fontWeight: 600 }}>{t.back}</button>
        <span style={{ fontSize: 14, color: "#8D6E63" }}>{t.harvest} {garden.harvestCount}{t.harvestCount}</span>
      </div>

      <h1 style={{ textAlign: "center", fontSize: 22, color: "#5D4037", margin: "0 0 4px", fontWeight: 700 }}>{t.title}</h1>

      {/* 정원 시각화 */}
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ margin: "0 auto", display: "inline-block" }}>
          <GardenScene stage={garden.stage} size={240} />
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: stageVisual.color, margin: "12px 0 0" }}>{stageName}</p>
        <p style={{ fontSize: 14, color: "#999", margin: "4px 0 0" }}>Stage {garden.stage}</p>
      </div>

      {/* 연속 기록 */}
      {garden.streakDays > 0 && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{
            display: "inline-block", background: garden.streakDays >= 7 ? "#FF9800" : "#4CAF50",
            color: "white", borderRadius: 20, padding: "6px 16px", fontSize: 14, fontWeight: 600,
          }}>
            {garden.streakDays >= 7 ? "🔥 " : ""}
            {garden.streakDays}{t.streakDays}
          </span>
        </div>
      )}

      {/* 진행 바 */}
      <div style={{ margin: "0 24px 20px", background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: stageVisual.color }}>{garden.totalTickets}{t.tickets}</span>
          {!garden.canHarvest && (
            <span style={{ fontSize: 14, color: "#999" }}>{t.nextStage} {nextThreshold}{t.tickets}</span>
          )}
          {garden.canHarvest && (
            <span style={{ fontSize: 14, color: "#FF9800", fontWeight: 600 }}>{t.harvestReady}</span>
          )}
        </div>
        <div style={{ height: 12, background: "#F0F0F0", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 6, transition: "width 0.8s ease",
            width: `${progress}%`,
            background: garden.canHarvest
              ? "linear-gradient(90deg, #FF9800, #FF5722)"
              : `linear-gradient(90deg, ${stageVisual.color}88, ${stageVisual.color})`,
          }} />
        </div>

        {/* 단계 표시 */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {STAGE_VISUALS.map((s, i) => (
            <div key={i} style={{ textAlign: "center", opacity: i <= stageIdx ? 1 : 0.3 }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <div style={{ fontSize: 10, color: "#999" }}>{THRESHOLDS[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 수확 버튼 */}
      {garden.canHarvest && (
        <div style={{ textAlign: "center", margin: "0 24px 20px" }}>
          <button
            onClick={handleHarvest}
            disabled={harvesting}
            style={{
              width: "100%", padding: "16px", fontSize: 18, fontWeight: 700,
              background: "linear-gradient(135deg, #FF9800, #FF5722)",
              color: "white", border: "none", borderRadius: 16, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(255,152,0,0.4)",
              opacity: harvesting ? 0.6 : 1,
            }}
          >
            {harvesting ? t.harvesting : t.harvestBtn}
          </button>
          <p style={{ fontSize: 13, color: "#999", marginTop: 8 }}>{t.celebMsg}</p>
        </div>
      )}

      {/* 오늘의 활동 */}
      <div style={{ margin: "0 24px 24px", background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 16, color: "#5D4037", margin: "0 0 12px", fontWeight: 600 }}>{t.todayActivity}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ActivityRow icon={today?.dailyChat ? "✅" : "⬜"} label={t.chatLabel} value="+1" done={!!today?.dailyChat} />
          <ActivityRow icon={today?.moodBonus ? "✅" : "⬜"} label={t.moodLabel} value="+1" done={!!today?.moodBonus} />
          {(today?.streakBonus || 0) > 0 && (
            <ActivityRow icon="🔥" label={t.streakLabel} value={`+${today?.streakBonus}`} done={true} />
          )}
          {(today?.appointmentBonus || 0) > 0 && (
            <ActivityRow icon="📅" label={t.appointLabel} value={`+${today?.appointmentBonus}`} done={true} />
          )}
        </div>
        {today && (
          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 12, paddingTop: 12, textAlign: "right" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#4CAF50" }}>{t.todayTotal} +{today.totalToday}{t.tickets}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ icon, label, value, done }: { icon: string; label: string; value: string; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 15, color: done ? "#333" : "#BBB" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: done ? "#4CAF50" : "#DDD" }}>{value}</span>
    </div>
  );
}
