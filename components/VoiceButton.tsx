"use client";

interface VoiceButtonProps {
  isListening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function VoiceButton({
  isListening,
  onClick,
  disabled = false,
}: VoiceButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex flex-col items-center gap-1.5 group
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      aria-label={isListening ? "음성 입력 중지" : "음성으로 말하기"}
    >
      <div
        className={`
          relative w-[64px] h-[64px] rounded-full flex items-center justify-center
          transition-all duration-200 active:scale-95
          ${
            isListening
              ? "bg-coral text-white shadow-lg shadow-coral/30"
              : "bg-coral text-white shadow-md shadow-coral/20 group-hover:shadow-lg group-hover:shadow-coral/30"
          }
        `}
      >
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-coral/30 pulse-ring" />
            <span className="absolute inset-0 rounded-full bg-coral/20 pulse-ring" style={{ animationDelay: "0.4s" }} />
          </>
        )}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
          <rect x="9" y="1" width="6" height="14" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <line x1="8" y1="21" x2="16" y2="21" />
        </svg>
      </div>
      <span className="text-[11px] font-medium text-warm-gray">말하기</span>
    </button>
  );
}
