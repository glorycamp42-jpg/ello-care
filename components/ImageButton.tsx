"use client";

interface ImageButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export default function ImageButton({
  onClick,
  disabled = false,
  label = "카메라",
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
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>
      <span className="text-[11px] font-medium text-warm-gray">{label}</span>
    </button>
  );
}
