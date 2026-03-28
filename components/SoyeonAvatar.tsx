"use client";

interface SoyeonAvatarProps {
  size?: number;
  speaking?: boolean;
  showLabel?: boolean;
}

export default function SoyeonAvatar({
  size = 120,
  speaking = false,
  showLabel = false,
}: SoyeonAvatarProps) {
  return (
    <div className={`relative inline-flex flex-col items-center ${speaking ? "speak-glow rounded-full" : ""}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={speaking ? "gentle-float" : ""}
      >
        {/* Warm background circle */}
        <circle cx="100" cy="100" r="98" fill="#FFE8D6" />
        <circle cx="100" cy="100" r="98" stroke="#FF6B35" strokeWidth="2" strokeOpacity="0.3" />

        {/* Body / Yellow outfit */}
        <ellipse cx="100" cy="178" rx="42" ry="28" fill="#FFD93D" />
        <ellipse cx="100" cy="178" rx="42" ry="28" fill="url(#outfit-gradient)" />
        {/* Collar */}
        <path d="M82 158 Q100 168 118 158" stroke="#F5C518" strokeWidth="2" fill="none" />

        {/* Neck */}
        <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />

        {/* Face - rounder, warmer */}
        <ellipse cx="100" cy="110" rx="48" ry="52" fill="#FFDCC8" />
        {/* Face highlight */}
        <ellipse cx="92" cy="100" rx="38" ry="42" fill="#FFE4D6" opacity="0.5" />

        {/* Hair - brown, voluminous */}
        <ellipse cx="100" cy="72" rx="56" ry="48" fill="#5C3317" />
        {/* Hair sides */}
        <ellipse cx="50" cy="100" rx="16" ry="32" fill="#5C3317" />
        <ellipse cx="150" cy="100" rx="16" ry="32" fill="#5C3317" />
        {/* Hair highlight */}
        <ellipse cx="85" cy="58" rx="20" ry="12" fill="#7A4B2A" opacity="0.6" />

        {/* Bangs */}
        <path d="M52 82 Q65 50 80 70 Q88 45 100 65 Q112 42 120 68 Q132 48 148 82"
              fill="#5C3317" />

        {/* Eyes - large, friendly */}
        <ellipse cx="78" cy="112" rx="9" ry="10" fill="white" />
        <ellipse cx="122" cy="112" rx="9" ry="10" fill="white" />
        <ellipse cx="80" cy="113" rx="6" ry="7" fill="#2D1B14" />
        <ellipse cx="124" cy="113" rx="6" ry="7" fill="#2D1B14" />
        {/* Eye sparkle */}
        <circle cx="83" cy="110" r="2.5" fill="white" />
        <circle cx="127" cy="110" r="2.5" fill="white" />
        <circle cx="78" cy="115" r="1.2" fill="white" opacity="0.6" />
        <circle cx="122" cy="115" r="1.2" fill="white" opacity="0.6" />

        {/* Eyebrows - soft arches */}
        <path d="M64 100 Q78 93 90 100" stroke="#5C3317" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M110 100 Q122 93 136 100" stroke="#5C3317" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Blush */}
        <ellipse cx="65" cy="125" rx="10" ry="6" fill="#FFB5A0" opacity="0.45" />
        <ellipse cx="135" cy="125" rx="10" ry="6" fill="#FFB5A0" opacity="0.45" />

        {/* Nose - tiny dot */}
        <ellipse cx="100" cy="122" rx="3" ry="2" fill="#F0C0A8" />

        {/* Mouth */}
        <path
          d={speaking ? "M86 136 Q100 148 114 136" : "M88 135 Q100 144 112 135"}
          stroke="#E5553A"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill={speaking ? "#FF8B7A" : "none"}
        />

        {/* Hair accessory - small flower/clip */}
        <circle cx="140" cy="78" r="6" fill="#FF6B35" opacity="0.8" />
        <circle cx="140" cy="78" r="3" fill="#FFD93D" />

        <defs>
          <linearGradient id="outfit-gradient" x1="58" y1="158" x2="142" y2="198">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="100%" stopColor="#FFD93D" />
          </linearGradient>
        </defs>
      </svg>

      {showLabel && (
        <div className="mt-1 flex flex-col items-center">
          <span className="text-warm-brown font-bold text-base">소연이</span>
          <span className="text-[10px] text-coral font-medium bg-coral-pastel px-2 py-0.5 rounded-full mt-0.5">
            AI 손녀
          </span>
        </div>
      )}
    </div>
  );
}
