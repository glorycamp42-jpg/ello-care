"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* -- i18n -- */
const I18N: Record<string, Record<string, string>> = {
  ko: {
    back: "돌아가기", title: "건강 수첩", medications: "복용 약", insurance: "보험증",
    allergies: "알레르기", diagnoses: "진단명", doctors: "의사/전문의", pharmacies: "약국",
    emergency: "비상 연락처", vaccinations: "예방접종", surgeries: "수술 이력",
    add: "추가", save: "저장", cancel: "취소", delete: "삭제", edit: "수정",
    name: "이름", phone: "전화번호", address: "주소", notes: "메모",
    noData: "아직 등록된 항목이 없어요", loading: "불러오는 중...",
    medName: "약 이름", dosage: "용량", frequency: "복용 빈도", purpose: "복용 이유",
    prescriber: "처방 의사", pharmacy: "약국", active: "복용 중",
    carrier: "보험사", planName: "플랜명", memberId: "Member ID", groupNum: "Group #",
    allergen: "원인 물질", type: "종류", reaction: "반응", severity: "심각도",
    diagnosis: "진단명", icdCode: "ICD 코드", specialty: "전문분야", clinic: "병원/클리닉",
    isPcp: "주치의", relationship: "관계", vaccineName: "백신명", dateGiven: "접종일",
    procedure: "수술명", datePerformed: "수술일", surgeon: "집도의", hospital: "병원",
  },
  en: {
    back: "Back", title: "Health Wallet", medications: "Medications", insurance: "Insurance",
    allergies: "Allergies", diagnoses: "Diagnoses", doctors: "Doctors", pharmacies: "Pharmacy",
    emergency: "Emergency Contacts", vaccinations: "Vaccinations", surgeries: "Surgeries",
    add: "Add", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit",
    name: "Name", phone: "Phone", address: "Address", notes: "Notes",
    noData: "No items yet", loading: "Loading...",
    medName: "Medication", dosage: "Dosage", frequency: "Frequency", purpose: "Purpose",
    prescriber: "Prescriber", pharmacy: "Pharmacy", active: "Active",
    carrier: "Carrier", planName: "Plan", memberId: "Member ID", groupNum: "Group #",
    allergen: "Allergen", type: "Type", reaction: "Reaction", severity: "Severity",
    diagnosis: "Diagnosis", icdCode: "ICD Code", specialty: "Specialty", clinic: "Clinic",
    isPcp: "PCP", relationship: "Relationship", vaccineName: "Vaccine", dateGiven: "Date",
    procedure: "Procedure", datePerformed: "Date", surgeon: "Surgeon", hospital: "Hospital",
  },
};

type SectionKey = "medications" | "insurance" | "allergies" | "diagnoses" | "doctors" | "pharmacies" | "emergency" | "vaccinations" | "surgeries";

const TABLE_MAP: Record<SectionKey, string> = {
  medications: "health_medications",
  insurance: "health_insurance_cards",
  allergies: "health_allergies",
  diagnoses: "health_diagnoses",
  doctors: "health_doctors",
  pharmacies: "health_pharmacies",
  emergency: "health_emergency_contacts",
  vaccinations: "health_vaccinations",
  surgeries: "health_surgeries",
};

const SECTION_ICONS: Record<SectionKey, string> = {
  medications: "\uD83D\uDC8A", insurance: "\uD83E\uDEAA", allergies: "\u26A0\uFE0F", diagnoses: "\uD83D\uDCCB",
  doctors: "\uD83D\uDC68\u200D\u2695\uFE0F", pharmacies: "\uD83C\uDFE5", emergency: "\uD83C\uDD98", vaccinations: "\uD83D\uDC89", surgeries: "\uD83C\uDFE8",
};

type FieldDef = { key: string; label: string; type?: "text" | "select" | "date" | "boolean"; options?: string[] };

