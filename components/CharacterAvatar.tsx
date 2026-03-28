"use client";

import { useState, useEffect } from "react";

interface CharacterAvatarProps {
  personaId: string;
  size?: number;
  speaking?: boolean;
  showLabel?: boolean;
  label?: string;
  badge?: string;
}

export default function CharacterAvatar({
  personaId,
  size = 120,
  speaking = false,
  showLabel = false,
  label = "소연이",
  badge = "AI 손녀",
}: CharacterAvatarProps) {
  // Mouth animation: toggle open/closed every 200ms while speaking
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (!speaking) { setMouthOpen(false); return; }
    const interval = setInterval(() => setMouthOpen((v) => !v), 200);
    return () => clearInterval(interval);
  }, [speaking]);

  const avatars: Record<string, JSX.Element> = {
    granddaughter: <GranddaughterSVG size={size} mouthOpen={mouthOpen} />,
    oldfriend: <OldFriendSVG size={size} mouthOpen={mouthOpen} />,
    church: <ChurchFriendSVG size={size} mouthOpen={mouthOpen} />,
    assistant: <AssistantSVG size={size} mouthOpen={mouthOpen} />,
  };

  return (
    <div className={`relative inline-flex flex-col items-center ${speaking ? "speak-glow rounded-full" : ""}`}>
      <div className={speaking ? "gentle-float" : ""}>
        {avatars[personaId] || avatars.granddaughter}
      </div>
      {showLabel && (
        <div className="mt-2 flex flex-col items-center">
          <span className="text-warm-brown font-bold text-base">{label}</span>
          <span className="text-[10px] text-coral font-medium bg-coral-pastel px-2 py-0.5 rounded-full mt-0.5">
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── 1. 손주처럼: Young girl, pink bow, bright smile ── */
function GranddaughterSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#FFE8D6" stroke="#FF6B35" strokeWidth="2" strokeOpacity="0.3" />
      {/* Body - yellow */}
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#FFD93D" />
      <path d="M82 158 Q100 168 118 158" stroke="#F5C518" strokeWidth="2" fill="none" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      {/* Face */}
      <ellipse cx="100" cy="110" rx="48" ry="52" fill="#FFDCC8" />
      <ellipse cx="92" cy="100" rx="38" ry="42" fill="#FFE4D6" opacity="0.5" />
      {/* Hair - brown with bangs */}
      <ellipse cx="100" cy="72" rx="56" ry="48" fill="#5C3317" />
      <ellipse cx="50" cy="100" rx="16" ry="32" fill="#5C3317" />
      <ellipse cx="150" cy="100" rx="16" ry="32" fill="#5C3317" />
      <ellipse cx="85" cy="58" rx="20" ry="12" fill="#7A4B2A" opacity="0.6" />
      <path d="M52 82 Q65 50 80 70 Q88 45 100 65 Q112 42 120 68 Q132 48 148 82" fill="#5C3317" />
      {/* Eyes */}
      <ellipse cx="78" cy="112" rx="9" ry="10" fill="white" />
      <ellipse cx="122" cy="112" rx="9" ry="10" fill="white" />
      <ellipse cx="80" cy="113" rx="6" ry="7" fill="#2D1B14" />
      <ellipse cx="124" cy="113" rx="6" ry="7" fill="#2D1B14" />
      <circle cx="83" cy="110" r="2.5" fill="white" />
      <circle cx="127" cy="110" r="2.5" fill="white" />
      {/* Eyebrows */}
      <path d="M64 100 Q78 93 90 100" stroke="#5C3317" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M110 100 Q122 93 136 100" stroke="#5C3317" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <ellipse cx="65" cy="125" rx="10" ry="6" fill="#FFB5A0" opacity="0.45" />
      <ellipse cx="135" cy="125" rx="10" ry="6" fill="#FFB5A0" opacity="0.45" />
      {/* Nose */}
      <ellipse cx="100" cy="122" rx="3" ry="2" fill="#F0C0A8" />
      {/* Mouth - animated */}
      <path
        d={mouthOpen ? "M86 136 Q100 150 114 136" : "M88 135 Q100 144 112 135"}
        stroke="#E5553A" strokeWidth="2.5" strokeLinecap="round"
        fill={mouthOpen ? "#FF8B7A" : "none"}
      />
      {/* Pink bow */}
      <ellipse cx="138" cy="68" rx="12" ry="8" fill="#FF6B9D" transform="rotate(-20 138 68)" />
      <ellipse cx="148" cy="74" rx="12" ry="8" fill="#FF6B9D" transform="rotate(20 148 74)" />
      <circle cx="143" cy="72" r="4" fill="#FF4081" />
    </svg>
  );
}

/* ── 2. 옛친구처럼: Middle-aged woman, warm smile, short wavy hair ── */
function OldFriendSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#DDF0F7" stroke="#4EAACC" strokeWidth="2" strokeOpacity="0.3" />
      {/* Body - blue cardigan */}
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#6BB8D4" />
      <path d="M80 160 Q100 170 120 160" stroke="#5AA3BF" strokeWidth="2" fill="none" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      {/* Face */}
      <ellipse cx="100" cy="112" rx="46" ry="50" fill="#FFDCC8" />
      <ellipse cx="92" cy="102" rx="36" ry="40" fill="#FFE4D6" opacity="0.4" />
      {/* Hair - short, dark brown, wavy */}
      <ellipse cx="100" cy="78" rx="52" ry="42" fill="#3D2914" />
      <ellipse cx="52" cy="95" rx="14" ry="24" fill="#3D2914" />
      <ellipse cx="148" cy="95" rx="14" ry="24" fill="#3D2914" />
      {/* Wavy texture */}
      <path d="M55 80 Q65 60 78 75 Q90 58 100 72 Q110 56 122 74 Q135 58 145 80" fill="#3D2914" />
      <ellipse cx="80" cy="62" rx="14" ry="8" fill="#5A3D20" opacity="0.4" />
      {/* Eyes - warm, slightly smaller */}
      <ellipse cx="80" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="120" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="81" cy="113" rx="5" ry="6" fill="#2D1B14" />
      <ellipse cx="121" cy="113" rx="5" ry="6" fill="#2D1B14" />
      <circle cx="83" cy="110" r="2" fill="white" />
      <circle cx="123" cy="110" r="2" fill="white" />
      {/* Eyebrows */}
      <path d="M66 102 Q80 96 90 102" stroke="#3D2914" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M110 102 Q120 96 134 102" stroke="#3D2914" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Laugh lines */}
      <path d="M62 118 Q58 124 62 130" stroke="#E8C8B0" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M138 118 Q142 124 138 130" stroke="#E8C8B0" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <ellipse cx="68" cy="124" rx="9" ry="5" fill="#FFB5A0" opacity="0.35" />
      <ellipse cx="132" cy="124" rx="9" ry="5" fill="#FFB5A0" opacity="0.35" />
      {/* Nose */}
      <ellipse cx="100" cy="121" rx="3" ry="2.5" fill="#F0C0A8" />
      {/* Mouth */}
      <path
        d={mouthOpen ? "M85 137 Q100 150 115 137" : "M87 136 Q100 145 113 136"}
        stroke="#D4644A" strokeWidth="2.5" strokeLinecap="round"
        fill={mouthOpen ? "#E8907A" : "none"}
      />
    </svg>
  );
}

