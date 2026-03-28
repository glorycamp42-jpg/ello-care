"use client";

import { useState, useEffect, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

const LOTTIE_URLS: Record<string, string> = {
  granddaughter: "https://assets2.lottiefiles.com/packages/lf20_myejiggj.json",
  oldfriend: "https://assets2.lottiefiles.com/packages/lf20_ystsffqy.json",
  church: "https://assets2.lottiefiles.com/packages/lf20_xlmz9xwm.json",
  assistant: "https://assets2.lottiefiles.com/packages/lf20_v1yudlrx.json",
};

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
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Mouth animation for SVG fallback
  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    if (!speaking || !loadFailed) { setMouthOpen(false); return; }
    const interval = setInterval(() => setMouthOpen((v) => !v), 200);
    return () => clearInterval(interval);
  }, [speaking, loadFailed]);

  // Load Lottie JSON
  useEffect(() => {
    const url = LOTTIE_URLS[personaId] || LOTTIE_URLS.granddaughter;
    setAnimationData(null);
    setLoadFailed(false);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setAnimationData(data))
      .catch(() => setLoadFailed(true));
  }, [personaId]);

  // Control play/pause based on speaking
  useEffect(() => {
    if (!lottieRef.current || !animationData) return;
    if (speaking) {
      lottieRef.current.play();
    } else {
      lottieRef.current.goToAndStop(0, true);
    }
  }, [speaking, animationData]);

  const showLottie = animationData && !loadFailed;

  return (
    <div className={`relative inline-flex flex-col items-center ${speaking ? "speak-glow rounded-full" : ""}`}>
      <div className={speaking ? "gentle-float" : ""} style={{ width: size, height: size }}>
        {showLottie ? (
          <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={speaking}
            autoplay={false}
            style={{ width: size, height: size }}
          />
        ) : (
          // SVG fallback
          loadFailed ? (
            <FallbackSVG personaId={personaId} size={size} mouthOpen={mouthOpen} />
          ) : (
            // Loading placeholder
            <div
              className="rounded-full bg-coral-pastel animate-pulse"
              style={{ width: size, height: size }}
            />
          )
        )}
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

/* ── SVG Fallback Avatars ── */
function FallbackSVG({ personaId, size, mouthOpen }: { personaId: string; size: number; mouthOpen: boolean }) {
  const avatars: Record<string, JSX.Element> = {
    granddaughter: <GranddaughterSVG size={size} mouthOpen={mouthOpen} />,
    oldfriend: <OldFriendSVG size={size} mouthOpen={mouthOpen} />,
    church: <ChurchFriendSVG size={size} mouthOpen={mouthOpen} />,
    assistant: <AssistantSVG size={size} mouthOpen={mouthOpen} />,
  };
  return avatars[personaId] || avatars.granddaughter;
}

function GranddaughterSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#FFE8D6" stroke="#FF6B35" strokeWidth="2" strokeOpacity="0.3" />
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#FFD93D" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      <ellipse cx="100" cy="110" rx="48" ry="52" fill="#FFDCC8" />
      <ellipse cx="100" cy="72" rx="56" ry="48" fill="#5C3317" />
      <ellipse cx="50" cy="100" rx="16" ry="32" fill="#5C3317" />
      <ellipse cx="150" cy="100" rx="16" ry="32" fill="#5C3317" />
      <path d="M52 82 Q65 50 80 70 Q88 45 100 65 Q112 42 120 68 Q132 48 148 82" fill="#5C3317" />
      <ellipse cx="78" cy="112" rx="9" ry="10" fill="white" />
      <ellipse cx="122" cy="112" rx="9" ry="10" fill="white" />
      <ellipse cx="80" cy="113" rx="6" ry="7" fill="#2D1B14" />
      <ellipse cx="124" cy="113" rx="6" ry="7" fill="#2D1B14" />
      <circle cx="83" cy="110" r="2.5" fill="white" />
      <circle cx="127" cy="110" r="2.5" fill="white" />
      <path d="M64 100 Q78 93 90 100" stroke="#5C3317" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M110 100 Q122 93 136 100" stroke="#5C3317" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="65" cy="125" rx="10" ry="6" fill="#FFB5A0" opacity="0.45" />
      <ellipse cx="135" cy="125" rx="10" ry="6" fill="#FFB5A0" opacity="0.45" />
      <ellipse cx="100" cy="122" rx="3" ry="2" fill="#F0C0A8" />
      <path d={mouthOpen ? "M86 136 Q100 150 114 136" : "M88 135 Q100 144 112 135"} stroke="#E5553A" strokeWidth="2.5" strokeLinecap="round" fill={mouthOpen ? "#FF8B7A" : "none"} />
      <ellipse cx="138" cy="68" rx="12" ry="8" fill="#FF6B9D" transform="rotate(-20 138 68)" />
      <ellipse cx="148" cy="74" rx="12" ry="8" fill="#FF6B9D" transform="rotate(20 148 74)" />
      <circle cx="143" cy="72" r="4" fill="#FF4081" />
    </svg>
  );
}

function OldFriendSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#DDF0F7" stroke="#4EAACC" strokeWidth="2" strokeOpacity="0.3" />
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#6BB8D4" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      <ellipse cx="100" cy="112" rx="46" ry="50" fill="#FFDCC8" />
      <ellipse cx="100" cy="78" rx="52" ry="42" fill="#3D2914" />
      <ellipse cx="52" cy="95" rx="14" ry="24" fill="#3D2914" />
      <ellipse cx="148" cy="95" rx="14" ry="24" fill="#3D2914" />
      <path d="M55 80 Q65 60 78 75 Q90 58 100 72 Q110 56 122 74 Q135 58 145 80" fill="#3D2914" />
      <ellipse cx="80" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="120" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="81" cy="113" rx="5" ry="6" fill="#2D1B14" />
      <ellipse cx="121" cy="113" rx="5" ry="6" fill="#2D1B14" />
      <circle cx="83" cy="110" r="2" fill="white" />
      <circle cx="123" cy="110" r="2" fill="white" />
      <path d="M66 102 Q80 96 90 102" stroke="#3D2914" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M110 102 Q120 96 134 102" stroke="#3D2914" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="68" cy="124" rx="9" ry="5" fill="#FFB5A0" opacity="0.35" />
      <ellipse cx="132" cy="124" rx="9" ry="5" fill="#FFB5A0" opacity="0.35" />
      <ellipse cx="100" cy="121" rx="3" ry="2.5" fill="#F0C0A8" />
      <path d={mouthOpen ? "M85 137 Q100 150 115 137" : "M87 136 Q100 145 113 136"} stroke="#D4644A" strokeWidth="2.5" strokeLinecap="round" fill={mouthOpen ? "#E8907A" : "none"} />
    </svg>
  );
}

function ChurchFriendSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#DDF3EA" stroke="#3DA87A" strokeWidth="2" strokeOpacity="0.3" />
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#7BC4A0" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      <line x1="100" y1="160" x2="100" y2="170" stroke="#D4A84A" strokeWidth="2" />
      <line x1="96" y1="164" x2="104" y2="164" stroke="#D4A84A" strokeWidth="2" />
      <ellipse cx="100" cy="112" rx="45" ry="50" fill="#FFDCC8" />
      <ellipse cx="100" cy="76" rx="52" ry="44" fill="#8C8078" />
      <ellipse cx="54" cy="92" rx="14" ry="26" fill="#8C8078" />
      <ellipse cx="146" cy="92" rx="14" ry="26" fill="#8C8078" />
      <circle cx="65" cy="65" r="10" fill="#9A928A" opacity="0.6" />
      <circle cx="85" cy="55" r="11" fill="#9A928A" opacity="0.6" />
      <circle cx="108" cy="52" r="12" fill="#9A928A" opacity="0.6" />
      <circle cx="130" cy="58" r="10" fill="#9A928A" opacity="0.6" />
      <ellipse cx="80" cy="112" rx="7" ry="7" fill="white" />
      <ellipse cx="120" cy="112" rx="7" ry="7" fill="white" />
      <ellipse cx="81" cy="113" rx="4.5" ry="5.5" fill="#3D2D20" />
      <ellipse cx="121" cy="113" rx="4.5" ry="5.5" fill="#3D2D20" />
      <circle cx="83" cy="111" r="1.8" fill="white" />
      <circle cx="123" cy="111" r="1.8" fill="white" />
      <ellipse cx="68" cy="125" rx="9" ry="5" fill="#FFB5A0" opacity="0.3" />
      <ellipse cx="132" cy="125" rx="9" ry="5" fill="#FFB5A0" opacity="0.3" />
      <ellipse cx="100" cy="122" rx="3" ry="2.5" fill="#F0C0A8" />
      <path d={mouthOpen ? "M87 137 Q100 149 113 137" : "M89 136 Q100 144 111 136"} stroke="#C9604E" strokeWidth="2.5" strokeLinecap="round" fill={mouthOpen ? "#E0887A" : "none"} />
    </svg>
  );
}

function AssistantSVG({ size, mouthOpen }: { size: number; mouthOpen: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="98" fill="#FFF0DC" stroke="#E0820D" strokeWidth="2" strokeOpacity="0.3" />
      <ellipse cx="100" cy="178" rx="42" ry="28" fill="#2C3E6B" />
      <path d="M88 158 L100 168 L112 158" stroke="white" strokeWidth="3" fill="none" />
      <rect x="92" y="148" width="16" height="14" rx="4" fill="#FFDCC8" />
      <ellipse cx="100" cy="112" rx="44" ry="48" fill="#FFDCC8" />
      <ellipse cx="100" cy="78" rx="50" ry="42" fill="#1A1210" />
      <ellipse cx="52" cy="92" rx="10" ry="20" fill="#1A1210" />
      <ellipse cx="148" cy="92" rx="10" ry="20" fill="#1A1210" />
      <circle cx="100" cy="52" r="16" fill="#1A1210" />
      <ellipse cx="80" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="120" cy="112" rx="8" ry="8" fill="white" />
      <ellipse cx="81" cy="113" rx="5" ry="6" fill="#1A1210" />
      <ellipse cx="121" cy="113" rx="5" ry="6" fill="#1A1210" />
      <circle cx="83" cy="110" r="2" fill="white" />
      <circle cx="123" cy="110" r="2" fill="white" />
      <path d="M66 101 Q78 95 90 101" stroke="#1A1210" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M110 101 Q122 95 134 101" stroke="#1A1210" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <rect x="68" y="104" width="24" height="18" rx="4" stroke="#8B7355" strokeWidth="1.8" fill="none" />
      <rect x="108" y="104" width="24" height="18" rx="4" stroke="#8B7355" strokeWidth="1.8" fill="none" />
      <line x1="92" y1="112" x2="108" y2="112" stroke="#8B7355" strokeWidth="1.5" />
      <ellipse cx="100" cy="122" rx="2.5" ry="2" fill="#F0C0A8" />
      <path d={mouthOpen ? "M88 137 Q100 147 112 137" : "M90 136 Q100 142 110 136"} stroke="#C4604E" strokeWidth="2" strokeLinecap="round" fill={mouthOpen ? "#E0887A" : "none"} />
    </svg>
  );
}
