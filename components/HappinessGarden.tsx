"use client";

import { useState, useEffect } from "react";

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

// 단계별 시각 요소
const STAGES = [
  { icon: "🌱", bg: "#F5F0E8", name: "씨앗", color: "#8D6E63" },
  { icon: "🌿", bg: "#E8F5E9", name: "새싹", color: "#4CAF50" },
  { icon: "🌷", bg: "#FCE4EC", name: "꽃봉오리", color: "#E91E63" },
  { icon: "🌸", bg: "#F3E5F5", name: "만개", color: "#9C27B0" },
  { icon: "🍎", bg: "#FFF3E0", name: "열매", color: "#FF9800" },
];

const THRESHOLDS = [0, 10, 25, 40, 60];

interface Props {
  userId: string;
  onClose: () => void;
}

export default function HappinessGarden({ userId, onClose }: Props) {
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
        <p style={{ fontSize: 18, color: "#8D6E63" }}>정원을 불러오는 중...</p>
      </div>
    );
  }

  if (!garden) {
    return (
      <div style={{ minHeight: "100vh", background: "#FFF8E1", padding: 20 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, color: "#8D6E63", cursor: "pointer" }}>← 돌아가기</button>
        <p style={{ textAlign: "center", marginTop: 40, fontSize: 18, color: "#999" }}>정원 데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  const stageIdx = garden.stage - 1;
  const stage = STAGES[stageIdx];
  const prevThreshold = THRESHOLDS[stageIdx] || 0;
  const nextThreshold = garden.nextStageAt || 60;
  const progress = garden.canHarvest ? 100 : Math.min(100, ((garden.totalTickets - prevThreshold) / (nextThreshold - prevThreshold)) * 100);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${stage.bg} 0%, #FFF8E1 100%)`, position: "relative", overflow: "hidden" }}>
      {/* 축하 효과 */}
      {showCelebration && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "white", borderRadius: 24, padding: "40px 32px", textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉🍎🎊</div>
            <h2 style={{ fontSize: 24, color: "#FF9800", margin: "0 0 12px" }}>수확 완료!</h2>
            <p style={{ fontSize: 16, color: "#666", margin: 0 }}>ADHC 센터에서 선물을 받으세요!</p>
            <p style={{ fontSize: 14, color: "#999", marginTop: 8 }}>총 {garden.harvestCount + 1}번째 수확</p>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 16, color: "#8D6E63", cursor: "pointer", fontWeight: 600 }}>← 돌아가기</button>
        <span style={{ fontSize: 14, color: "#8D6E63" }}>수확 {garden.harvestCount}회</span>
      </div>

      <h1 style={{ textAlign: "center", fontSize: 22, color: "#5D4037", margin: "0 0 4px", fontWeight: 700 }}>행복 정원</h1>

      {/* 정원 시각화 */}
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{
          width: 160, height: 160, margin: "0 auto", borderRadius: "50%",
          background: `radial-gradient(circle, white 30%, ${stage.bg} 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px ${stage.color}30`,
          transition: "all 0.5s ease",
        }}>
          <span style={{ fontSize: 72, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>{stage.icon}</span>
        </div>
        <p style={{ fontSize: 20, fontWeight: 700, color: stage.color, margin: "12px 0 0" }}>{stage.name}</p>
        <p style={{ fontSize: 14, color: "#999", margin: "4px 0 0" }}>{garden.stage}단계</p>
      </div>

      {/* 연속 기록 */}
      {garden.streakDays > 0 && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{
            display: "inline-block", background: garden.streakDays >= 7 ? "#FF9800" : "#4CAF50",
            color: "white", borderRadius: 20, padding: "6px 16px", fontSize: 14, fontWeight: 600,
          }}>
            {garden.streakDays >= 7 ? "🔥 " : ""}
            {garden.streakDays}일 연속 대화 중!
          </span>
        </div>
      )}

      {/* 진행 바 */}
      <div style={{ margin: "0 24px 20px", background: "white", borderRadius: 16, padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: stage.color }}>{garden.totalTickets}장</span>
          {!garden.canHarvest && (
            <span style={{ fontSize: 14, color: "#999" }}>다음 단계: {nextThreshold}장</span>
          )}
          {garden.canHarvest && (
            <span style={{ fontSize: 14, color: "#FF9800", fontWeight: 600 }}>수확 가능!</span>
          )}
        </div>
        <div style={{ height: 12, background: "#F0F0F0", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 6, transition: "width 0.8s ease",
            width: `${progress}%`,
            background: garden.canHarvest
              ? "linear-gradient(90deg, #FF9800, #FF5722)"
              : `linear-gradient(90deg, ${stage.color}88, ${stage.color})`,
          }} />
        </div>

        {/* 단계 표시 */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {STAGES.map((s, i) => (
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
            {harvesting ? "수확 중..." : "🍎 열매 수확하기"}
          </button>
          <p style={{ fontSize: 13, color: "#999", marginTop: 8 }}>ADHC 센터에서 선물로 교환하세요!</p>
        </div>
      )}

      {/* 오늘의 활동 */}
      <div style={{ margin: "0 24px 24px", background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 16, color: "#5D4037", margin: "0 0 12px", fontWeight: 600 }}>오늘의 활동</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ActivityRow icon={today?.dailyChat ? "✅" : "⬜"} label="소연이와 대화" value="+1" done={!!today?.dailyChat} />
          <ActivityRow icon={today?.moodBonus ? "✅" : "⬜"} label="기분 좋은 하루" value="+1" done={!!today?.moodBonus} />
          {(today?.streakBonus || 0) > 0 && (
            <ActivityRow icon="🔥" label="연속 보너스" value={`+${today?.streakBonus}`} done={true} />
          )}
          {(today?.appointmentBonus || 0) > 0 && (
            <ActivityRow icon="📅" label="약속 이행" value={`+${today?.appointmentBonus}`} done={true} />
          )}
        </div>
        {today && (
          <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 12, paddingTop: 12, textAlign: "right" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#4CAF50" }}>오늘 +{today.totalToday}장</span>
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
