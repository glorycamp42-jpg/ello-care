"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FONT_LABELS, FONT_STEPS, applyFontScale, loadFontIdx, saveFontIdx } from "@/lib/ello";

/* ── 설정: 어르신 홈에서 뺀 모든 부가 기능이 여기로 모인다 ──
   보기: 일정 / 건강수첩 / 약 알림
   가족이 설정: 안심 연락처 / 글씨 크기 / 글로 쓰기 켜기
   하단: 로그아웃 */

interface SettingsPageProps {
  userName: string;
  onClose: () => void;
  onOpenReminders: () => void;
  onOpenHealthWallet: () => void;
  onOpenMedications: () => void;
  onOpenSafety: () => void;
  textInputOn: boolean;
  onToggleTextInput: () => void;
}

const ROW = "flex items-center gap-4 h-[72px] px-[18px] w-full text-left active:bg-[#FFF2E8]";
const ICON_BOX = "w-12 h-12 rounded-[14px] bg-[#FFE6D9] flex items-center justify-center shrink-0";
const LABEL = "text-[24px] font-medium text-[#2B211C] flex-1";
const CHEV = <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5C4F48" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
const DIV = <div className="h-[2px] bg-[#F0E6DA] mx-[18px]" />;

function Icon({ d }: { d: React.ReactNode }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
}

export default function SettingsPage({
  userName, onClose, onOpenReminders, onOpenHealthWallet, onOpenMedications, onOpenSafety, textInputOn, onToggleTextInput,
}: SettingsPageProps) {
  const [fontIdx, setFontIdx] = useState(0);
  useEffect(() => { setFontIdx(loadFontIdx()); }, []);

  function cycleFont() {
    const next = (fontIdx + 1) % FONT_STEPS.length;
    setFontIdx(next);
    applyFontScale(FONT_STEPS[next]);
    saveFontIdx(next);
  }

  async function logout() {
    try { await createClient().auth.signOut(); } catch {}
    try { localStorage.removeItem("ello-userId"); } catch {}
    window.location.href = "/login";
  }

  return (
    <div className="flex flex-col h-dvh max-w-app mx-auto bg-cream">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-1.5">
        <button onClick={onClose} className="h-12 pl-2.5 pr-4 rounded-full bg-white border-2 border-[#D9CCC0] flex items-center gap-1.5 active:scale-95">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2B211C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="text-[20px] font-bold text-[#2B211C]">뒤로</span>
        </button>
        <span className="text-[26px] font-bold text-[#2B211C]">설정</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Who */}
        <div className="px-5 pt-2">
          <div className="flex items-center gap-3.5 bg-white rounded-[22px] px-[18px] py-3 border-2 border-[#EADFD3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/characters/secretary.png?v=2" alt="엘로" className="w-14 h-14 rounded-full object-cover" />
            <div className="flex flex-col">
              <span className="text-[24px] font-bold text-[#2B211C]">{userName}</span>
              <span className="text-[18px] font-medium text-[#5C4F48]">엘로가 돌봐드리고 있어요</span>
            </div>
          </div>
        </div>

        {/* 보기 */}
        <div className="px-5 pt-4">
          <div className="text-[20px] font-bold text-[#5C4F48] px-1 pb-2">보기</div>
          <div className="bg-white rounded-[22px] border-2 border-[#EADFD3] overflow-hidden">
            <button className={ROW} onClick={onOpenReminders}>
              <span className={ICON_BOX}><Icon d={<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} /></span>
              <span className={LABEL}>일정</span>{CHEV}
            </button>
            {DIV}
            <button className={ROW} onClick={onOpenHealthWallet}>
              <span className={ICON_BOX}><Icon d={<path d="M22 12h-4l-3 9L9 3l-3 9H2" />} /></span>
              <span className={LABEL}>건강수첩</span>{CHEV}
            </button>
            {DIV}
            <button className={ROW} onClick={onOpenMedications}>
              <span className={ICON_BOX}><Icon d={<><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" /></>} /></span>
              <span className={LABEL}>약 알림</span>{CHEV}
            </button>
          </div>
        </div>

        {/* 가족이 설정 */}
        <div className="px-5 pt-4">
          <div className="text-[20px] font-bold text-[#5C4F48] px-1 pb-2">가족이 설정해 주세요</div>
          <div className="bg-white rounded-[22px] border-2 border-[#EADFD3] overflow-hidden">
            <button className={ROW} onClick={onOpenSafety}>
              <span className={ICON_BOX}><Icon d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} /></span>
              <span className={LABEL}>안심 연락처</span>{CHEV}
            </button>
            {DIV}
            <button className={ROW} onClick={cycleFont}>
              <span className={ICON_BOX}><Icon d={<><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></>} /></span>
              <span className={LABEL}>글씨 크기</span>
              <span className="text-[18px] font-bold text-[#C2410C] mr-1">{FONT_LABELS[fontIdx]}</span>{CHEV}
            </button>
            {DIV}
            <button className={ROW} onClick={onToggleTextInput}>
              <span className={ICON_BOX}><Icon d={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} /></span>
              <span className={LABEL}>글로 쓰기</span>
              <span className={`text-[18px] font-bold mr-1 ${textInputOn ? "text-[#1F7A47]" : "text-[#5C4F48]"}`}>{textInputOn ? "켜짐" : "꺼짐"}</span>{CHEV}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 pt-3">
        <button onClick={logout} className="w-full h-16 rounded-[22px] bg-white border-2 border-[#D9CCC0] flex items-center justify-center gap-2.5 active:scale-[0.98]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5C4F48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          <span className="text-[20px] font-bold text-[#5C4F48]">로그아웃</span>
        </button>
      </div>
    </div>
  );
}
