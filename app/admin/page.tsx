"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}
interface FamilyLink {
  id: string;
  family_id: string;
  elder_id: string;
  relationship: string;
  elder_name: string;
}
interface AdhcConnection {
  id: string;
  ello_user_id: string;
  participant_id: string;
  status: string;
}
interface Participant {
  id: string;
  name: string;
  status: string;
}

type Tab = "wellness" | "users" | "links" | "adhc";

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function wellnessStatus(iso: string | undefined): { icon: string; label: string; cls: string } {
  if (!iso) return { icon: "⚪", label: "기록 없음", cls: "text-gray-400" };
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (hours < 24) return { icon: "💚", label: "양호", cls: "text-green-600" };
  if (hours < 48) return { icon: "⚠️", label: "주의", cls: "text-amber-600" };
  return { icon: "🚨", label: "경고", cls: "text-red-600" };
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("wellness");
  const [denied, setDenied] = useState(false);
  const [deniedInfo, setDeniedInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [links, setLinks] = useState<FamilyLink[]>([]);
  const [connections, setConnections] = useState<AdhcConnection[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});

  // 폼 상태
  const [linkFamily, setLinkFamily] = useState("");
  const [linkElder, setLinkElder] = useState("");
  const [linkRel, setLinkRel] = useState("자녀");
  const [linkName, setLinkName] = useState("");
  const [adhcElder, setAdhcElder] = useState("");
  const [adhcParticipant, setAdhcParticipant] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const h = await authHeaders();
      const [u, l, a, w] = await Promise.all([
        fetch("/api/admin?resource=users", { headers: h }).then(async (r) => (r.status === 403 ? { __denied: await r.json() } : r.json())),
        fetch("/api/admin?resource=links", { headers: h }).then((r) => r.json()),
        fetch("/api/admin?resource=adhc", { headers: h }).then((r) => r.json()),
        fetch("/api/admin?resource=wellness", { headers: h }).then((r) => r.json()),
      ]);
      if (!u || u.__denied) {
        setDeniedInfo(u && u.__denied ? u.__denied.current || "" : "(세션 없음)");
        setDenied(true);
        return;
      }
      setUsers(u.users || []);
      setLinks(l.links || []);
      setConnections(a.connections || []);
      setParticipants(a.participants || []);
      setLastSeen(w.lastSeen || {});
    } catch {
      setMsg("데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function emailOf(id: string): string {
    return users.find((u) => u.id === id)?.email || id.slice(0, 8) + "…";
  }

  function roleOf(id: string): string {
    if (links.some((l) => l.family_id === id)) return "가족";
    if (links.some((l) => l.elder_id === id) || lastSeen[id]) return "어르신";
    return "미지정";
  }

  async function addLink() {
    if (!linkFamily || !linkElder) {
      setMsg("가족 계정과 어르신 계정을 모두 선택하세요");
      return;
    }
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({
        resource: "link",
        family_id: linkFamily,
        elder_id: linkElder,
        relationship: linkRel,
        elder_name: linkName || "어르신",
      }),
    });
    const data = await res.json();
    setMsg(data.error ? `오류: ${data.error}` : "✅ 가족 연결 완료");
    loadAll();
  }

  async function removeLink(id: string) {
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ resource: "link", id }),
    });
    setMsg("연결 해제됨");
    loadAll();
  }

  async function addAdhc() {
    if (!adhcElder || !adhcParticipant) {
      setMsg("어르신 계정과 ADHC 참가자를 모두 선택하세요");
      return;
    }
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({
        resource: "adhc",
        ello_user_id: adhcElder,
        participant_id: adhcParticipant,
      }),
    });
    const data = await res.json();
    setMsg(data.error ? `오류: ${data.error}` : "✅ ADHC 연결 완료");
    loadAll();
  }

  async function removeAdhc(id: string) {
    await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ resource: "adhc", id }),
    });
    setMsg("ADHC 연결 비활성화됨");
    loadAll();
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-gray-50 px-6">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800">관리자 권한이 없습니다</p>
        <p className="text-sm text-gray-500 mt-2">관리자 계정으로 로그인해주세요</p>
        {deniedInfo && <p className="text-xs text-gray-400 mt-3">현재 인식된 계정: {deniedInfo}</p>}
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "wellness", label: "📊 안부 보드" },
    { key: "users", label: "👥 계정" },
    { key: "links", label: "👨‍👩‍👧 가족 연결" },
    { key: "adhc", label: "🏥 ADHC 연결" },
  ];

  const elders = users.filter((u) => roleOf(u.id) !== "가족");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-5 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-bold text-lg">⚙️ Ello Care 관리자</h1>
          <button onClick={loadAll} className="text-sm bg-white/15 px-3 py-1.5 rounded-lg">
            🔄 새로고침
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* 탭 */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${
                tab === t.key ? "bg-gray-900 text-white" : "bg-white text-gray-600 border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && (
          <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg("")} className="font-bold">✕</button>
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-20">불러오는 중...</p>
        ) : (
          <>
            {/* 안부 보드 */}
            {tab === "wellness" && (
              <div className="space-y-2">
                {elders.length === 0 && <p className="text-gray-400 text-center py-10">어르신 계정이 없습니다</p>}
                {elders.map((u) => {
                  const w = wellnessStatus(lastSeen[u.id]);
                  return (
                    <div key={u.id} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
                      <span className="text-2xl">{w.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{u.email}</p>
                        <p className="text-xs text-gray-400">
                          {lastSeen[u.id] ? `마지막 활동: ${timeAgo(lastSeen[u.id])}` : "활동 기록 없음"}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${w.cls}`}>{w.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 계정 목록 */}
            {tab === "users" && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-500 text-left">
                    <tr>
                      <th className="px-4 py-2.5">이메일</th>
                      <th className="px-4 py-2.5">역할</th>
                      <th className="px-4 py-2.5">가입일</th>
                      <th className="px-4 py-2.5">마지막 로그인</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{u.email}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            roleOf(u.id) === "가족" ? "bg-blue-100 text-blue-700" :
                            roleOf(u.id) === "어르신" ? "bg-orange-100 text-orange-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {roleOf(u.id)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{u.created_at?.split("T")[0]}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 가족 연결 */}
            {tab === "links" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="font-bold text-gray-800 mb-3">➕ 새 가족 연결</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <select value={linkFamily} onChange={(e) => setLinkFamily(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                      <option value="">가족 계정 선택</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                    <select value={linkElder} onChange={(e) => setLinkElder(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                      <option value="">어르신 계정 선택</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                    <input value={linkRel} onChange={(e) => setLinkRel(e.target.value)} placeholder="관계 (예: 자녀)" className="border rounded-lg px-3 py-2 text-sm" />
                    <input value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="어르신 호칭 (예: 할머니)" className="border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button onClick={addLink} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm">
                    연결하기
                  </button>
                </div>

                {links.map((l) => (
                  <div key={l.id} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
                    <div className="flex-1 min-w-0 text-sm">
                      <p className="font-bold text-gray-800 truncate">👤 {emailOf(l.family_id)}</p>
                      <p className="text-gray-500">→ {l.elder_name} ({l.relationship}) · {emailOf(l.elder_id)}</p>
                    </div>
                    <button onClick={() => removeLink(l.id)} className="text-xs text-red-500 font-bold border border-red-200 px-3 py-1.5 rounded-lg">
                      해제
                    </button>
                  </div>
                ))}
                {links.length === 0 && <p className="text-gray-400 text-center py-6">연결된 가족이 없습니다</p>}
              </div>
            )}

            {/* ADHC 연결 */}
            {tab === "adhc" && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="font-bold text-gray-800 mb-3">➕ ADHC 센터 연결 (TotalMedix)</p>
                  {participants.length === 0 && (
                    <p className="text-xs text-amber-600 mb-2">⚠️ TotalMedix 참가자 목록을 불러올 수 없습니다 (환경변수 확인)</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <select value={adhcElder} onChange={(e) => setAdhcElder(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                      <option value="">Ello 어르신 계정 선택</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                    <select value={adhcParticipant} onChange={(e) => setAdhcParticipant(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                      <option value="">ADHC 참가자 선택</option>
                      {participants.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
                    </select>
                  </div>
                  <button onClick={addAdhc} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm">
                    연결하기
                  </button>
                </div>

                {connections.map((c) => {
                  const p = participants.find((x) => x.id === c.participant_id);
                  return (
                    <div key={c.id} className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm">
                      <span className="text-xl">{c.status === "active" ? "🟢" : "⚪"}</span>
                      <div className="flex-1 min-w-0 text-sm">
                        <p className="font-bold text-gray-800 truncate">{emailOf(c.ello_user_id)}</p>
                        <p className="text-gray-500">↔ ADHC: {p?.name || c.participant_id.slice(0, 8) + "…"} · {c.status}</p>
                      </div>
                      {c.status === "active" && (
                        <button onClick={() => removeAdhc(c.id)} className="text-xs text-red-500 font-bold border border-red-200 px-3 py-1.5 rounded-lg">
                          비활성화
                        </button>
                      )}
                    </div>
                  );
                })}
                {connections.length === 0 && <p className="text-gray-400 text-center py-6">ADHC 연결이 없습니다</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
