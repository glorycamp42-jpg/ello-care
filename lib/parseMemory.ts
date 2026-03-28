/* Parse [MEMORY: ...] tags from Claude's response and extract schedule info */

export interface ParsedMemory {
  date: string;
  time: string;
  content: string;
}

const MEMORY_REGEX = /\[MEMORY:\s*(.+?)\]/g;

export function parseMemories(text: string): { cleanText: string; memories: ParsedMemory[] } {
  const memories: ParsedMemory[] = [];

  // Extract all [MEMORY: ...] tags
  let match;
  while ((match = MEMORY_REGEX.exec(text)) !== null) {
    const raw = match[1].trim();
    const parsed = parseMemoryString(raw);
    if (parsed) memories.push(parsed);
  }

  // Remove [MEMORY: ...] tags from displayed text
  const cleanText = text.replace(MEMORY_REGEX, "").replace(/\s{2,}/g, " ").trim();

  return { cleanText, memories };
}

function parseMemoryString(raw: string): ParsedMemory | null {
  // Try to split into date, time, content
  // Expected format: "4월3일 오전10시 Dr.Smith MRI검사"
  // or: "내일 3시 병원 방문"

  const parts = raw.split(/\s+/);
  if (parts.length < 2) return null;

  // Date patterns: N월N일, 내일, 모레, 월요일, etc.
  const datePattern = /(\d+월\d+일|내일|모레|오늘|월요일|화요일|수요일|목요일|금요일|토요일|일요일|\d{4}-\d{2}-\d{2})/;
  // Time patterns: 오전N시, 오후N시, N시, N:00
  const timePattern = /(오전\s?\d+시|오후\s?\d+시|\d+시\s?\d*분?|\d{1,2}:\d{2})/;

  const dateMatch = raw.match(datePattern);
  const timeMatch = raw.match(timePattern);

  const date = dateMatch ? dateMatch[1] : parts[0];
  const time = timeMatch ? timeMatch[1] : "";

  // Content is everything after date and time
  let content = raw;
  if (dateMatch) content = content.replace(dateMatch[0], "");
  if (timeMatch) content = content.replace(timeMatch[0], "");
  content = content.trim();

  if (!content) content = raw;

  return { date, time, content };
}
