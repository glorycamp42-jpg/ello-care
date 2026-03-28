"use client";

import { TicketState } from "./useTickets";

interface TicketPageProps {
  state: TicketState;
  onClose: () => void;
}

export default function TicketPage({ state, onClose }: TicketPageProps) {
  const level = Math.floor(state.total / 10) + 1;
  const progressInLevel = state.total % 10;
  const progressPct = (progressInLevel / 10) * 100;

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
        <span className="text-warm-brown font-bold text-base">행복티켓</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Big ticket count */}
        <div className="flex flex-col items-center pt-6 pb-5">
          <span className="text-[56px] leading-none">&#x2B50;</span>
          <span className="text-[48px] font-bold text-coral mt-2">{state.total}</span>
          <span className="text-warm-gray-light text-sm mt-1">총 행복티켓</span>
        </div>

        {/* Level + progress */}
        <div className="bg-warm-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-warm-brown font-bold text-sm">레벨 {level}</span>
            <span className="text-warm-gray-light text-[12px]">{progressInLevel}/10 다음 레벨</span>
          </div>
          <div className="w-full h-3 bg-coral-pastel rounded-full overflow-hidden">
            <div
              className="h-full bg-coral rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Fun message */}
        <div className="bg-coral-pastel rounded-2xl p-4 text-center mb-5">
          <p className="text-coral-dark font-medium text-[15px]">
            오늘도 청춘이에요! 계속 모아보세요 &#x2728;
          </p>
        </div>

        {/* Today's activities */}
        <div className="bg-warm-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-warm-brown font-bold text-sm mb-3">오늘 활동</h3>
          {state.todayLogs.length === 0 ? (
            <p className="text-warm-gray-light text-sm text-center py-3">아직 활동이 없어요</p>
          ) : (
            <div className="space-y-2.5">
              {state.todayLogs.map((log, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">&#x1F31F;</span>
                    <span className="text-warm-gray text-sm">{log.action}</span>
                  </div>
                  <span className="text-coral font-bold text-sm">+{log.points}</span>
                </div>
              ))}
              <div className="border-t border-warm-gray-light/15 pt-2 mt-2 flex items-center justify-between">
                <span className="text-warm-brown font-bold text-sm">오늘 합계</span>
                <span className="text-coral font-bold text-sm">+{state.todayTotal}</span>
              </div>
            </div>
          )}
        </div>

        {/* Point guide */}
        <div className="mt-5 bg-warm-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-warm-brown font-bold text-sm mb-3">포인트 안내</h3>
          <div className="space-y-2 text-sm text-warm-gray">
            {[
              ["AI와 대화", "+1"],
              ["안부 체크인", "+2"],
              ["사진 업로드", "+2"],
              ["매일 접속", "+3"],
              ["끝말잇기 게임", "+2"],
              ["노래 부르기", "+1"],
            ].map(([label, pts]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span className="text-coral font-medium">{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
