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

  return (
    <div className="relative inline-flex flex-col items-center">
      <div
        className={`rounded-full overflow-hidden ${speaking ? "speak-bounce speak-glow" : ""}`}
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
