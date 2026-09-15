"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";

/* ── 부모님 폰 설정 (자녀가 자기 폰에서 함) ──
   1) 부모님 성함 + 나와의 관계 + 내 전화번호
   2) 약 (선택)
   3) → PIN 4자리 + QR. 부모님 폰은 QR 찍거나 숫자 4개만 누르면 끝. */

const RELATIONS = ["딸", "아들", "며느리", "사위", "손녀", "손자", "배우자", "가족"];
const MED_TIMES = [{ label: "아침", t: "08:00" }, { label: "점심", t: "12:00" }, { label: "저녁", t: "18:00" }, { label: "자기 전", t: "21:00" }];

export default function FamilySetupPage() {
  const supabase = createClient();
  const [step, setStep] = useState<"form" | "meds" | "done">("form");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("딸");
  const [myPhone, setMyPhone] = useState("");
  const [meds, setMeds] = useState<{ name: string; times: string[] }[]>([{ name: "", times: [] }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ pin: string; loginUrl: string; name: string } | null>(null);
  const [qr, setQr] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = "/family/login?next=/family/setup"; return; }
      const p = data.user.user_metadata?.phone || data.user.phone; if (p) setMyPhone(String(p));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setBusy(true); setError("");
    try {
      const contacts = myPhone.replace(/\D/g, "").length >= 10 ? [{ name: relation, relation, phone: myPhone }] : [];
      const medications = meds.filter(m => m.name.trim() && m.times.length).map(m => ({ name: m.name.trim(), times: m.times }));
      const res = await fetch("/api/family/create-elder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, relationship: relation, contacts, medications }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "설정에 실패했어요."); return; }
      setResult({ pin: data.pin, loginUrl: data.loginUrl, name: data.name });
      setQr(await QRCode.toDataURL(data.loginUrl, { width: 360, margin: 1, color: { dark: "#1a1a2e", light: "#ffffff" } }));
      setStep("done");
    } catch { setError("연결에 문제가 있어요."); }
    finally { setBusy(false); }
  }

  const input = "w-full h-14 px-4 rounded-xl bg-white border-2 border-blue-100 text-[18px] text-gray-900 focus:outline-none focus:border-[#1B6FE8]";

  return (
    <div className="px-5 pt-6 pb-8">
      <h1 className="text-[24px] font-bold text-gray-900">부모님 폰 설정</h1>
      <p className="text-gray-500 text-[15px] mt-1 mb-5">여기서 다 입력하시면 부모님은 숫자 4개만 누르면 돼요.</p>

      {step === "form" && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[15px] font-bold text-gray-700">부모님 성함</span>
            <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="김영자" />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-[15px] font-bold text-gray-700">부모님께 나는</span>
            <div className="flex flex-wrap gap-2">
              {RELATIONS.map(r => (
                <button key={r} onClick={() => setRelation(r)} className={`h-11 px-4 rounded-full text-[16px] font-bold border-2 ${relation === r ? "bg-[#1B6FE8] border-[#1B6FE8] text-white" : "bg-white border-blue-100 text-gray-700"}`}>{r}</button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[15px] font-bold text-gray-700">내 전화번호 <span className="font-normal text-gray-400">(부모님 폰의 &ldquo;{relation}에게 전화&rdquo; 버튼)</span></span>
            <input className={input} type="tel" inputMode="tel" value={myPhone} onChange={e => setMyPhone(e.target.value)} placeholder="213 555 1234" />
          </label>
          {error && <p className="text-[15px] font-bold text-red-600">{error}</p>}
          <button onClick={() => name.trim() && setStep("meds")} disabled={!name.trim()} className="h-14 rounded-xl bg-[#1B6FE8] text-white text-[18px] font-bold disabled:opacity-40">다음: 약 (선택)</button>
        </div>
      )}

      {step === "meds" && (
        <div className="flex flex-col gap-4">
          <p className="text-[15px] text-gray-600">드시는 약이 있으면 넣어주세요. 부모님 폰에 알림이 울리고 엘로가 &ldquo;약 드셨어요?&rdquo;라고 챙깁니다. 없으면 건너뛰어도 돼요.</p>
          {meds.map((m, i) => (
            <div key={i} className="bg-white rounded-xl border-2 border-blue-100 p-3 flex flex-col gap-2">
              <input className={input} value={m.name} onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="약 이름 (예: 혈압약)" />
              <div className="flex flex-wrap gap-2">
                {MED_TIMES.map(t => {
                  const on = m.times.includes(t.t);
                  return <button key={t.t} onClick={() => setMeds(ms => ms.map((x, j) => j === i ? { ...x, times: on ? x.times.filter(v => v !== t.t) : [...x.times, t.t].sort() } : x))}
                    className={`h-11 px-4 rounded-full text-[15px] font-bold border-2 ${on ? "bg-[#1B6FE8] border-[#1B6FE8] text-white" : "bg-white border-blue-100 text-gray-700"}`}>{t.label} {t.t}</button>;
                })}
              </div>
            </div>
          ))}
          {meds.length < 5 && <button onClick={() => setMeds(ms => [...ms, { name: "", times: [] }])} className="h-12 rounded-xl border-2 border-dashed border-blue-200 text-[#1B6FE8] text-[16px] font-bold">+ 약 추가</button>}
          {error && <p className="text-[15px] font-bold text-red-600">{error}</p>}
          <button onClick={submit} disabled={busy} className="h-14 rounded-xl bg-[#1B6FE8] text-white text-[18px] font-bold disabled:opacity-60">{busy ? "만드는 중…" : "부모님 계정 만들기"}</button>
          <button onClick={() => setStep("form")} className="h-11 text-[15px] text-gray-500 underline underline-offset-4">이전</button>
        </div>
      )}

      {step === "done" && result && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border-2 border-blue-100 p-5 text-center">
            <p className="text-[15px] text-gray-500">{result.name} 님의 번호</p>
            <p className="text-[64px] font-black tracking-[0.25em] text-[#1B6FE8] leading-none my-2">{result.pin}</p>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR" className="w-[200px] h-[200px] mx-auto mt-3 rounded-lg" />
            )}
          </div>
          <div className="bg-white rounded-2xl border-2 border-blue-100 p-4 text-[16px] text-gray-800 leading-[1.6]">
            <p className="font-bold mb-1">부모님 폰에서 (둘 중 하나)</p>
            <p>1. 카메라로 위 QR을 찍으면 바로 로그인돼요.</p>
            <p>2. 또는 <span className="font-bold">ello-care.vercel.app</span> 열고 → <span className="font-bold">&ldquo;시설에서 받은 번호로 시작&rdquo;</span> → 숫자 <span className="font-bold">{result.pin}</span></p>
            <p className="mt-2 text-gray-500 text-[14px]">글씨는 &ldquo;크게&rdquo;로, 위치 공유는 켜진 상태로 시작돼요. 부모님 폰 설정에서 바꿀 수 있어요.</p>
          </div>
          <button onClick={async () => { try { await navigator.share?.({ title: "Ello 로그인", text: `엘로 로그인 번호: ${result.pin}`, url: result.loginUrl }); } catch {} }} className="h-14 rounded-xl bg-[#1B6FE8] text-white text-[18px] font-bold">링크 보내기 (문자·카톡)</button>
          <a href="/family" className="h-12 flex items-center justify-center text-[16px] text-gray-500 underline underline-offset-4">가족 홈으로</a>
        </div>
      )}
    </div>
  );
}
