"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

interface LocationData {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  created_at: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LocationPage() {
  const [current, setCurrent] = useState<LocationData | null>(null);
  const [history, setHistory] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [elderId, setElderId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    const familyId = session?.user?.id;
    if (!familyId) { setLoading(false); return; }

    const { data: links } = await supabase
      .from("family_links")
      .select("elder_id")
      .eq("family_id", familyId)
      .limit(1);

    const eid = links?.[0]?.elder_id || familyId;
    setElderId(eid);

    const { data: locData } = await supabase
      .from("gps_locations")
      .select("*")
      .eq("user_id", eid)
      .order("created_at", { ascending: false })
      .limit(10);

    if (locData && locData.length > 0) {
      setCurrent(locData[0]);
      setHistory(locData);
    }
    setLoading(false);

    // Realtime subscription
    supabase
      .channel("gps-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gps_locations", filter: `user_id=eq.${eid}` },
        (payload) => {
          const loc = payload.new as LocationData;
          setCurrent(loc);
          setHistory((prev) => [loc, ...prev].slice(0, 10));
        })
      .subscribe();
  }

  function timeAgo(iso: string): string {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "방금 전";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  return (
    <div>
      <div className="bg-gradient-to-br from-[#1B6FE8] to-[#3D8BF2] rounded-b-[28px] px-5 pt-8 pb-7">
        <p className="text-blue-200 text-xs font-medium">Ello Family</p>
        <h1 className="text-white text-xl font-bold mt-0.5 mb-4">위치 추적</h1>

        {current ? (
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/80 text-xs font-medium">현재 위치</span>
              <span className="text-white/50 text-[11px]">{timeAgo(current.created_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-[10px] mb-0.5">위도</p>
                <p className="text-white font-mono font-bold text-sm">{current.latitude.toFixed(5)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white/50 text-[10px] mb-0.5">경도</p>
                <p className="text-white font-mono font-bold text-sm">{current.longitude.toFixed(5)}</p>
              </div>
            </div>
            {current.accuracy && <p className="text-white/40 text-[10px] text-center mt-2">정확도 ±{Math.round(current.accuracy)}m</p>}
          </div>
        ) : (
          <div className="bg-white/15 rounded-2xl p-6 text-center">
            <p className="text-white/60 text-sm">{loading ? "불러오는 중..." : "위치 데이터가 아직 없습니다"}</p>
          </div>
        )}
      </div>

      <div className="px-5 -mt-3">
        {elderId && (
          <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-2.5 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm text-gray-500">실시간 업데이트 활성</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-[#EBF3FF] flex items-center justify-center text-base">🕐</span>
            <h3 className="font-bold text-sm text-gray-900">위치 기록</h3>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">기록이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {history.map((loc, i) => (
                <div key={loc.id || i} className="flex items-center justify-between bg-[#F0F7FF] rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#1B6FE8] text-xs font-bold w-5 text-center">{i + 1}</span>
                    <span className="text-sm text-gray-600 font-mono">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">{timeAgo(loc.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
