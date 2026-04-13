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
  langCode?: string;
}

const SAFETY_I18N: Record<string, {
  back: string; header: string; sosHelpActive: string; sosHelp: string;
  contactsTitle: string; smsTitle: string; smsBtn: string; smsBody: string;
  addFamily: string; addTitle: string; nameLabel: string; namePh: string;
  relLabel: string; relCustomPh: string; phoneLabel: string; phonePh: string;
  cancel: string; addBtn: string; emergencyTitle: string;
  emergencyNames: { ambulance: string; police: string; poison: string };
  relations: string[]; defaultRelation: string; deleteAria: string;
}> = {
  ko: { back: "돌아가기", header: "안전", sosHelpActive: "아래에서 연락할 가족을 선택하세요",
    sosHelp: "긴급할 때 누르세요", contactsTitle: "가족 연락처", smsTitle: "문자 보내기",
    smsBtn: "문자 보내기", smsBody: "긴급합니다. 도움이 필요합니다. (Ello Care 앱에서 보냄)",
    addFamily: "가족 연락처 추가", addTitle: "가족 추가", nameLabel: "이름", namePh: "예: 영희",
    relLabel: "관계", relCustomPh: "직접 입력", phoneLabel: "전화번호", phonePh: "예: 010-1234-5678",
    cancel: "취소", addBtn: "추가하기", emergencyTitle: "긴급 전화번호",
    emergencyNames: { ambulance: "응급 (911)", police: "경찰 (911)", poison: "독극물 센터" },
    relations: ["딸", "아들", "손자", "손녀", "며느리", "사위"], defaultRelation: "가족", deleteAria: "삭제" },
  en: { back: "Back", header: "Safety", sosHelpActive: "Select a family member below",
    sosHelp: "Press in emergency", contactsTitle: "Family Contacts", smsTitle: "Send Text",
    smsBtn: "Send Text", smsBody: "Emergency. I need help. (Sent from Ello Care)",
    addFamily: "Add Family Contact", addTitle: "Add Family", nameLabel: "Name", namePh: "e.g. Jane",
    relLabel: "Relationship", relCustomPh: "Custom", phoneLabel: "Phone", phonePh: "e.g. 555-123-4567",
    cancel: "Cancel", addBtn: "Add", emergencyTitle: "Emergency Numbers",
    emergencyNames: { ambulance: "Emergency (911)", police: "Police (911)", poison: "Poison Control" },
    relations: ["Daughter", "Son", "Grandson", "Granddaughter", "Daughter-in-law", "Son-in-law"], defaultRelation: "Family", deleteAria: "Delete" },
  es: { back: "Volver", header: "Seguridad", sosHelpActive: "Selecciona un familiar abajo",
    sosHelp: "Presiona en emergencia", contactsTitle: "Contactos familiares", smsTitle: "Enviar mensaje",
    smsBtn: "Enviar SMS", smsBody: "Emergencia. Necesito ayuda. (Enviado desde Ello Care)",
    addFamily: "Agregar contacto familiar", addTitle: "Agregar familia", nameLabel: "Nombre", namePh: "ej: María",
    relLabel: "Parentesco", relCustomPh: "Personalizado", phoneLabel: "Teléfono", phonePh: "ej: 555-123-4567",
    cancel: "Cancelar", addBtn: "Agregar", emergencyTitle: "Números de emergencia",
    emergencyNames: { ambulance: "Emergencia (911)", police: "Policía (911)", poison: "Centro de envenenamiento" },
    relations: ["Hija", "Hijo", "Nieto", "Nieta", "Nuera", "Yerno"], defaultRelation: "Familia", deleteAria: "Eliminar" },
  zh: { back: "返回", header: "安全", sosHelpActive: "请选择要联系的家人",
    sosHelp: "紧急时按下", contactsTitle: "家人联系方式", smsTitle: "发送短信",
    smsBtn: "发送短信", smsBody: "紧急情况。我需要帮助。(来自Ello Care)",
    addFamily: "添加家人联系方式", addTitle: "添加家人", nameLabel: "姓名", namePh: "例: 小明",
    relLabel: "关系", relCustomPh: "自定义", phoneLabel: "电话", phonePh: "例: 138-1234-5678",
    cancel: "取消", addBtn: "添加", emergencyTitle: "紧急电话",
    emergencyNames: { ambulance: "急救 (911)", police: "警察 (911)", poison: "中毒控制" },
    relations: ["女儿", "儿子", "孙子", "孙女", "儿媳", "女婿"], defaultRelation: "家人", deleteAria: "删除" },
  vi: { back: "Quay lại", header: "An toàn", sosHelpActive: "Chọn người thân bên dưới",
    sosHelp: "Nhấn khi khẩn cấp", contactsTitle: "Liên hệ gia đình", smsTitle: "Gửi tin nhắn",
    smsBtn: "Gửi SMS", smsBody: "Khẩn cấp. Tôi cần giúp đỡ. (Gửi từ Ello Care)",
    addFamily: "Thêm liên hệ", addTitle: "Thêm người thân", nameLabel: "Tên", namePh: "VD: Lan",
    relLabel: "Quan hệ", relCustomPh: "Tự nhập", phoneLabel: "Điện thoại", phonePh: "VD: 0901234567",
    cancel: "Hủy", addBtn: "Thêm", emergencyTitle: "Số khẩn cấp",
    emergencyNames: { ambulance: "Cấp cứu (911)", police: "Cảnh sát (911)", poison: "Trung tâm độc" },
    relations: ["Con gái", "Con trai", "Cháu trai", "Cháu gái", "Con dâu", "Con rể"], defaultRelation: "Gia đình", deleteAria: "Xóa" },
  ja: { back: "戻る", header: "安全", sosHelpActive: "下から連絡する家族を選んでください",
    sosHelp: "緊急時に押す", contactsTitle: "家族の連絡先", smsTitle: "メッセージ送信",
    smsBtn: "送信", smsBody: "緊急です。助けが必要です。(Ello Careから送信)",
    addFamily: "家族の連絡先を追加", addTitle: "家族を追加", nameLabel: "名前", namePh: "例: 花子",
    relLabel: "関係", relCustomPh: "直接入力", phoneLabel: "電話番号", phonePh: "例: 090-1234-5678",
    cancel: "キャンセル", addBtn: "追加", emergencyTitle: "緊急電話番号",
    emergencyNames: { ambulance: "救急 (911)", police: "警察 (911)", poison: "毒物センター" },
    relations: ["娘", "息子", "孫", "孫娘", "嫁", "婿"], defaultRelation: "家族", deleteAria: "削除" },
};

