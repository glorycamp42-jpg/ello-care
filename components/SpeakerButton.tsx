"use client";

interface SpeakerButtonProps {
  isSpeaking: boolean;
  onClick: () => void;
  label?: string;
  labelActive?: string;
}

export default function SpeakerButton({
  isSpeaking,
  onClick,
  label = "듣기",
  labelActive = "듣는 중",
}: SpeakerButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group cursor-pointer"
      aria-label={isSpeaking ? "음성 중지" : "다시 듣기"}
    >
      <div
        className={`
          w-[64px] h-[64px] rounded-full flex items-center justify-center
          transition-all duration-200 active:scale-95
          ${
            isSpeaking
              ? "bg-coral-pastel text-coral border-2 border-coral/30"
              : "bg-white text-coral border-2 border-coral/20 shadow-md shadow-warm-gray/8 group-hover:border-coral/40 group-hover:shadow-lg"
          }
        `}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isSpeaking ? (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          ) : (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </>
          )}
        </svg>
      </div>
      <span className="text-[11px] font-medium text-warm-gray">
        {isSpeaking ? labelActive : label}
      </span>
    </button>
  );
}
