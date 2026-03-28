"use client";

import { useState, useEffect } from "react";

export interface FamilyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

const STORAGE_KEY = "ello-family-contacts";

function loadContacts(): FamilyContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveContacts(contacts: FamilyContact[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts)); } catch {}
}

// Export for use in chat call detection
export function findContactByKeyword(keyword: string): FamilyContact | null {
  const contacts = loadContacts();
  return contacts.find((c) =>
    c.name.includes(keyword) || c.relation.includes(keyword)
  ) || null;
}

interface SafetyPageProps {
  onClose: () => void;
}

export default function SafetyPage({ onClose }: SafetyPageProps) {
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formRelation, setFormRelation] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    setContacts(loadContacts());
  }, []);

  function addContact() {
    if (!formName.trim() || !formPhone.trim()) return;
    const newContact: FamilyContact = {
      id: Date.now().toString(),
      name: formName.trim(),
      relation: formRelation.trim() || "가족",
      phone: formPhone.trim().replace(/[^0-9+\-]/g, ""),
    };
    const updated = [...contacts, newContact];
    setContacts(updated);
    saveContacts(updated);
    setFormName("");
    setFormRelation("");
    setFormPhone("");
    setShowForm(false);
  }

  function deleteContact(id: string) {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveContacts(updated);
  }

  function handleSOS() {
    setSosActive(true);
    // Auto-reset after 3 seconds
    setTimeout(() => setSosActive(false), 3000);
  }

  const relationExamples = ["딸", "아들", "손자", "손녀", "며느리", "사위"];

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5">
        <button onClick={onClose} className="text-warm-gray text-sm font-medium flex items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          돌아가기
        </button>
        <span className="text-warm-brown font-bold text-base">안전</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8">

        {/* ── SOS Button ── */}
        <div className="flex flex-col items-center pt-4 pb-6">
          <button
            onClick={handleSOS}
            className={`
              w-[120px] h-[120px] rounded-full flex flex-col items-center justify-center
              transition-all duration-200 active:scale-95
              ${sosActive
                ? "bg-red-600 shadow-xl shadow-red-500/40 scale-105"
                : "bg-red-500 shadow-lg shadow-red-500/30"
              }
            `}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="text-white font-bold text-lg mt-1">SOS</span>
          </button>
          <p className="text-warm-gray-light text-[13px] mt-3 text-center">
            {sosActive ? "아래에서 연락할 가족을 선택하세요" : "긴급할 때 누르세요"}
          </p>
        </div>

        {/* ── Family Contact Cards ── */}
        {contacts.length > 0 && (
          <div className="mb-5">
            <h2 className="text-warm-brown font-bold text-[15px] mb-3">가족 연락처</h2>
            <div className="grid grid-cols-2 gap-3">
              {contacts.map((c) => (
                <div key={c.id} className="bg-warm-white rounded-2xl p-4 shadow-sm relative">
                  {/* Delete button */}
                  <button
                    onClick={() => deleteContact(c.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-warm-gray-light/10 flex items-center justify-center"
                    aria-label="삭제"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A89B94" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  <div className="flex flex-col items-center text-center">
                    {/* Large call button */}
                    <a
                      href={`tel:${c.phone}`}
                      className="w-[64px] h-[64px] rounded-full bg-green-500 flex items-center justify-center
                                 shadow-md shadow-green-500/25 active:scale-95 transition-all"
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </a>
                    <span className="text-warm-brown font-bold text-[15px] mt-2">{c.name}</span>
                    <span className="text-warm-gray-light text-[12px]">{c.relation}</span>
                    <span className="text-warm-gray-light text-[11px] mt-0.5">{c.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SMS quick action (shows when SOS pressed) ── */}
        {sosActive && contacts.length > 0 && (
          <div className="mb-5 bg-red-50 rounded-2xl p-4 border border-red-200">
            <h3 className="text-red-600 font-bold text-sm mb-2">문자 보내기</h3>
            <div className="space-y-2">
              {contacts.map((c) => (
                <a
                  key={c.id}
                  href={`sms:${c.phone}?body=긴급합니다. 도움이 필요합니다. (Ello Care 앱에서 보냄)`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
                >
                  <div>
                    <span className="text-warm-brown font-medium text-sm">{c.name}</span>
                    <span className="text-warm-gray-light text-[12px] ml-2">{c.relation}</span>
                  </div>
                  <span className="text-red-500 font-bold text-sm">문자 보내기</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Add Contact Form ── */}
        {showForm ? (
          <div className="bg-warm-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-warm-brown font-bold text-[15px] mb-3">가족 추가</h3>

            <div className="space-y-3">
              <div>
                <label className="text-warm-gray text-[13px] font-medium mb-1 block">이름</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 영희"
                  className="w-full px-4 py-3 bg-cream rounded-xl border border-warm-gray-light/15
                             text-[15px] text-warm-gray placeholder:text-warm-gray-light/50
                             focus:outline-none focus:border-coral/30"
                />
              </div>

              <div>
                <label className="text-warm-gray text-[13px] font-medium mb-1 block">관계</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {relationExamples.map((r) => (
                    <button
                      key={r}
                      onClick={() => setFormRelation(r)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors
                        ${formRelation === r
                          ? "bg-coral text-white"
                          : "bg-coral-pastel text-coral-dark"
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formRelation}
                  onChange={(e) => setFormRelation(e.target.value)}
                  placeholder="직접 입력"
                  className="w-full px-4 py-3 bg-cream rounded-xl border border-warm-gray-light/15
                             text-[15px] text-warm-gray placeholder:text-warm-gray-light/50
                             focus:outline-none focus:border-coral/30"
                />
              </div>

              <div>
                <label className="text-warm-gray text-[13px] font-medium mb-1 block">전화번호</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  className="w-full px-4 py-3 bg-cream rounded-xl border border-warm-gray-light/15
                             text-[15px] text-warm-gray placeholder:text-warm-gray-light/50
                             focus:outline-none focus:border-coral/30"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-warm-gray-light/10 text-warm-gray rounded-xl text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={addContact}
                  className="flex-1 py-3 bg-coral text-white rounded-xl text-sm font-bold
                             shadow-sm shadow-coral/20 active:scale-[0.98] transition-all"
                >
                  추가하기
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-4 bg-warm-white rounded-2xl shadow-sm text-coral font-bold text-[15px]
                       flex items-center justify-center gap-2 mb-4
                       hover:shadow-md transition-all active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            가족 연락처 추가
          </button>
        )}

        {/* ── Emergency Numbers ── */}
        <div className="bg-warm-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-warm-brown font-bold text-sm mb-3">긴급 전화번호</h3>
          <div className="space-y-2">
            {[
              { name: "응급 (911)", phone: "911", icon: "🚑" },
              { name: "경찰 (911)", phone: "911", icon: "🚔" },
              { name: "독극물 센터", phone: "1-800-222-1222", icon: "☎️" },
            ].map((item) => (
              <a
                key={item.name}
                href={`tel:${item.phone}`}
                className="flex items-center justify-between bg-cream rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-warm-gray font-medium text-sm">{item.name}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