function getFields(section: SectionKey, t: Record<string, string>): FieldDef[] {
  switch (section) {
    case "medications": return [
      { key: "name", label: t.medName },
      { key: "dosage", label: t.dosage },
      { key: "frequency", label: t.frequency },
      { key: "purpose", label: t.purpose },
      { key: "prescriber", label: t.prescriber },
      { key: "pharmacy", label: t.pharmacy },
    ];
    case "insurance": return [
      { key: "carrier", label: t.carrier },
      { key: "plan_name", label: t.planName },
      { key: "member_id", label: t.memberId },
      { key: "group_number", label: t.groupNum },
    ];
    case "allergies": return [
      { key: "allergen", label: t.allergen },
      { key: "type", label: t.type, type: "select", options: ["drug", "food", "environmental", "other"] },
      { key: "reaction", label: t.reaction },
      { key: "severity", label: t.severity, type: "select", options: ["mild", "moderate", "severe"] },
    ];
    case "diagnoses": return [
      { key: "name", label: t.diagnosis },
      { key: "icd_code", label: t.icdCode },
    ];
    case "doctors": return [
      { key: "name", label: t.name },
      { key: "specialty", label: t.specialty },
      { key: "clinic_name", label: t.clinic },
      { key: "phone", label: t.phone },
      { key: "address", label: t.address },
    ];
    case "pharmacies": return [
      { key: "name", label: t.name },
      { key: "phone", label: t.phone },
      { key: "address", label: t.address },
    ];
    case "emergency": return [
      { key: "name", label: t.name },
      { key: "relationship", label: t.relationship },
      { key: "phone", label: t.phone },
    ];
    case "vaccinations": return [
      { key: "vaccine_name", label: t.vaccineName },
      { key: "date_given", label: t.dateGiven, type: "date" },
    ];
    case "surgeries": return [
      { key: "procedure_name", label: t.procedure },
      { key: "date_performed", label: t.datePerformed, type: "date" },
      { key: "surgeon", label: t.surgeon },
      { key: "hospital", label: t.hospital },
    ];
    default: return [];
  }
}

function displayValue(item: Record<string, unknown>, section: SectionKey): string {
  switch (section) {
    case "medications": return (item.name || "") + " " + (item.dosage || "") + " - " + (item.frequency || "");
    case "insurance": return (item.carrier || "") + " / " + (item.member_id || "");
    case "allergies": return (item.allergen || "") + " (" + (item.severity || "") + ")";
    case "diagnoses": return (item.name || "") + (item.icd_code ? " [" + item.icd_code + "]" : "");
    case "doctors": return (item.name || "") + " - " + (item.specialty || "");
    case "pharmacies": return String(item.name || "");
    case "emergency": return (item.name || "") + " (" + (item.relationship || "") + ") " + (item.phone || "");
    case "vaccinations": return (item.vaccine_name || "") + " - " + (item.date_given || "");
    case "surgeries": return (item.procedure_name || "") + " - " + (item.date_performed || "");
    default: return "";
  }
}

interface Props { onClose: () => void; userId: string; langCode?: string; }

