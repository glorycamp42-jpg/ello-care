"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Appointment {
  id: string;
  title: string;
  type: string;
  location: string;
  scheduled_at: string;
  notes: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  created_at: string;
}

const supabase = createClient();

export default function FamilyHome() {
  const [elderName] = useState("할머니");
  const [elderId, setElderId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastLocation, setLastLocation] = useState<LocationData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    // 1. Get current family user
    const { data: { session } } = await supabase.auth.getSession();
    const familyId = session?.user?.id;
    if (!familyId) {
      console.log("[family] No session");
      setLoading(false);
      return;
    }
    console.log("[family] familyId:", familyId);

    setElderId(familyId);

    // 2. Fetch appointments — API resolves family→elder server-side
    try {
      const res = await fetch(`/api/appointments?userId=${familyId}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
      console.log("[family] appointments:", data.appointments?.length);
    } catch (err) {
      console.error("[family] appointments fetch failed:", err);
    }

    // 3. Fetch latest GPS location (try familyId, GPS might be under elder's ID)
    const { data: locData } = await supabase
      .from("gps_locations")
      .select("*")
      .eq("user_id", familyId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (locData?.[0]) {
      setLastLocation(locData[0]);
      setIsOnline(Date.now() - new Date(locData[0].created_at).getTime() < 15 * 60 * 1000);
    }

    setLoading(false);
  }

  function timeAgo(iso: string): string {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "방금 전";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" });
    } catch { return iso; }
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[#F0F7FF]">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Blue header ── */}
      <div className="bg-gradient-to-br from-[#1B6FE8] to-[#3D8BF2] rounded-b-[28px] px-5 pt-8 pb-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-blue-200 text-xs font-medium">Ello Family</p>
            <h1 className="text-white text-xl font-bold mt-0.5">가족 돌봄</h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
        </div>

        {/* Elder card */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-3xl shrink-0">
            👵
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg">{elderName}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isOnline ? "bg-green-400/30 text-green-200" : "bg-white/15 text-white/60"
              }`}>
                {isOnline ? "● 온라인" : "○ 오프라인"}
              </span>
            </div>
            <p className="text-white/60 text-xs mt-1">
              {lastLocation ? `마지막 위치: ${timeAgo(lastLocation.created_at)}` : "위치 데이터 없음"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-5 -mt-3">

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-base">📅</span>
              <span className="text-gray-400 text-xs">일정</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{appointments.length}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-base">⭐</span>
              <span className="text-gray-400 text-xs">행복티켓</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">12<span className="text-sm font-normal text-gray-400 ml-1">개</span></p>
          </div>
        </div>

        {/* Last location */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#EBF3FF] flex items-center justify-center text-base">📍</span>
              <h3 className="font-bold text-sm text-gray-900">최근 위치</h3>
            </div>
            {lastLocation && (
              <span className="text-[11px] text-[#1B6FE8] font-medium bg-[#EBF3FF] px-2 py-0.5 rounded-full">
                {timeAgo(lastLocation.created_at)}
              </span>
            )}
          </div>
          {lastLocation ? (
            <div className="bg-[#F0F7FF] rounded-lg p-3 font-mono text-sm text-gray-600">
              {lastLocation.latitude.toFixed(5)}, {lastLocation.longitude.toFixed(5)}
              {lastLocation.accuracy && <span className="text-xs text-gray-400 ml-2">±{Math.round(lastLocation.accuracy)}m</span>}
            </div>
          ) : (
            <p className="text-sm text-gray-400">위치 데이터가 아직 없습니다</p>
          )}
        </div>

        {/* ── Appointments from DB ── */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-base">🏥</span>
            <h3 className="font-bold text-sm text-gray-900">어르신 일정</h3>
            {elderId && <span className="text-[10px] text-gray-300 ml-auto">DB 연동</span>}
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">등록된 일정이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center gap-3 bg-[#F0F7FF] rounded-xl px-3 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    a.type === "hospital" ? "bg-red-100 text-red-600" :
                    a.type === "adhc" ? "bg-blue-100 text-blue-600" :
                    a.type === "pharmacy" ? "bg-green-100 text-green-600" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {a.type === "hospital" ? "병원" : a.type === "adhc" ? "ADHC" : a.type === "pharmacy" ? "약국" : "일정"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 block truncate">{a.title}</span>
                    {a.location && <span className="text-[11px] text-gray-400">📍 {a.location}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-[#1B6FE8] font-medium block">{formatDate(a.scheduled_at)}</span>
                    <span className="text-[10px] text-gray-400">{formatTime(a.scheduled_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-base">📋</span>
            <h3 className="font-bold text-sm text-gray-900">최근 활동</h3>
          </div>
          <div className="space-y-3">
            {[
              { icon: "💬", text: "소연이와 대화함", time: "10분 전" },
              { icon: "✅", text: "안부 체크인 완료", time: "1시간 전" },
              { icon: "📍", text: "위치 업데이트됨", time: "5분 전" },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{a.icon}</span>
                  <span className="text-sm text-gray-600">{a.text}</span>
                </div>
                <span className="text-[11px] text-gray-400">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
