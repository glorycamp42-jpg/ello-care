"use client";

import { useState, useEffect } from "react";
import { syncMedsFromServer, addMedOnServer, updateMedOnServer, removeMedOnServer } from "@/lib/meds-sync";
import type { Medication } from "@/components/MedicationPage";

/**
 * 가족 앱 — 부모님 약 알림 관리.
 * 같은 목록을 부모님 폰(약 알림·건강수첩)과 엘로가 읽습니다. 여기서 바꾸면 부모님 폰에 10분 안에 (앱을 열면 바로) 반영됩니다.
 */
const PRESETS = [
  { label: "아침", time: "08:00" },
  { label: "점심", time: "12:00" },
  { label: "저녁", time: "18:00" },
  { label: "취침", time: "21:00" },
];

function fmt(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hh}:${String(m).padStart(2, "0")}`;
}

export default function FamilyMedicationsPage() {
  const [elderId, setElderId] = useState<string | null>(null);
  const [elderName, setElderName] = useState("어르신");
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(eid: string) {
    const list = await syncMedsFromServer(eid);
    if (list) setMeds(list);
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/family/summary");
        const data = await res.json();
        if (data.error || !data.elderId) { setError("연결된 부모님 계정이 없습니다. 홈에서 '부모님 폰 설정하기'를 먼저 해 주세요."); setLoading(false); return; }
        setElderId(data.elderId); setElderName(data.elderName || "어르신");
        await load(data.elderId);
      } catch { setError("불러오지 못했습니다."); }
      setLoading(false);
    })();
  }, []);

  function toggleTime(t: string) { setTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].sort()); }

  async function save() {
    if (!elderId) return;
    const all = [...times]; if (custom && !all.includes(custom)) all.push(custom); all.sort();
    if (!name.trim() || all.length === 0) { setError("약 이름과 시간을 넣어주세요."); return; }
    setBusy(true); setError("");
    const ok = await addMedOnServer({ name, times: all, userId: elderId });
    if (!ok) setError("저장하지 못했습니다. 다시 시도해 주세요.");
    await load(elderId);
    setName(""); setTimes([]); setCustom(""); setAdding(false); setBusy(false);
  }
  async function remove(id: string) {
    if (!elderId) return;
    setBusy(true); await removeMedOnServer(id, elderId); await load(elderId); setBusy(false);
  }
  async function toggle(m: Medication) {
    if (!elderId) return;
    setBusy(true); await updateMedOnServer(m.id, { enabled: !m.enabled }); await load(elderId); setBusy(false);
  }

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #1B6FE8, #3D8BF2)", borderRadius: "0 0 28px 28px", padding: "32px 20px 28px" }}>
        <h1 className="text-white text-xl font-bold">💊 {elderName} 약 알림</h1>
        <p className="text-blue-100 text-sm mt-1">여기서 넣으면 부모님 폰이 그 시간에 울리고, 엘로도 알고 있어요.</p>
      </div>

      <div className="px-4 pt-4 pb-24">
        {loading ? <p className="text-center text-gray-400 py-8">불러오는 중...</p> : (
          <>
            {error && <p className="text-sm text-red-600 font-bold mb-3">{error}</p>}
            {meds.length === 0 && !error && <p className="text-sm text-gray-400 text-center py-6">등록된 약이 없습니다</p>}
            <div className="space-y-2">
              {meds.map(m => (
                <div key={m.id} className={`bg-white rounded-xl shadow-sm p-4 ${m.enabled ? "" : "opacity-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{m.name}{m.dosage ? <span className="text-gray-400 font-normal text-sm ml-1">{m.dosage}</span> : null}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{m.times.length ? m.times.map(fmt).join(" · ") : "알림 시간 없음 (건강수첩에만 있음)"}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.times.length > 0 && <button disabled={busy} onClick={() => toggle(m)} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-[#F0F7FF] text-[#1B6FE8]">{m.enabled ? "끄기" : "켜기"}</button>}
                      <button disabled={busy} onClick={() => remove(m.id)} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-red-50 text-red-600">삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {adding ? (
              <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="약 이름 (예: 혈압약)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:border-[#1B6FE8]" />
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {PRESETS.map(p => (
                    <button key={p.time} onClick={() => toggleTime(p.time)} className={`py-2.5 rounded-xl text-sm font-bold border ${times.includes(p.time) ? "bg-[#1B6FE8] text-white border-[#1B6FE8]" : "bg-white text-gray-700 border-gray-200"}`}>{p.label}<br /><span className="text-[11px] font-normal">{fmt(p.time)}</span></button>
                  ))}
                </div>
                <input type="time" value={custom} onChange={e => setCustom(e.target.value)} className="w-full mt-3 px-4 py-3 rounded-xl border border-gray-200 text-base" />
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => { setAdding(false); setError(""); }} className="py-3 rounded-xl border border-gray-200 text-gray-600 font-bold">취소</button>
                  <button disabled={busy} onClick={save} className="py-3 rounded-xl bg-[#1B6FE8] text-white font-bold disabled:opacity-50">{busy ? "저장 중…" : "저장"}</button>
                </div>
              </div>
            ) : (
              elderId && <button onClick={() => setAdding(true)} className="w-full mt-4 py-4 rounded-xl border-2 border-dashed border-blue-200 text-[#1B6FE8] font-bold bg-white">+ 약 알림 추가</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
