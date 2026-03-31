"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Appointment {
  id: string;
  title: string;
  type: string;
  location: string;
  scheduled_at: string;
  notes: string;
  source: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  hospital: { label: "병원", color: "#DC2626", bg: "#FEE2E2" },
  adhc: { label: "ADHC", color: "#2563EB", bg: "#DBEAFE" },
  pharmacy: { label: "약국", color: "#059669", bg: "#D1FAE5" },
  general: { label: "일정", color: "#6B7280", bg: "#F3F4F6" },
  other: { label: "기타", color: "#6B7280", bg: "#F3F4F6" },
};

export default function AppointmentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/appointments/detail?id=${id}`)
      .then((r) => r.json())
      .then((d) => { setAppt(d.appointment || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    setDeleting(true);
    await fetch("/api/appointments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.back();
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
    } catch { return iso; }
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return ""; }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#FFF8EE", fontFamily: "'Noto Sans KR', sans-serif" }}>
        <p style={{ color: "#999" }}>불러오는 중...</p>
      </div>
    );
  }

  if (!appt) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#FFF8EE", fontFamily: "'Noto Sans KR', sans-serif" }}>
        <p style={{ fontSize: 48 }}>📅</p>
        <p style={{ color: "#999", marginTop: 12 }}>일정을 찾을 수 없습니다</p>
        <button onClick={() => router.back()} style={{ marginTop: 16, padding: "10px 20px", background: "#FF6B35", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>
          돌아가기
        </button>
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[appt.type] || TYPE_LABELS.other;

  return (
    <div style={{ minHeight: "100dvh", background: "#FFF8EE", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#5C4F48", fontSize: 14, fontWeight: 500 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          돌아가기
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#3D3530" }}>일정 상세</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: "0 20px 32px" }}>
        {/* Type badge + Title */}
        <div style={{ background: "#FFFBF7", borderRadius: 20, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: typeInfo.bg, color: typeInfo.color, display: "inline-block", marginBottom: 12 }}>
            {typeInfo.label}
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3D3530", margin: "0 0 4px" }}>{appt.title}</h1>
          {appt.source === "ello_ai" && (
            <span style={{ fontSize: 11, color: "#A89B94" }}>소연이가 자동 저장</span>
          )}
        </div>

        {/* Date & Time */}
        <div style={{ background: "#FFFBF7", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>📅</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#3D3530", margin: 0 }}>{formatDate(appt.scheduled_at)}</p>
              <p style={{ fontSize: 13, color: "#FF6B35", fontWeight: 600, margin: "2px 0 0" }}>{formatTime(appt.scheduled_at)}</p>
            </div>
          </div>
        </div>

        {/* Location */}
        {appt.location && (
          <div style={{ background: "#FFFBF7", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📍</span>
              <p style={{ fontSize: 15, color: "#3D3530", margin: 0 }}>{appt.location}</p>
            </div>
          </div>
        )}

        {/* Notes */}
        {appt.notes && (
          <div style={{ background: "#FFFBF7", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <p style={{ fontSize: 14, color: "#5C4F48", margin: 0, lineHeight: 1.6 }}>{appt.notes}</p>
            </div>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            width: "100%", padding: 16, marginTop: 20,
            fontSize: 16, fontWeight: 700,
            background: "#fff", color: "#EF4444",
            border: "1px solid #FEE2E2", borderRadius: 16,
            cursor: deleting ? "default" : "pointer",
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {deleting ? "삭제 중..." : "일정 삭제"}
        </button>
      </div>
    </div>
  );
}
