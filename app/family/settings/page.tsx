"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ElderInfo {
  elder_id: string;
  elder_name: string;
  relationship: string;
}

const supabase = createClient();

export default function FamilySettings() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [elders, setElders] = useState<ElderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }

    setUserEmail(session.user.email || "");
    setUserName(session.user.user_metadata?.name || session.user.email?.split("@")[0] || "");

    // Fetch linked elders
    const { data: links } = await supabase
      .from("family_links")
      .select("elder_id, elder_name, relationship")
      .eq("family_id", session.user.id);

    setElders(links || []);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/family/login";
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#F0F7FF" }}>
        <p style={{ color: "#999" }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Blue header */}
      <div style={{
        background: "linear-gradient(135deg, #1B6FE8, #3D8BF2)",
        borderRadius: "0 0 28px 28px",
        padding: "32px 20px 28px",
      }}>
        <p style={{ color: "#93B8F0", fontSize: 12, fontWeight: 500 }}>Ello Family</p>
        <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 4 }}>설정</h1>
      </div>

      <div style={{ padding: "0 20px", marginTop: -12 }}>
        {/* Profile card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26,
              background: "#EBF3FF", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, fontWeight: 700, color: "#1B6FE8",
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a", margin: 0 }}>{userName}</p>
              <p style={{ fontSize: 13, color: "#999", margin: "4px 0 0" }}>{userEmail}</p>
              <span style={{
                display: "inline-block", marginTop: 6,
                fontSize: 10, fontWeight: 700, padding: "2px 8px",
                borderRadius: 99, background: "#EBF3FF", color: "#1B6FE8",
              }}>
                가족 계정
              </span>
            </div>
          </div>
        </div>

        {/* Linked elders */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#FFF0E0", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>👵</span>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", margin: 0 }}>연결된 어르신</h3>
          </div>

          {elders.length === 0 ? (
            <p style={{ fontSize: 14, color: "#999", textAlign: "center", padding: "16px 0" }}>
              연결된 어르신이 없습니다
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {elders.map((e) => (
                <div key={e.elder_id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#F0F7FF", borderRadius: 12, padding: "10px 14px",
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#1a1a1a", margin: 0 }}>{e.elder_name || "어르신"}</p>
                    <p style={{ fontSize: 12, color: "#999", margin: "2px 0 0" }}>{e.relationship || "가족"}</p>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px",
                    borderRadius: 99, background: "#D1FAE5", color: "#059669",
                  }}>연결됨</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* App info */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#EBF3FF", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>ℹ️</span>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", margin: 0 }}>앱 정보</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "앱 이름", value: "Ello Family" },
              { label: "버전", value: "1.0.0" },
              { label: "지원", value: "support@ellocare.app" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#999" }}>{item.label}</span>
                <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: 16, fontSize: 16, fontWeight: 700,
            background: "#fff", color: "#EF4444",
            border: "1px solid #FEE2E2", borderRadius: 16,
            cursor: "pointer", marginBottom: 32,
          }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