export default function HealthWalletPage({ onClose, userId, langCode = "ko" }: Props) {
  const t = I18N[langCode] || I18N.ko;
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [data, setData] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          let { width, height } = img;
          const MAX = 1200;
          if (width > MAX || height > MAX) {
            const s = MAX / Math.max(width, height);
            width = Math.round(width * s);
            height = Math.round(height * s);
          }
          const c = document.createElement("canvas");
          c.width = width; c.height = height;
          c.getContext("2d")!.drawImage(img, 0, 0, width, height);
          resolve(c.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  async function handleScan(section: SectionKey, file: File) {
    setScanning(true);
    try {
      const dataUrl = await compressImage(file);
      const res = await fetch("/api/health-wallet/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, image: dataUrl }),
      });
      const result = await res.json();
      if (result.fields && Object.values(result.fields).some((v) => v && String(v).trim())) {
        // 자동 저장 (어르신 편의)
        const table = TABLE_MAP[section];
        const saveRes = await fetch("/api/health-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, user_id: userId, ...result.fields }),
        });
        const saveJson = await saveRes.json();
        if (saveJson.error) {
          // 저장 실패 시 수동 편집 모드로
          setDraft(result.fields);
          setAdding(true);
          alert((langCode === "ko" ? "저장 실패: " : "Save failed: ") + saveJson.error);
        } else {
          fetchAll();
          alert(langCode === "ko" ? "사진에서 정보를 저장했어요!" : "Info saved from photo!");
        }
      } else {
        alert(langCode === "ko" ? "사진에서 정보를 읽지 못했어요. 다시 시도해주세요." : "Could not read info from photo. Please try again.");
      }
    } catch {
      alert(langCode === "ko" ? "사진 처리 중 오류가 발생했어요." : "Error processing photo.");
    }
    setScanning(false);
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/health-wallet?userId=" + userId);
      const j = await r.json();
      setData(j);
    } catch { /* ignore */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleAdd(section: SectionKey) {
    setSaving(true);
    const table = TABLE_MAP[section];
    try {
      const r = await fetch("/api/health-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, user_id: userId, ...draft }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setDraft({});
      setAdding(false);
      fetchAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
    setSaving(false);
  }

  async function handleDelete(section: SectionKey, id: string) {
    if (!confirm(langCode === "ko" ? "삭제할까요?" : "Delete?")) return;
    const table = TABLE_MAP[section];
    await fetch("/api/health-wallet", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id }),
    });
    fetchAll();
  }

  const sections: SectionKey[] = ["medications", "insurance", "allergies", "diagnoses", "doctors", "pharmacies", "emergency", "vaccinations", "surgeries"];

  if (activeSection) {
    const table = TABLE_MAP[activeSection];
    const items = (data[table] || []) as Record<string, unknown>[];
    const fields = getFields(activeSection, t);

    return (
      <div className="flex flex-col h-screen bg-cream">
        <div className="bg-warm-brown text-cream px-4 py-3 flex items-center gap-2">
          <button onClick={() => { setActiveSection(null); setAdding(false); setDraft({}); }} className="text-xl">&#8592;</button>
          <span className="text-3xl">{SECTION_ICONS[activeSection]}</span>
          <h2 className="text-lg font-bold flex-1">{t[activeSection]}</h2>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f && activeSection) { handleScan(activeSection, f); } e.target.value = ""; }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={scanning}
            className="bg-white text-warm-brown px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 disabled:opacity-50">
            {scanning ? (langCode === "ko" ? "..." : "...") : (langCode === "ko" ? "\uD83D\uDCF7 촬영" : "\uD83D\uDCF7 Scan")}
          </button>
          <button onClick={() => { setDraft({}); setAdding(true); }} className="bg-coral text-white px-3 py-1.5 rounded-full text-sm font-bold">+ {t.add}</button>
        </div>

        {scanning && (
          <div className="bg-coral/10 mx-3 mt-2 rounded-xl p-3 text-center text-coral font-bold animate-pulse">
            {langCode === "ko" ? "\uD83D\uDCF8 사진에서 정보를 읽고 있어요..." : "\uD83D\uDCF8 Reading info from photo..."}
          </div>
        )}

        {adding && (
          <div className="bg-white mx-3 mt-3 rounded-2xl p-4 shadow-sm border border-warm-gray-light/20">
            {fields.map((f) => (
              <div key={f.key} className="mb-3">
                <label className="block text-sm font-semibold text-warm-brown mb-1">{f.label}</label>
                {f.type === "select" ? (
                  <select value={draft[f.key] || ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="w-full border border-warm-gray-light/30 rounded-xl px-3 py-2 text-base">
                    <option value="">-</option>
                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type || "text"} value={draft[f.key] || ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="w-full border border-warm-gray-light/30 rounded-xl px-3 py-2 text-base" />
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => handleAdd(activeSection)} disabled={saving} className="flex-1 bg-coral text-white py-2 rounded-xl font-bold text-base disabled:opacity-50">{saving ? "..." : t.save}</button>
              <button onClick={() => { setAdding(false); setDraft({}); }} className="flex-1 bg-warm-gray-light/20 text-warm-brown py-2 rounded-xl font-bold text-base">{t.cancel}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto px-3 py-2">
          {items.length === 0 && !adding ? (
            <div className="text-center text-warm-gray-light py-12 text-lg">{t.noData}</div>
          ) : (
            items.map((item) => (
              <div key={item.id as string} className="bg-white rounded-2xl p-4 mb-2 shadow-sm border border-warm-gray-light/10 flex items-center">
                <div className="flex-1 text-warm-brown text-base font-medium">{displayValue(item, activeSection)}</div>
                <button onClick={() => handleDelete(activeSection, item.id as string)} className="text-red-400 text-sm font-bold ml-2 px-2 py-1">{"\u2715"}</button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-cream">
      <div className="bg-warm-brown text-cream px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="text-xl">&#8592;</button>
        <h1 className="text-xl font-bold flex-1">{t.title}</h1>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-warm-gray-light text-lg">{t.loading}</div>
      ) : (
        <div className="flex-1 overflow-auto px-3 py-4">
          <div className="grid grid-cols-3 gap-3">
            {sections.map((s) => {
              const table = TABLE_MAP[s];
              const count = (data[table] || []).length;
              return (
                <button key={s} onClick={() => setActiveSection(s)} className="bg-white rounded-2xl p-5 shadow-sm border border-warm-gray-light/10 flex flex-col items-center gap-3 active:scale-95 transition-transform">
                  <span className="text-5xl">{SECTION_ICONS[s]}</span>
                  <span className="text-base font-bold text-warm-brown">{t[s]}</span>
                  {count > 0 && <span className="bg-coral text-white text-sm font-bold rounded-full px-2.5 py-0.5">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
