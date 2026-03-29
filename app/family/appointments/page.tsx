"use client";

import { useState, useEffect } from "react";
import { getAppointments, Appointment } from "@/lib/family-db";

const ELDER_ID = "default";

const TYPE_CONFIG: Record<string, { bg: string; text: string; label: string; iconBg: string }> = {
  hospital: { bg: "bg-red-100", text: "text-red-600", label: "병원", iconBg: "bg-red-50" },
  adhc: { bg: "bg-blue-100", text: "text-blue-600", label: "ADHC", iconBg: "bg-blue-50" },
  pharmacy: { bg: "bg-green-100", text: "text-green-600", label: "약국", iconBg: "bg-green-50" },
  other: { bg: "bg-gray-100", text: "text-gray-500", label: "기타", iconBg: "bg-gray-50" },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAppointments(ELDER_ID).then((d) => { setAppointments(d); setLoading(false); });
  }, []);

  const grouped: Record<string, Appointment[]> = {};
  for (const a of appointments) {
    const key = a.date || "미정";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }

  const counts = {
    hospital: appointments.filter((a) => a.type === "hospital").length,
    adhc: appointments.filter((a) => a.type === "adhc").length,
    pharmacy: appointments.filter((a) => a.type === "pharmacy").length,
  };

  return (
    <div>
      {/* Blue header */}
      <div className="bg-gradient-to-br from-[#1B6FE8] to-[#3D8BF2] rounded-b-[28px] px-5 pt-8 pb-7">
        <p className="text-blue-200 text-xs font-medium">Ello Family</p>
        <h1 className="text-white text-xl font-bold mt-0.5 mb-4">일정 관리</h1>

        {/* Type counts */}
        <div className="grid grid-cols-3 gap-2">
          {(["hospital", "adhc", "pharmacy"] as const).map((type) => {
            const c = TYPE_CONFIG[type];
            return (
              <div key={type} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                <p className="text-white text-2xl font-bold">{counts[type]}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{c.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 -mt-3">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 text-sm">
            불러오는 중...
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <span className="text-[48px]">📅</span>
            <p className="text-gray-400 text-sm mt-3">등록된 일정이 없습니다</p>
            <p className="text-gray-300 text-xs mt-1">소연이와 대화하면서 약속을 말씀하시면 자동 등록돼요</p>
          </div>
        ) : (
          <div className="space-y-5 mt-1">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-sm font-bold text-[#1B6FE8]">{date}</span>
                  <span className="text-[10px] text-[#1B6FE8] bg-[#EBF3FF] px-2 py-0.5 rounded-full font-medium">
                    {items.length}건
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => {
                    const tc = TYPE_CONFIG[a.type] || TYPE_CONFIG.other;
                    return (
                      <div key={a.id} className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-start gap-3">
                          <span className={`w-10 h-10 rounded-xl ${tc.iconBg} flex items-center justify-center text-lg shrink-0`}>
                            {a.type === "hospital" ? "🏥" : a.type === "adhc" ? "🏢" : a.type === "pharmacy" ? "💊" : "📋"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                                {tc.label}
                              </span>
                              {a.time && <span className="text-[11px] text-gray-400">{a.time}</span>}
                            </div>
                            <h4 className="font-bold text-sm text-gray-900">{a.title}</h4>
                            {a.location && (
                              <p className="text-xs text-gray-400 mt-1">📍 {a.location}</p>
                            )}
                            {a.notes && (
                              <p className="text-xs text-gray-400 mt-0.5">{a.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
