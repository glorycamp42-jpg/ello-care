"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

/* 안심 플로팅 메뉴: SOS 긴급전화 + 사기 확인 + 추억 이야기 + 글씨 크기
   layout.tsx에 마운트 — 메인 화면("/")에서만 버튼 표시, 글씨 크기는 전역 적용 */

interface FamilyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

function loadContacts(): FamilyContact[] {
  try {
    const raw = localStorage.getItem("ello-family-contacts");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const FONT_KEY = "ello-font-scale";
const FONT_STEPS = [1, 1.15, 1.3];
const FONT_LABELS = ["보통", "크게", "아주 크게"];

function applyFontScale(scale: number) {
  try {
    (document.body.style as CSSStyleDeclaration & { zoom?: string }).zoom = scale === 1 ? "" : String(scale);
  } catch {}
}

export default function CareMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sosConfirm, setSosConfirm] = useState(false);
  const [fontIdx, setFontIdx] = useState(0);
  const [toast, setToast] = useState("");

  // 저장된 글씨 크기를 모든 페이지에 적용
  useEffect(() => {
    try {
      const saved = parseFloat(localStorage.getItem(FONT_KEY) || "1");
      const idx = FONT_STEPS.indexOf(saved);
      const useIdx = idx >= 0 ? idx : 0;
      setFontIdx(useIdx);
      applyFontScale(FONT_STEPS[useIdx]);
    } catch {}
  }, [pathname]);

  function cycleFont() {
    const next = (fontIdx + 1) % FONT_STEPS.length;
    setFontIdx(next);
    applyFontScale(FONT_STEPS[next]);
    try {
      localStorage.setItem(FONT_KEY, String(FONT_STEPS[next]));
    } catch {}
    setToast(`글씨 크기: ${FONT_LABELS[next]}`);
    setTimeout(() => setToast(""), 1500);
  }

  function handleSOS() {
    const contacts = loadContacts();
    if (contacts.length === 0) {
      setToast("먼저 안심 연락처를 등록해주세요");
      setTimeout(() => setToast(""), 2500);
      setSosConfirm(false);
      setOpen(false);
      return;
    }
    // 첫 번째 연락처로 전화
    window.location.href = `tel:${contacts[0].phone}`;
    setSosConfirm(false);
    setOpen(false);
  }

  if (pathname !== "/") return null;

  return (
    <>
      {/* 토스트 */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[95] bg-warm-gray text-white text-[14px] font-bold px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {/* SOS 확인 오버레이 */}
      {sosConfirm && (
        <div className="fixed inset-0 z-[96] bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm text-center">
            <div className="text-6xl mb-3">🆘</div>
            <p className="text-[22px] font-bold text-warm-gray mb-2">가족에게 전화할까요?</p>
            <p className="text-[14px] text-warm-gray-light mb-6">
              등록된 첫 번째 안심 연락처로 바로 전화를 겁니다
            </p>
            <button
              onClick={handleSOS}
              className="w-full py-4 rounded-2xl text-[19px] font-bold bg-red-500 text-white active:scale-95 transition-transform mb-2"
            >
              📞 네, 전화하기
            </button>
            <button
              onClick={() => setSosConfirm(false)}
              className="w-full py-3.5 rounded-2xl text-[16px] font-bold bg-warm-gray-light/15 text-warm-gray"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 메뉴 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
      )}

      {/* 펼쳐진 메뉴 */}
      {open && (
        <div className="fixed right-4 bottom-44 z-[94] flex flex-col gap-2.5 items-end">
          <button
            onClick={() => {
              setOpen(false);
              setSosConfirm(true);
            }}
            className="flex items-center gap-2.5 bg-red-500 text-white pl-4 pr-5 py-3.5 rounded-full shadow-lg text-[16px] font-bold active:scale-95 transition-transform"
          >
            <span className="text-xl">🆘</span> 긴급 전화
          </button>
          <button
            onClick={() => (window.location.href = "/scam-check")}
            className="flex items-center gap-2.5 bg-white text-warm-gray pl-4 pr-5 py-3.5 rounded-full shadow-lg text-[16px] font-bold active:scale-95 transition-transform"
          >
            <span className="text-xl">🛡️</span> 사기 문자 확인
          </button>
          <button
            onClick={() => (window.location.href = "/memory-talk")}
            className="flex items-center gap-2.5 bg-white text-warm-gray pl-4 pr-5 py-3.5 rounded-full shadow-lg text-[16px] font-bold active:scale-95 transition-transform"
          >
            <span className="text-xl">📷</span> 추억 이야기
          </button>
          <button
            onClick={cycleFont}
            className="flex items-center gap-2.5 bg-white text-warm-gray pl-4 pr-5 py-3.5 rounded-full shadow-lg text-[16px] font-bold active:scale-95 transition-transform"
          >
            <span className="text-xl">🔍</span> 글씨 크기 ({FONT_LABELS[fontIdx]})
          </button>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="안심 메뉴"
        className={`fixed right-4 bottom-28 z-[94] w-[60px] h-[60px] rounded-full shadow-xl flex items-center justify-center text-2xl active:scale-90 transition-all ${
          open ? "bg-warm-gray text-white rotate-45" : "bg-red-500 text-white"
        }`}
      >
        {open ? "✕" : "🆘"}
      </button>
    </>
  );
}
