/**
 * Make text read naturally by Korean TTS.
 * "오전 07:50" → "오전 일곱시 오십분", "15:30" → "오후 세시 삼십분", "2026-09-16" → "9월 16일"
 * ElevenLabs reads "07:50" digit by digit ("공칠오공"), which sounds robotic to Korean listeners.
 */
const HOURS_KO = ["열두", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열", "열한", "열두"];

function koreanNumber(n: number): string {
  // Sino-Korean, 0..99 (minutes)
  const d = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  if (n < 10) return d[n];
  const tens = Math.floor(n / 10), ones = n % 10;
  return (tens === 1 ? "십" : d[tens] + "십") + d[ones];
}

export function koreanTimeWords(hour24: number, minute: number, explicitPeriod?: string): string {
  let period = explicitPeriod;
  let h = hour24;
  if (!period) {
    if (h === 0) { period = "새벽"; h = 12; }
    else if (h < 6) period = "새벽";
    else if (h < 12) period = "오전";
    else if (h === 12) period = "낮";
    else if (h < 18) { period = "오후"; h -= 12; }
    else if (h < 21) { period = "저녁"; h -= 12; }
    else { period = "밤"; h -= 12; }
  } else if (h > 12) h -= 12;
  else if (h === 0) h = 12;
  const hourWord = HOURS_KO[h] + "시";
  const minuteWord = minute === 0 ? "" : minute === 30 ? " 반" : " " + koreanNumber(minute) + "분";
  return `${period} ${hourWord}${minuteWord}`;
}

export function naturalizeKoreanForTts(text: string): string {
  if (!/[가-힣]/.test(text)) return text;
  let out = text;
  // ISO dates → M월 D일
  out = out.replace(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g, (_m, _y, mo, d) => `${Number(mo)}월 ${Number(d)}일`);
  // "오전 07:50", "오후 3:15", "07:50", "7:50"
  out = out.replace(/(오전|오후|새벽|저녁|밤|낮)?\s*\b(\d{1,2}):(\d{2})\b(?!\s*:)/g, (m, period, hh, mm) => {
    const h = Number(hh), min = Number(mm);
    if (h > 23 || min > 59) return m;
    return koreanTimeWords(h, min, period || undefined);
  });
  // "7시 50분" already reads fine; "30분" → keep.
  return out.replace(/\s{2,}/g, " ");
}