/* ── 3. 교회친구처럼: Gentle older woman, soft expression, cardigan ── */
function ChurchFriendSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#DDF3EA" stroke="#3DA87A" strokeWidth="2" strokeOpacity="0.3" />
      {/* Body - warm green cardigan with cross necklace */}
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#7BC4A0" />
      <path d="M82 160 Q100 172 118 160" stroke="#5EAD85" strokeWidth="2" fill="none" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      {/* Cross necklace */}
      <line x1="100" y1="160" x2="100" y2="170" stroke="#D4A84A" strokeWidth="2" />
      <line x1="96" y1="164" x2="104" y2="164" stroke="#D4A84A" strokeWidth="2" />
      {/* Face - slightly rounder, softer */}
      <ellipse cx="100" cy="112" rx="45" ry="50" fill="#FFDCC8" />
      <ellipse cx="94" cy="104" rx="34" ry="38" fill="#FFE4D6" opacity="0.4" />
      {/* Hair - silver-gray, permed/curly style */}
      <ellipse cx="100" cy="76" rx="52" ry="44" fill="#8C8078" />
      <ellipse cx="54" cy="92" rx="14" ry="26" fill="#8C8078" />
      <ellipse cx="146" cy="92" rx="14" ry="26" fill="#8C8078" />
      {/* Curly texture */}
      <circle cx="65" cy="65" r="10" fill="#9A928A" opacity="0.6" />
      <circle cx="85" cy="55" r="11" fill="#9A928A" opacity="0.6" />
      <circle cx="108" cy="52" r="12" fill="#9A928A" opacity="0.6" />
      <circle cx="130" cy="58" r="10" fill="#9A928A" opacity="0.6" />
      <circle cx="142" cy="72" r="9" fill="#9A928A" opacity="0.5" />
      <circle cx="58" cy="78" r="9" fill="#9A928A" opacity="0.5" />
      {/* Eyes - gentle, slightly drooped */}
      <ellipse cx="80" cy="112" rx="7" ry="7" fill="white" />
      <ellipse cx="120" cy="112" rx="7" ry="7" fill="white" />
      <ellipse cx="81" cy="113" rx="4.5" ry="5.5" fill="#3D2D20" />
      <ellipse cx="121" cy="113" rx="4.5" ry="5.5" fill="#3D2D20" />
      <circle cx="83" cy="111" r="1.8" fill="white" />
      <circle cx="123" cy="111" r="1.8" fill="white" />
      {/* Eyebrows - soft */}
      <path d="M68 103 Q80 98 90 104" stroke="#8C8078" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M110 104 Q120 98 132 103" stroke="#8C8078" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Wrinkle lines */}
      <path d="M63 120 Q59 126 64 132" stroke="#E8C8B0" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M137 120 Q141 126 136 132" stroke="#E8C8B0" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Blush */}
      <ellipse cx="68" cy="125" rx="9" ry="5" fill="#FFB5A0" opacity="0.3" />
      <ellipse cx="132" cy="125" rx="9" ry="5" fill="#FFB5A0" opacity="0.3" />
      {/* Nose */}
      <ellipse cx="100" cy="122" rx="3" ry="2.5" fill="#F0C0A8" />
      {/* Mouth */}
      <path
        d={mouthOpen ? "M87 137 Q100 149 113 137" : "M89 136 Q100 144 111 136"}
        stroke="#C9604E" strokeWidth="2.5" strokeLinecap="round"
        fill={mouthOpen ? "#E0887A" : "none"}
      />
    </svg>
  );
}

