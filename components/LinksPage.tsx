"use client";

import { useEffect, useState } from "react";
import type { Checkin } from "@/lib/checkin";

/* ── 가족 연결: 누구나 자기 엘로를 쓰고, 원하면 사람을 연결한다 ──
   내 번호 받기 → 상대가 자기 엘로에 넣으면 양방향 연결.
   내가 볼 수 있는 사람: "오늘 어때요?" (상대가 허락한 범위 안에서만)
   나를 볼 수 있는 사람: 내가 뭘 공유할지 켜고 끈다. */

type Person = { id: string; userId: string; name: string; relationship: string;
  share_wellbeing: boolean; share_meds: boolean; share_appointments: boolean; share_location: boolean };

const REL_CHIPS = ["딸", "아들", "어머니", "아버지", "남편", "아내", "며느리", "사위", "손주", "친구"];
const BTN = "h-16 rounded-[20px] text-[22px] font-bold active:scale-[0.98] disabled:opacity-60";

function fmtT(iso: string) { try { return new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)); } catch { return ""; } }
function fmtD(iso: string) { // appointments keep wall-clock time in the string — do not convert
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/); if (!m) return String(iso);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); const h = Number(m[4]);
  return `${Number(m[2])}월 ${Number(m[3])}일(${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}) ${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${m[5]}`;
}
function fmtHHMM(t: string) { const [h, m] = t.split(":").map(Number); return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}`; }

// module scope (not inside render) so inputs keep focus across re-renders
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-[22px] border-2 border-[#EADFD3] p-4 ${className}`}>{children}</div>;
}
function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`h-12 px-4 rounded-full text-[18px] font-bold border-2 ${on ? "bg-[#1F7A47] border-[#1F7A47] text-white" : "bg-white border-[#D9CCC0] text-[#5C4F48]"}`}>{label} {on ? "켬" : "끔"}</button>;
}

