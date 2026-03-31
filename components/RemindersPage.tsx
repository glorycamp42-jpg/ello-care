"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  hospital: { bg: "#FEE2E2", text: "#DC2626", label: "병원" },
  adhc: { bg: "#DBEAFE", text: "#2563EB", label: "ADHC" },
  pharmacy: { bg: "#D1FAE5", text: "#059669", label: "약국" },
  general: { bg: "#F3F4F6", text: "#6B7280", label: "일정" },
  other: { bg: "#F3F4F6", text: "#6B7280", label: "기타" },
};

interface RemindersPageProps {
  onClose: () => void;
}

export default function RemindersPage({ onClose }: RemindersPageProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    sb.auth.getSession().then(({ data: { session } }) => {
      fetchAppointments(session?.user?.id || "default");
    });
  }, []);

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
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
    } catch { return iso; }
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 390, margin: "0 auto", background: "#FFF8EE", fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#5C4F48", fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          돌아가기
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#3D3530" }}>일정</span>
        <div style={{ width: 64 }} />
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
          <span style={{ fontSize: 28 }}>📅</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#3D3530", margin: 0 }}>예약 / 일정</h1>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "48px 0", color: "#A89B94" }}>불러오는 중...</p>
        ) : appointments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <span style={{ fontSize: 48 }}>💭</span>
            <p style={{ color: "#A89B94", fontSize: 14, marginTop: 12 }}>아직 저장된 일정이 없어요</p>
            <p style={{ color: "#A89B94", fontSize: 12, marginTop: 4 }}>소연이와 대화하면서 약속이나 예약을 말씀해보세요</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {appointments.map((a) => {
              const style = TYPE_STYLES[a.type] || TYPE_STYLES.other;
              const dateStr = formatDate(a.scheduled_at);
              const timeStr = formatTime(a.scheduled_at);

              return (
                <div key={a.id} style={{ background: "#FFFBF7", borderRadius: 16, padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type badge + date */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: style.bg, color: style.text }}>
                        {style.label}
                      </span>
                      <span style={{ fontSize: 13, color: "#FF6B35", fontWeight: 600 }}>{dateStr}</span>
                      {timeStr && <span style={{ fontSize: 12, color: "#A89B94" }}>{timeStr}</span>}
                    </div>
                    {/* Title */}
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#3D3530", margin: 0 }}>{a.title}</p>
                    {/* Location */}
                    {a.location && <p style={{ fontSize: 12, color: "#A89B94", marginTop: 4 }}>📍 {a.location}</p>}
                    {/* Notes */}
                    {a.notes && <p style={{ fontSize: 12, color: "#A89B94", marginTop: 2 }}>{a.notes}</p>}
                  </div>
                  {/* Delete */}
                  <button onClick={() => handleDelete(a.id)} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 16, background: "#FEF2F2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
          <p style={{ color: "#E55A2B", fontSize: 13 }}>
            소연이에게 &ldquo;병원 예약&rdquo;이나 &ldquo;약속&rdquo; 얘기를 하면 자동으로 일정이 저장돼요
          </p>
        </div>
      </div>
    </div>
  );
}
