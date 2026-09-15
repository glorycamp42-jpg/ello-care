/* ── Ello: the one character. Name, voice, avatar. ── */

export const ELLO = {
  id: "assistant",                 // persona id used by /api/chat and CharacterAvatar
  name: "엘로",
  voiceId: "sf8Bpb1IU97NI9BHSMRf", // ElevenLabs voice used for the assistant persona
  badge: "나의 비서",
} as const;

export const ELLO_GREETING = "안녕하세요, 엘로예요. 오늘 하루 어떠세요?";

/* Font scale (applied app-wide via body zoom). Persisted in localStorage. */
export const FONT_KEY = "ello-font-scale";
export const FONT_STEPS = [1, 1.15, 1.3] as const;
export const FONT_LABELS = ["보통", "크게", "아주 크게"] as const;

export function applyFontScale(scale: number) {
  try {
    (document.body.style as CSSStyleDeclaration & { zoom?: string }).zoom = scale === 1 ? "" : String(scale);
  } catch {}
}

export function loadFontIdx(): number {
  try {
    const saved = parseFloat(localStorage.getItem(FONT_KEY) || "1");
    const idx = (FONT_STEPS as readonly number[]).indexOf(saved);
    return idx >= 0 ? idx : 0;
  } catch { return 0; }
}

export function saveFontIdx(idx: number) {
  try { localStorage.setItem(FONT_KEY, String(FONT_STEPS[idx])); } catch {}
}
