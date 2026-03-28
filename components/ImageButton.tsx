"use client";

interface ImageButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function ImageButton({
  onClick,
  disabled = false,
}: ImageButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-1.5 group
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      aria-label="사진 보내기"
    >
      <div
        className="w-[64px] h-[64px] rounded-full flex items-center justify-center
                    bg-white text-coral border-2 border-coral/20
                    shadow-md shadow-warm-gray/8
                    group-hover:border-coral/40 group-hover:shadow-lg
                    transition-all duration-200 active:scale-95"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <span className="text-[11px] font-medium text-warm-gray">앨범</span>
    </button>
  );
}