export default function LinksPage({ onClose, onAsk, initialCode }: { onClose: () => void; onAsk?: (text: string) => void; initialCode?: string | null }) {
  const [loading, setLoading] = useState(true);
  const [myName, setMyName] = useState("");
  const [watching, setWatching] = useState<Person[]>([]);
  const [watchers, setWatchers] = useState<Person[]>([]);
  const [code, setCode] = useState<string | null>(initialCode || null);
  const [enterCode, setEnterCode] = useState("");
  const [rel, setRel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [status, setStatus] = useState<Record<string, Checkin | "loading" | undefined>>({});

  async function load() {
    try {
      const res = await fetch("/api/links", { cache: "no-store" });
      const data = await res.json();
      if (!data.error) { setMyName(data.me?.name || ""); setWatching(data.watching || []); setWatchers(data.watchers || []); }
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function getCode() {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "code" }) });
      const data = await res.json();
      if (data.code) setCode(data.code); else setErr(data.error || "번호를 못 받았어요.");
    } catch { setErr("번호를 못 받았어요."); }
    setBusy(false);
  }
  async function shareCode() {
    if (!code) return;
    const text = `엘로 연결 번호: ${code}\n엘로 앱 → 설정 → 가족 연결 → 이 번호를 넣어주세요. (24시간 안에)`;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch {}
    try { await navigator.clipboard.writeText(text); setMsg("복사했어요. 문자나 카톡에 붙여넣으세요."); } catch {}
  }
  async function connect() {
    const c = enterCode.replace(/\D/g, "");
    if (c.length !== 6) { setErr("번호 6자리를 넣어주세요."); return; }
    if (!rel) { setErr("그분이 나에게 누구인지 골라주세요."); return; }
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect", code: c, relationship: rel }) });
      const data = await res.json();
      if (data.ok) { setMsg(`${rel} ${data.name || ""}님과 연결됐어요.`); setEnterCode(""); setRel(""); await load(); }
      else setErr(data.error || "연결하지 못했어요.");
    } catch { setErr("연결하지 못했어요."); }
    setBusy(false);
  }
  async function toggleShare(p: Person, key: keyof Person) {
    const next = !p[key];
    setWatchers(ws => ws.map(w => w.id === p.id ? { ...w, [key]: next } : w));
    await fetch("/api/links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, [key]: next }) }).catch(() => {});
  }
  async function unlink(p: Person) {
    if (!confirm(`${p.relationship} ${p.name}님과 연결을 끊을까요? 서로 볼 수 없게 돼요.`)) return;
    await fetch("/api/links", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: p.userId }) }).catch(() => {});
    await load();
  }
  async function checkin(p: Person) {
    setStatus(s => ({ ...s, [p.userId]: "loading" }));
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
      const res = await fetch(`/api/checkin?userId=${p.userId}&tz=${encodeURIComponent(tz)}`, { cache: "no-store" });
      const data = await res.json();
      setStatus(s => ({ ...s, [p.userId]: data.error ? undefined : data }));
      if (data.error) setErr(data.error);
    } catch { setStatus(s => ({ ...s, [p.userId]: undefined })); }
  }

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
      <div className="flex items-center gap-3 px-4 pt-3 pb-1.5">
        <button onClick={onClose} className="h-12 pl-2.5 pr-4 rounded-full bg-white border-2 border-[#D9CCC0] flex items-center gap-1.5 active:scale-95">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="text-[20px] font-bold text-[#2B211C]">뒤로</span>
        </button>
        <span className="text-[26px] font-bold text-[#2B211C]">가족 연결</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-4">
        {msg && <p className="text-[20px] font-bold text-[#1F7A47]">{msg}</p>}
        {err && <p className="text-[20px] font-bold text-[#B42318]">{err}</p>}

        {/* 내 번호 */}
        <Card>
          <div className="text-[20px] font-bold text-[#5C4F48]">내 연결 번호</div>
          <p className="text-[18px] text-[#5C4F48] mt-1">가족이 자기 엘로에 이 번호를 넣으면 연결돼요. 서로 잘 있는지 볼 수 있어요.</p>
          {code ? (
            <>
              <div className="text-[48px] font-bold tracking-[0.25em] text-[#2B211C] text-center mt-3">{code}</div>
              <p className="text-[16px] text-[#5C4F48] text-center">24시간 안에 넣어야 해요</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={shareCode} className={`${BTN} bg-[#FF6B35] text-white`}>번호 보내기</button>
                <button onClick={getCode} disabled={busy} className={`${BTN} bg-white border-2 border-[#D9CCC0] text-[#2B211C]`}>새 번호</button>
              </div>
            </>
          ) : (
            <button onClick={getCode} disabled={busy} className={`${BTN} w-full mt-3 bg-[#FF6B35] text-white`}>{busy ? "받는 중…" : "내 번호 받기"}</button>
          )}
        </Card>

        {/* 상대 번호 넣기 */}
        <Card>
          <div className="text-[20px] font-bold text-[#5C4F48]">가족 번호 넣기</div>
          <input type="tel" inputMode="numeric" value={enterCode} onChange={e => setEnterCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6자리 번호"
            className="w-full h-16 mt-2 px-4 rounded-2xl bg-[#FFF8EE] border-2 border-[#D9CCC0] text-[30px] tracking-[0.3em] text-center text-[#2B211C] focus:outline-none focus:border-[#FF6B35]" />
          <div className="text-[18px] text-[#5C4F48] mt-3 mb-1.5">그분은 나에게…</div>
          <div className="flex flex-wrap gap-2">
            {REL_CHIPS.map(r => <button key={r} onClick={() => setRel(r)} className={`h-12 px-4 rounded-full text-[18px] font-bold border-2 ${rel === r ? "bg-[#2B211C] border-[#2B211C] text-white" : "bg-white border-[#D9CCC0] text-[#2B211C]"}`}>{r}</button>)}
          </div>
          <button onClick={connect} disabled={busy} className={`${BTN} w-full mt-3 bg-[#1F7A47] text-white`}>{busy ? "연결 중…" : "연결하기"}</button>
        </Card>

        {/* 내가 볼 수 있는 사람 */}
        {loading ? <p className="text-[18px] text-[#5C4F48] text-center">불러오는 중…</p> : (
          <>
            {watching.length > 0 && (
              <div>
                <div className="text-[20px] font-bold text-[#5C4F48] px-1 pb-2">내가 볼 수 있는 사람</div>
                <div className="flex flex-col gap-3">
                  {watching.map(p => {
                    const st = status[p.userId];
                    return (
                      <Card key={p.id}>
                        <div className="flex items-center justify-between">
                          <span className="text-[24px] font-bold text-[#2B211C]">{p.relationship} {p.name}</span>
                          <button onClick={() => unlink(p)} className="text-[16px] font-bold text-[#B42318]">연결 끊기</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <button onClick={() => checkin(p)} className={`${BTN} bg-[#FF6B35] text-white`}>{st === "loading" ? "보는 중…" : "오늘 어때요?"}</button>
                          {onAsk && <button onClick={() => onAsk(`${p.relationship} 오늘 어때? 약은 드셨어?`)} className={`${BTN} bg-white border-2 border-[#D9CCC0] text-[#2B211C]`}>엘로에게 묻기</button>}
                        </div>
                        {st && st !== "loading" && (
                          <div className="mt-3 flex flex-col gap-2 text-[19px] leading-[1.45] text-[#2B211C]">
                            {st.sos && <div className="rounded-xl bg-[#FDE2E1] text-[#B42318] font-bold px-3 py-2">긴급 알림이 {fmtT(st.sos.at)}부터 켜져 있어요. 바로 전화해 보세요.</div>}
                            {st.wellbeing ? <div><b>안부</b> · 오늘 엘로와 {st.wellbeing.talkedToday}번 대화{st.wellbeing.lastTalkAt ? ` (마지막 ${fmtT(st.wellbeing.lastTalkAt)})` : ""}<br />{st.wellbeing.summary}</div> : <div className="text-[#5C4F48]">안부는 공유하지 않으셨어요</div>}
                            {st.meds ? (
                              <div><b>약</b>{st.meds.items.length === 0 ? " · 등록된 약 알림 없음" : ""}
                                {st.meds.items.map((i, k) => <div key={k} className={i.taken ? "text-[#1F7A47]" : ""}>{i.taken ? "✓" : "○"} {fmtHHMM(i.time)} {i.name}{i.taken && i.takenAt ? ` (${fmtT(i.takenAt)} 드심)` : i.taken ? "" : " — 아직"}</div>)}
                              </div>
                            ) : <div className="text-[#5C4F48]">약은 공유하지 않으셨어요</div>}
                            {st.appointments ? <div><b>일정</b>{st.appointments.length ? st.appointments.map((a, k) => <div key={k}>{fmtD(a.when)} {a.title}</div>) : " · 다가오는 일정 없음"}</div> : null}
                            {st.shared.location && st.location && <a className="text-[#C2410C] font-bold underline" href={`https://maps.google.com/?q=${st.location.lat},${st.location.lng}`} target="_blank" rel="noreferrer">위치 보기 ({fmtT(st.location.at)})</a>}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 나를 볼 수 있는 사람 */}
            {watchers.length > 0 && (
              <div>
                <div className="text-[20px] font-bold text-[#5C4F48] px-1 pb-2">나를 볼 수 있는 사람 · 무엇을 보여줄까요</div>
                <div className="flex flex-col gap-3">
                  {watchers.map(p => (
                    <Card key={p.id}>
                      <div className="flex items-center justify-between">
                        <span className="text-[24px] font-bold text-[#2B211C]">{p.relationship} {p.name}</span>
                        <button onClick={() => unlink(p)} className="text-[16px] font-bold text-[#B42318]">연결 끊기</button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Toggle on={p.share_wellbeing} label="안부" onClick={() => toggleShare(p, "share_wellbeing")} />
                        <Toggle on={p.share_meds} label="약" onClick={() => toggleShare(p, "share_meds")} />
                        <Toggle on={p.share_appointments} label="일정" onClick={() => toggleShare(p, "share_appointments")} />
                        <Toggle on={p.share_location} label="위치" onClick={() => toggleShare(p, "share_location")} />
                      </div>
                      <p className="text-[16px] text-[#5C4F48] mt-2">대화 내용은 절대 보여주지 않아요. 안부는 한 줄 요약만 보여요.</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {watching.length === 0 && watchers.length === 0 && <p className="text-[18px] text-[#5C4F48] text-center">아직 연결된 사람이 없어요. {myName ? `${myName} 님, ` : ""}위에서 번호를 받아 가족에게 보내주세요.</p>}
          </>
        )}
      </div>
    </div>
  );
}
