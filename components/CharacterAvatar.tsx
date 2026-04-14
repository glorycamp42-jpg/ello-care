"use client";

// v2: updated with new realistic watercolor-style character images (Firefly AI)
const CHARACTER_IMAGES: Record<string, string> = {
  granddaughter: "/characters/grandchild.png?v=2",
  oldfriend: "/characters/friend.png?v=2",
  church: "/characters/church.png?v=2",
  assistant: "/characters/secretary.png?v=2",
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
  const src = CHARACTER_IMAGES[personaId] || CHARACTER_IMAGES.granddaughter;

  // Only show full speaking animation + wave bars for larger avatars (hero view).
  // Small chat-bubble avatars just get a subtle glow to avoid distracting motion.
  const isHero = size >= 96;

  // Outer wrapper: idle sway (always) + glow when speaking
  // Inner layer: idle breathe (always) OR speak-nod (when talking)
  const outerClass = [
    "rounded-full",
    "idle-sway",
    speaking ? "speak-glow" : "",
  ].join(" ");

  const innerClass = [
    "rounded-full",
    "overflow-hidden",
    speaking ? (isHero ? "speak-nod" : "speak-breathe") : "idle-breathe",
  ].join(" ");

  return (
    <div className="relative inline-flex flex-col items-center">
      <div className={outerClass} style={{ width: size, height: size }}>
        <div
          className={innerClass}
          style={{ width: size, height: size }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            width={size}
            height={size}
            style={{ width: size, height: size, objectFit: "cover" }}
            className="rounded-full"
          />
        </div>
      </div>

      {/* Audio wave indicator — only on hero avatar while actually speaking */}
      {speaking && isHero && (
        <div
          aria-hidden
          className="mt-2 flex items-end justify-center"
          style={{ height: 22 }}
        >
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
      )}

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