export default function SafetyPage({ onClose, langCode = "ko" }: SafetyPageProps) {
  const t = SAFETY_I18N[langCode] || SAFETY_I18N.ko;
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
      relation: formRelation.trim() || t.defaultRelation,
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

  const relationExamples = t.relations;

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5">
        <button onClick={onClose} className="text-warm-gray text-sm font-medium flex items-center gap-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t.back}
        </button>
        <span className="text-warm-brown font-bold text-base">{t.header}</span>
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
            {sosActive ? t.sosHelpActive : t.sosHelp}
          </p>
        </div>

        {/* ── Family Contact Cards ── */}
        {contacts.length > 0 && (
          <div className="mb-5">
            <h2 className="text-warm-brown font-bold text-[15px] mb-3">{t.contactsTitle}</h2>
            <div className="grid grid-cols-2 gap-3">
              {contacts.map((c) => (
                <div key={c.id} className="bg-warm-white rounded-2xl p-4 shadow-sm relative">
                  {/* Delete button */}
                  <button
                    onClick={() => deleteContact(c.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-warm-gray-light/10 flex items-center justify-center"
                    aria-label={t.deleteAria}
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
            <h3 className="text-red-600 font-bold text-sm mb-2">{t.smsTitle}</h3>
            <div className="space-y-2">
              {contacts.map((c) => (
                <a
                  key={c.id}
                  href={`sms:${c.phone}?body=${encodeURIComponent(t.smsBody)}`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
                >
                  <div>
                    <span className="text-warm-brown font-medium text-sm">{c.name}</span>
                    <span className="text-warm-gray-light text-[12px] ml-2">{c.relation}</span>
                  </div>
                  <span className="text-red-500 font-bold text-sm">{t.smsBtn}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Add Contact Form ── */}
        {showForm ? (
          <div className="bg-warm-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="text-warm-brown font-bold text-[15px] mb-3">{t.addTitle}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-warm-gray text-[13px] font-medium mb-1 block">{t.nameLabel}</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t.namePh}
                  className="w-full px-4 py-3 bg-cream rounded-xl border border-warm-gray-light/15
                             text-[15px] text-warm-gray placeholder:text-warm-gray-light/50
                             focus:outline-none focus:border-coral/30"
                />
              </div>

              <div>
                <label className="text-warm-gray text-[13px] font-medium mb-1 block">{t.relLabel}</label>
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
                  placeholder={t.relCustomPh}
                  className="w-full px-4 py-3 bg-cream rounded-xl border border-warm-gray-light/15
                             text-[15px] text-warm-gray placeholder:text-warm-gray-light/50
                             focus:outline-none focus:border-coral/30"
                />
              </div>

              <div>
                <label className="text-warm-gray text-[13px] font-medium mb-1 block">{t.phoneLabel}</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder={t.phonePh}
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
                  {t.cancel}
                </button>
                <button
                  onClick={addContact}
                  className="flex-1 py-3 bg-coral text-white rounded-xl text-sm font-bold
                             shadow-sm shadow-coral/20 active:scale-[0.98] transition-all"
                >
                  {t.addBtn}
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
            {t.addFamily}
          </button>
        )}

        {/* ── Emergency Numbers ── */}
        <div className="bg-warm-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-warm-brown font-bold text-sm mb-3">{t.emergencyTitle}</h3>
          <div className="space-y-2">
            {[
              { name: t.emergencyNames.ambulance, phone: "911", icon: "🚑" },
              { name: t.emergencyNames.police, phone: "911", icon: "🚔" },
              { name: t.emergencyNames.poison, phone: "1-800-222-1222", icon: "☎️" },
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