/* ── 4. 비서처럼: Professional woman, neat hair, business look ── */
function AssistantSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#FFF0DC" stroke="#E0820D" strokeWidth="2" strokeOpacity="0.3" />
      {/* Body - navy blazer */}
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#2C3E6B" />
      {/* White collar */}
      <path d="M88 158 L100 168 L112 158" stroke="white" strokeWidth="3" fill="none" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      {/* Face */}
      <ellipse cx="100" cy="112" rx="44" ry="48" fill="#FFDCC8" />
      <ellipse cx="94" cy="104" rx="34" ry="38" fill="#FFE4D6" opacity="0.4" />
      {/* Hair - sleek dark, pulled back */}
      <ellipse cx="100" cy="78" rx="50" ry="42" fill="#1A1210" />
      <ellipse cx="52" cy="92" rx="10" ry="20" fill="#1A1210" />
      <ellipse cx="148" cy="92" rx="10" ry="20" fill="#1A1210" />
      {/* Hair shine */}
      <path d="M70 60 Q90 48 110 58 Q120 50 135 62" stroke="#3D3030" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* Neat side part */}
      <path d="M76 55 Q78 70 76 85" stroke="#2A1E16" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Bun */}
      <circle cx="100" cy="52" r="16" fill="#1A1210" />
      <circle cx="100" cy="52" r="14" fill="#2A1E16" opacity="0.4" />
      {/* Eyes - sharp, confident */}
      <ellipse cx="80" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="120" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="81" cy="113" rx="5" ry="6" fill="#1A1210" />
      <ellipse cx="121" cy="113" rx="5" ry="6" fill="#1A1210" />
      <circle cx="83" cy="110" r="2" fill="white" />
      <circle cx="123" cy="110" r="2" fill="white" />
      {/* Eyebrows - defined */}
      <path d="M66 101 Q78 95 90 101" stroke="#1A1210" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M110 101 Q122 95 134 101" stroke="#1A1210" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Glasses */}
      <rect x="68" y="104" width="24" height="18" rx="4" stroke="#8B7355" strokeWidth="1.8" fill="none" />
      <rect x="108" y="104" width="24" height="18" rx="4" stroke="#8B7355" strokeWidth="1.8" fill="none" />
      <line x1="92" y1="112" x2="108" y2="112" stroke="#8B7355" strokeWidth="1.5" />
      {/* Blush - subtle */}
      <ellipse cx="68" cy="126" rx="8" ry="4" fill="#FFB5A0" opacity="0.25" />
      <ellipse cx="132" cy="126" rx="8" ry="4" fill="#FFB5A0" opacity="0.25" />
      {/* Nose */}
      <ellipse cx="100" cy="122" rx="2.5" ry="2" fill="#F0C0A8" />
      {/* Mouth - composed */}
      <path
        d={mouthOpen ? "M88 137 Q100 147 112 137" : "M90 136 Q100 142 110 136"}
        stroke="#C4604E" strokeWidth="2" strokeLinecap="round"
        fill={mouthOpen ? "#E0887A" : "none"}
      />
    </svg>
  );
}
