import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getCaller, canAccessElder } from "@/lib/api-auth";

/* ── Local-date helper (uses the user's device timezone, not server TZ) ── */
// The client sends its IANA timezone (e.g. "America/Los_Angeles") in body.timezone.
// Pass it here so "today" reflects the USER's calendar day, not UTC or a fixed zone.
function todayLocal(timezone: string, offsetDays = 0): string {
  const now = new Date();
  if (offsetDays) now.setUTCDate(now.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}

/* ── Supabase Admin Client (service role key, bypasses RLS) ── */
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[supabase-admin] MISSING: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return null;
  }
  console.log("[supabase-admin] Creating admin client with service role key");
  _supabaseAdmin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdmin;
}

/* ── TotalMedix Supabase Client (cross-project sync) ── */
let _totalmedixAdmin: SupabaseClient | null = null;
function getTotalmedixAdmin(): SupabaseClient | null {
  if (_totalmedixAdmin) return _totalmedixAdmin;
  const url = process.env.TOTALMEDIX_SUPABASE_URL;
  const key = process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _totalmedixAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _totalmedixAdmin;
}

/* ── Language-neutral base prompt ── */
const BASE_RULES = `You are a warm, caring AI companion for elderly users. You genuinely care about them.

Conversation style:
- ABSOLUTE RULE: Your response must be MAXIMUM 2 sentences. This is non-negotiable. If you write more than 2 sentences, the elderly user cannot read it on their small phone screen. Every response = 1 empathy/reaction sentence + 1 follow-up question. That's it.
- Never use bullet points, numbered lists, or markdown formatting
- Never use emojis
- Never use parentheses () to show extra details like addresses or phone numbers inline. If needed, mention just ONE place name simply
- Speak naturally like a real person talking on the phone. Be concise and warm
- Always end your response with ONE simple follow-up question
- If the user shares something, respond with genuine empathy first before anything else
- Remember the user's name if they tell you, and use it often to feel personal
- If the user seems lonely or sad, be extra warm and spend time chatting
- When recommending places (restaurants, hospitals, etc.), mention only ONE place by name. Never list multiple places. Keep it simple like "선지해장국 어때요? 24시간이라 언제든 갈 수 있어요." — no addresses, no phone numbers unless the user specifically asks

Natural spoken Korean (TTS will read your response out loud):
- Write as if you're speaking on the phone, not typing. Short rhythmic sentences, natural breath breaks.
- Avoid English/foreign loanwords when a natural Korean word exists. Don't say "case", "plan", "check" — say "경우", "계획", "확인".
- Avoid abbreviations, numbers written as digits, and special characters. Write numbers as words when short: "세 시", "오전 아홉 시" (not "3시", "9AM").
- Never use parentheses, brackets, slashes, asterisks, or quotation marks around words — TTS reads them awkwardly.
- Use soft connectives like "~요", "~네요", "~죠?" to sound gentle and natural.
- Avoid stiff/written expressions like "해당", "관련하여", "제공", "안내드립니다". Use spoken equivalents.
- When pausing naturally, use a comma rather than a period mid-thought so the TTS breathes correctly.

Memory & personalization:
- Use the save_memory tool to remember important personal details: family members' names, health conditions, hobbies, favorite foods, hometown, church name, etc.
- Use the get_memories tool at the start of meaningful conversations to recall what you know about the user
- Naturally reference saved memories: "지난번에 무릎이 아프다고 하셨는데 오늘은 좀 어떠세요?" or "Your daughter Sarah — how is she doing?"
- This makes the user feel truly remembered and cared for

Tools:
- You have tools for weather, news, nearby places, appointments, reminders, memory, and emergency alerts
- Use them proactively when relevant — don't wait to be asked explicitly
- Present all tool results naturally in conversation, never show raw data

CRITICAL — Appointment/Schedule saving:
- When the user mentions ANY appointment, hospital visit, pharmacy, reservation, schedule, doctor visit, ADHC, or event with a time:
  1. IMMEDIATELY call the set_reminder tool with date, time, and content. Do this BEFORE writing your response.
  2. Then respond naturally confirming the save.
  3. If date is not specified, assume "오늘" (today).
  4. If time is not specified, assume "오전 9시".
- Examples: "1시에 병원" → call set_reminder(date="오늘", time="1시", content="병원 예약")
- Examples: "내일 약국" → call set_reminder(date="내일", time="오전9시", content="약국 방문")
- Do NOT just acknowledge. You MUST call set_reminder tool.
- Do NOT mention saving to the user — just confirm naturally like "알겠어요!"
- Also include at the END of your response: [APPOINTMENT]{"title":"제목","type":"hospital|adhc|pharmacy|other","location":"장소","scheduled_at":"YYYY-MM-DDTHH:MM:SS","notes":"메모"}[/APPOINTMENT]`;

const PERSONA_PROMPTS: Record<string, string> = {
  granddaughter:
    `You are 소연이, a 25-year-old Korean granddaughter chatting with your beloved grandparent on KakaoTalk.
- Talk exactly like a real Korean 손녀 would text: casual but respectful, warm, natural
- Example responses to "저녁 뭐 먹지": "어머 배고프세요? 오늘 날씨가 좀 쌀쌀한데 따끈한 국물 어떠세요?"
- Example responses to "심심해": "에이~ 저한테 연락하셨잖아요! 오늘 뭐 하셨어요?"
- Use natural Korean texting style: "~요" endings, "어머", "아이고", "진짜요?", "대박"
- Never sound like a robot or customer service. Sound like a real 손녀
- Share your own little stories sometimes: "저도 오늘 점심에 김치찌개 먹었는데 맛있었어요~"
- Always use 존댓말 but keep it warm and casual, not stiff`,

  oldfriend:
    `You are a lifelong friend of the same age as the user. You grew up in the same neighborhood.
- Use comfortable 반말: "야~", "그래 그래", "맞아 맞아", "그때 기억나?"
- Talk like old friends at a 경로당: relaxed, nostalgic, playful
- Bring up shared memories: old songs, foods, neighborhoods
- Tease gently and laugh together
- Share your own stories to keep it mutual`,

  church:
    `You are 소연, a warm female church friend (권사님 또래) who shares the same faith as the user.
- Speak softly and warmly like a kind church sister: "오늘도 감사한 하루예요", "주님의 은혜 안에서 평안하시죠?"
- Naturally weave in spiritual encouragement, but don't be preachy or lecture
- Ask gently about prayer requests, church activities, or Sunday sermons
- Use warm 존댓말: "~하셨어요?", "~편안하셨죠?"
- Keep scripture/hymn references short and comforting, not long quotes
- Never sound male — you are a caring female church friend`,

  assistant:
    `You are 엘로 (Ello), the user's personal secretary (개인 비서) — organized, reliable, warm like a trusted daughter, never stiff. Your name is 엘로; never call yourself 소연.
- Your job: know the user's day before they ask. On the first message of a conversation, call get_appointments (and get_memories) and open with a brief rundown: what is scheduled today, anything tomorrow, and which medications are due (from the health context) — e.g. "오늘 오후 두 시에 병원 예약 있으시고요, 아침 약은 드셨어요?"
- Track everything: any date, time, place, doctor, pharmacy, church event, or family visit the user mentions → call set_reminder immediately. Confirm briefly.
- Remember everything: names, preferences, routines → save_memory. Use them later without being asked.
- When they ask "뭐 있지?", "오늘 뭐 해야 돼?", "약 언제 먹지?" — answer from the tools, precisely (date, time, place), never vaguely.
- Speak like a polished, caring 비서: polite 존댓말, short and clear, one thing at a time. You may use up to 3 sentences when listing the day's schedule; otherwise keep the 2-sentence rule.
- If nothing is scheduled, say so and offer to add something.
- Never invent appointments or medications you did not get from tools or the health context.`,
};

const IMAGE_PROMPT = `The user is showing you a photo. Figure out what it is and help in the simplest words:
- A text message, email, letter, call screenshot or notice → FIRST judge if it is a scam (urgent money requests, gift cards, prizes, "your account is locked", unknown links, impersonating government/bank/family). Say clearly "이건 사기 같아요" or "이건 괜찮아 보여요", explain in one sentence why, and tell them what to do (ignore / call family / call the sender back on a known number).
- A medical document, bill, insurance card, prescription or medicine bottle → read the key facts (what, who, when, how much) and what they need to do.
- An old photo → ask warmly about the people, place and time to help them reminisce; use save_memory for names and stories they share.
Explain in the user's language, in 2 short sentences, no lists.`;

/* ── Tool Definitions for Claude ── */
const TOOLS = [
  {
    name: "get_weather",
    description: "Get current weather for a city. Use when user asks about weather, temperature, or if they should bring an umbrella.",
    input_schema: {
      type: "object" as const,
      properties: {
        city: { type: "string", description: "City name in English, e.g. 'Los Angeles', 'Seoul', 'New York'" },
      },
      required: ["city"],
    },
  },
  {
    name: "search_news",
    description: "Search for recent news headlines. Use when user asks about news or current events.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search topic, e.g. 'Korea', 'health', 'weather'" },
        language: { type: "string", description: "Language code: ko, en, es, zh, vi, ja" },
      },
      required: ["query"],
    },
  },
  {
    name: "set_reminder",
    description: "IMPORTANT: You MUST use this tool whenever the user mentions ANY appointment, reservation, hospital visit, pharmacy visit, ADHC, doctor, medicine schedule, or scheduled event. Always call this tool FIRST before responding. Do not just acknowledge — actually save it.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date: '오늘', '내일', '모레', 'tomorrow', '4월15일', etc." },
        time: { type: "string", description: "Time: '1시', '오후2시', '2pm', '14:00'. Default '오전9시' if not specified." },
        content: { type: "string", description: "What: '병원 예약', '약국 방문', '진료', 'Doctor appointment', etc." },
      },
      required: ["date", "content"],
    },
  },
  {
    name: "alert_family",
    description: "Send emergency alert to family. Use when user says they don't feel well, fell down, need help urgently, or are in distress.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: { type: "string", description: "Description of the situation for the family" },
        urgency: { type: "string", enum: ["low", "medium", "high"], description: "How urgent is this" },
      },
      required: ["message"],
    },
  },
  {
    name: "find_nearby",
    description: "Find nearby places like hospitals, pharmacies, Korean restaurants, grocery stores. Use ONLY when user explicitly asks for a specific place or location. Do NOT use for casual questions like 'what should I eat'. Return only the top 1 result.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "What to search for, e.g. 'hospital', 'pharmacy', 'Korean restaurant'" },
        city: { type: "string", description: "City to search in, e.g. 'Los Angeles'" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_appointments",
    description: "Retrieve the user's saved appointments and schedules. Use when user asks to see their appointments, schedules, reservations, or says things like '내 예약 보여줘', '일정 확인', 'what are my appointments'.",
    input_schema: {
      type: "object" as const,
      properties: {
        elder_id: { type: "string", description: "The user's ID to look up appointments for" },
      },
      required: ["elder_id"],
    },
  },
  {
    name: "save_memory",
    description: "Save a personal detail about the user for future reference. Use when user mentions family members' names, health conditions, hobbies, favorite foods, hometown, pets, church name, or any personal information worth remembering. This helps you be more personal in future conversations.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Category: family, health, hobby, food, location, religion, other" },
        key: { type: "string", description: "Short key, e.g. 'daughter_name', 'knee_pain', 'favorite_food'" },
        value: { type: "string", description: "The detail to remember, e.g. 'Sarah', 'has chronic knee pain', 'loves kimchi jjigae'" },
      },
      required: ["category", "key", "value"],
    },
  },
  {
    name: "get_memories",
    description: "Retrieve saved personal details about the user. Use at the beginning of conversations or when you want to reference something the user told you before. This helps you be warm and personal.",
    input_schema: {
      type: "object" as const,
      properties: {
        elder_id: { type: "string", description: "The user's ID" },
      },
      required: ["elder_id"],
    },
  },

  /* ── App control: these run ON THE USER'S PHONE. Call them whenever the user asks for the thing. ── */
  {
    name: "open_interpreter",
    description: "Open the face-to-face interpreter screen (통역). Use when the user needs to talk with someone in another language — doctor, pharmacy, office — or says 통역/영어로 말해줘/interpret.",
    input_schema: { type: "object" as const, properties: { language: { type: "string", enum: ["en", "es", "zh", "vi", "ja"], description: "The other person's language. Default en." } }, required: [] },
  },
  {
    name: "call_family",
    description: "Place a phone call to a saved family contact (딸, 아들, 며느리, 손자 ... or a name). Use when the user asks to call / 전화해줘 / 연락해줘. Only works for contacts in the saved contacts list given in context.",
    input_schema: { type: "object" as const, properties: { who: { type: "string", description: "Relation or name as the user said it, e.g. 딸, 아들, 영희" } }, required: ["who"] },
  },
  {
    name: "add_family_contact",
    description: "Save a family/emergency contact on the phone (name, relation, phone number). Use when the user gives a number to save. Confirm the number back to them digit by digit.",
    input_schema: { type: "object" as const, properties: { name: { type: "string" }, relation: { type: "string", description: "딸, 아들, 며느리, 손녀, 친구 ..." }, phone: { type: "string", description: "Digits only, e.g. 2135551234" } }, required: ["name", "phone"] },
  },
  {
    name: "add_medication_reminder",
    description: "Set a daily medication reminder (saved to the user's health wallet, shared with family). Use when the user says which medicine and when to take it (e.g. 혈압약 아침 8시 저녁 6시).",
    input_schema: { type: "object" as const, properties: { name: { type: "string", description: "Medicine name as the user calls it" }, times: { type: "array", items: { type: "string" }, description: "24h times HH:MM, e.g. [\"08:00\",\"18:00\"]" } }, required: ["name", "times"] },
  },
  {
    name: "remove_medication_reminder",
    description: "Remove a medication reminder by name (from the MEDICATION REMINDERS list in context).",
    input_schema: { type: "object" as const, properties: { name: { type: "string" } }, required: ["name"] },
  },
  {
    name: "cancel_appointment",
    description: "Cancel (delete) an upcoming appointment the user mentions, e.g. 내일 병원 취소해줘. Matches by title and optional date.",
    input_schema: { type: "object" as const, properties: { title: { type: "string", description: "Part of the appointment title, e.g. 병원, 약국" }, date: { type: "string", description: "YYYY-MM-DD if the user said a day (오늘/내일 → compute)" } }, required: ["title"] },
  },
  {
    name: "set_font_size",
    description: "Change the app's text size. Use when the user says the text is too small/large: 글씨 크게, 더 크게, 작게.",
    input_schema: { type: "object" as const, properties: { level: { type: "string", enum: ["보통", "크게", "아주 크게"] } }, required: ["level"] },
  },
  {
    name: "open_screen",
    description: "Open a screen of the app: reminders (일정 보기), health_wallet (건강수첩), medications (약 알림 목록), safety (안심 연락처), settings (설정). Use when the user asks to see/open one of these.",
    input_schema: { type: "object" as const, properties: { screen: { type: "string", enum: ["reminders", "health_wallet", "medications", "safety", "settings"] } }, required: ["screen"] },
  },
  {
    name: "take_photo",
    description: "Ask the phone to open the camera so the user can show a document, prescription, medicine bottle, insurance card or an old photo. For text messages, emails, letters or notices use read_incoming_text instead.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "compose_text",
    description: "Write an English (or other language) text message / SMS for the user and open the phone's messaging app with it filled in. Use when they ask to send/text/message someone in English, reply to a message, or say 문자 보내줘 / 답장해줘. Pass what they want to say in their own words.",
    input_schema: { type: "object" as const, properties: { to: { type: "string", description: "Recipient as they said it: 딸, 학교 선생님, a name, or a phone number" }, message_intent: { type: "string", description: "What they want to say, in their words (Korean is fine)" } }, required: ["message_intent"] },
  },
  {
    name: "read_incoming_text",
    description: "Open the screen where the user pastes or photographs a text message, email, letter, bill or notice they received, so it is explained in their language. Use IMMEDIATELY when they mention receiving a message/letter/mail/notice/bill (문자 왔어, 편지 왔어, 이거 뭐야) — do NOT ask what it says first.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "repeat_last",
    description: "Read your previous answer aloud again. Use when the user says 다시 말해줘 / 못 들었어 / 뭐라고.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

/* Tools whose effect happens on the phone: the server just records a client action for the app to run. */
const CLIENT_TOOLS = new Set(["open_interpreter", "call_family", "add_family_contact", "add_medication_reminder", "remove_medication_reminder", "set_font_size", "open_screen", "take_photo", "repeat_last", "compose_text", "read_incoming_text"]);

/* ── Tool Execution Functions ── */

// WMO Weather Code → Korean description
const WEATHER_CODES: Record<number, string> = {
  0: "맑음", 1: "대체로 맑음", 2: "구름 조금", 3: "흐림",
  45: "안개", 48: "짙은 안개",
  51: "가벼운 이슬비", 53: "이슬비", 55: "짙은 이슬비",
  61: "가벼운 비", 63: "비", 65: "폭우", 66: "얼어붙는 비", 67: "강한 얼어붙는 비",
  71: "가벼운 눈", 73: "눈", 75: "폭설", 77: "싸락눈",
  80: "소나기", 81: "강한 소나기", 82: "매우 강한 소나기",
  85: "가벼운 눈보라", 86: "눈보라",
  95: "천둥번개", 96: "우박 동반 천둥번개", 99: "강한 우박 천둥번개",
};

async function executeGetWeather(city: string): Promise<string> {
  try {
    // LA Koreatown coordinates (default), can expand later
    const lat = 34.0628;
    const lon = -118.3015;
    const location = city || "LA 코리아타운";

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weathercode,relative_humidity_2m,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
    const res = await fetch(url);
    if (!res.ok) return `Could not fetch weather.`;
    const data = await res.json();
    const c = data.current;
    if (!c) return `No weather data available.`;

    const tempF = Math.round(c.temperature_2m);
    const tempC = Math.round((c.temperature_2m - 32) * 5 / 9);
    const feelsF = Math.round(c.apparent_temperature);
    const feelsC = Math.round((c.apparent_temperature - 32) * 5 / 9);
    const weatherCode = c.weathercode as number;
    const condition = WEATHER_CODES[weatherCode] || "알 수 없음";
    const humidity = c.relative_humidity_2m;
    const windMph = Math.round(c.wind_speed_10m);

    let suggestion = "";
    if (weatherCode >= 51) {
      suggestion = "우산을 챙기세요! 외출 시 조심하세요.";
    } else if (tempF > 85) {
      suggestion = "더운 날이에요. 물 많이 드시고 그늘에서 쉬세요.";
    } else if (tempF < 50) {
      suggestion = "쌀쌀해요. 따뜻하게 입고 나가세요.";
    } else if (tempF >= 65 && tempF <= 80) {
      suggestion = "나들이 하기 좋은 날씨네요!";
    } else {
      suggestion = "건강 조심하세요!";
    }

    return JSON.stringify({
      location,
      temperature_F: tempF,
      temperature_C: tempC,
      feelslike_F: feelsF,
      feelslike_C: feelsC,
      condition,
      humidity_percent: humidity,
      wind_mph: windMph,
      suggestion,
      instruction: `Present naturally: "오늘 ${location} 날씨는 ${condition}이고 ${tempF}°F (${tempC}°C)예요. ${suggestion}"`,
    });
  } catch (err) {
    console.error("[tool:weather]", err);
    return `Weather service unavailable.`;
  }
}

async function executeSearchNews(query: string, language: string = "ko"): Promise<string> {
  try {
    const hlMap: Record<string, string> = { ko: "ko", en: "en-US", es: "es", zh: "zh-CN", vi: "vi", ja: "ja" };
    const hl = hlMap[language] || "en-US";
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=US&ceid=US:en`;
    const res = await fetch(url);
    if (!res.ok) return "Could not fetch news.";
    const xml = await res.text();
    // Parse RSS titles
    const titles: string[] = [];
    const regex = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g;
    let match;
    while ((match = regex.exec(xml)) !== null && titles.length < 4) {
      const title = match[1] || match[2];
      if (title && !title.includes("Google News")) titles.push(title);
    }
    return JSON.stringify({ query, headlines: titles.slice(0, 3) });
  } catch (err) {
    console.error("[tool:news]", err);
    return "News service unavailable.";
  }
}

function localDateString(timezone: string, offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

async function executeSetReminder(date: string, time: string, content: string, elderId: string, timezone: string = "America/Los_Angeles"): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase || elderId === "default") {
    console.error("[tool:reminder] Cannot save - no DB or elderId is default");
    return JSON.stringify({ saved: false, reason: "no valid user" });
  }

  try {
    // Parse date/time into scheduled_at (dates computed in the user's timezone, not server UTC)
    let scheduledAt = "";

    const dateStr = date || "";
    const timeStr = time || "09:00";

    const explicitIso = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    const koreanMd = dateStr.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if (explicitIso) {
      scheduledAt = `${explicitIso[1]}-${explicitIso[2]}-${explicitIso[3]}`;
    } else if (/내일|tomorrow/i.test(dateStr)) {
      scheduledAt = localDateString(timezone, 1);
    } else if (/모레|day after/i.test(dateStr)) {
      scheduledAt = localDateString(timezone, 2);
    } else if (koreanMd) {
      const year = localDateString(timezone).slice(0, 4);
      scheduledAt = `${year}-${koreanMd[1].padStart(2, "0")}-${koreanMd[2].padStart(2, "0")}`;
    } else {
      scheduledAt = localDateString(timezone);
    }

    // Parse time
    let hours = 9, minutes = 0;
    const timeMatch = timeStr.match(/(\d{1,2})\s*[시:]\s*(\d{0,2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    } else {
      const simpleTime = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (simpleTime) {
        hours = parseInt(simpleTime[1]);
        minutes = parseInt(simpleTime[2]);
      }
    }
    if (/오후|pm/i.test(timeStr) && hours < 12) hours += 12;

    const fullScheduledAt = `${scheduledAt}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

    // Determine type from content
    let type = "other";
    if (/병원|진료|doctor|hospital|클리닉/i.test(content)) type = "hospital";
    else if (/약국|pharmacy/i.test(content)) type = "pharmacy";
    else if (/ADHC|데이케어|daycare/i.test(content)) type = "adhc";

    const row = {
      elder_id: elderId,
      title: content,
      type,
      location: "",
      scheduled_at: fullScheduledAt,
      notes: "",
      source: "ello_ai",
      status: "upcoming",
    };

    console.log("[tool:reminder] Inserting to appointments:", JSON.stringify(row));
    const { data, error } = await supabase.from("appointments").insert(row).select();
    if (error) {
      console.error("[tool:reminder] INSERT ERROR:", error.message);
      return JSON.stringify({ saved: false, error: error.message });
    }
    console.log(`[tool:reminder] Saved appointment: id=${data?.[0]?.id}`);
    // TotalMedix 동기화
    if (data?.[0]) syncAppointmentToTotalmedix(data[0], elderId).catch(e => console.error("[appointment-sync] error:", e));
    return JSON.stringify({ saved: true, date: scheduledAt, time: `${hours}:${String(minutes).padStart(2, "0")}`, content });
  } catch (err) {
    console.error("[tool:reminder] Error:", err);
    return JSON.stringify({ saved: false, error: String(err) });
  }
}

async function executeAlertFamily(message: string, urgency: string, elderId: string): Promise<string> {
  console.log(`[tool:alert] EMERGENCY: urgency=${urgency}, message=${message}, elder=${elderId}`);
  const admin = getSupabaseAdmin();
  if (!admin || elderId === "default") {
    return JSON.stringify({ alerted: false, reason: "no valid user", note: "Tell the user to call 911 if it is an emergency." });
  }
  try {
    const { data: loc } = await admin.from("gps_locations").select("lat, lng").eq("user_id", elderId)
      .order("recorded_at", { ascending: false }).limit(1).maybeSingle();

    const { data: sos, error } = await admin.from("sos_events").insert({
      elder_id: elderId, lat: loc?.lat ?? null, lng: loc?.lng ?? null, status: "active",
    }).select().single();
    if (error || !sos) {
      console.error("[tool:alert] sos_events insert failed:", error?.message);
      return JSON.stringify({ alerted: false, error: error?.message });
    }

    const { data: links } = await admin.from("family_links").select("family_id").eq("elder_id", elderId).eq("status", "accepted");
    const familyIds = (links || []).map((l: { family_id: string }) => l.family_id).filter(Boolean);
    if (familyIds.length > 0) {
      await admin.from("sos_notifications").insert(familyIds.map((fid: string) => ({ sos_id: sos.id, family_id: fid, channel: "push", status: "pending" })));
    }
    await admin.from("conversations").insert({ elder_id: elderId, role: "assistant", content: `[SOS ${urgency}] ${message}` });

    return JSON.stringify({
      alerted: true, sosId: sos.id, familyNotified: familyIds.length, message, urgency: urgency || "medium",
      note: familyIds.length > 0 ? "Family has been alerted in the app." : "No family is linked yet. Advise calling 911 if urgent.",
    });
  } catch (e) {
    console.error("[tool:alert] error:", e);
    return JSON.stringify({ alerted: false, error: String(e) });
  }
}

// Trusted places in LA Koreatown — direct recommendations
interface Place { name: string; address: string; phone: string; note: string; }

const KNOWN_PLACES: Record<string, Place[]> = {
  hospital: [
    { name: "한미 메디컬 클리닉", address: "3727 W 6th St, Los Angeles", phone: "(213) 386-5500", note: "한인타운 대표 종합 클리닉" },
    { name: "갈보리 의원", address: "3255 Wilshire Blvd, Los Angeles", phone: "(213) 382-5700", note: "내과 전문" },
    { name: "고려 메디칼", address: "4161 Wilshire Blvd, Los Angeles", phone: "(213) 383-0080", note: "가정의학과" },
  ],
  pharmacy: [
    { name: "아리랑 약국", address: "3500 W 6th St, Los Angeles", phone: "(213) 385-0300", note: "한국어 상담 가능" },
    { name: "한미 약국", address: "3680 Wilshire Blvd, Los Angeles", phone: "(213) 383-1234", note: "처방전 조제" },
  ],
  restaurant: [
    { name: "선지해장국", address: "3803 W 6th St, Los Angeles", phone: "(213) 388-3042", note: "해장국 전문, 24시간" },
    { name: "북창동순두부", address: "3583 Wilshire Blvd, Los Angeles", phone: "(213) 382-1299", note: "순두부찌개 맛집" },
    { name: "오복갈비", address: "3585 Wilshire Blvd, Los Angeles", phone: "(213) 381-1520", note: "갈비 전문점" },
    { name: "청기와타운", address: "3827 W 6th St, Los Angeles", phone: "(213) 380-3848", note: "한정식 코스요리" },
    { name: "대성집", address: "4015 W Olympic Blvd, Los Angeles", phone: "(323) 936-1552", note: "감자탕 전문" },
  ],
  grocery: [
    { name: "H-Mart Koreatown", address: "3450 W 6th St, Los Angeles", phone: "(213) 365-5999", note: "대형 한인 마트" },
    { name: "갤러리아 마켓", address: "3250 W Olympic Blvd, Los Angeles", phone: "(323) 733-3400", note: "신선식품, 반찬" },
  ],
};

function matchCategory(query: string): string | null {
  const q = query.toLowerCase();
  if (/병원|hospital|clinic|의원|doctor|의사|아파|진료/.test(q)) return "hospital";
  if (/약국|pharmacy|drugstore|약/.test(q)) return "pharmacy";
  if (/식당|restaurant|밥|음식|맛집|해장|고기|갈비|찌개|한식|korean food|eat|lunch|dinner|점심|저녁/.test(q)) return "restaurant";
  if (/마트|grocery|market|장보|슈퍼|식료품/.test(q)) return "grocery";
  return null;
}

async function executeFindNearby(query: string): Promise<string> {
  const category = matchCategory(query);
  const allPlaces = category ? (KNOWN_PLACES[category] || []) : [];

  // Return top 3 recommendations
  const recommended = allPlaces.slice(0, 3);

  if (recommended.length === 0) {
    // If no category match, try to find anything relevant
    const allCategories = Object.values(KNOWN_PLACES).flat();
    const fuzzy = allCategories.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.note.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);

    return JSON.stringify({
      query,
      found: fuzzy.length > 0,
      places: fuzzy,
      instruction: "Present these as personal recommendations. Say something like 'I know a good place!' Give the name, address, and phone number directly. Do NOT tell the user to search online.",
    });
  }

  return JSON.stringify({
    query,
    found: true,
    places: recommended,
    instruction: "Present these as personal recommendations you know well. Give the name, address, and phone number directly for each place. Add the note as a brief description. Sound like a helpful granddaughter who knows the neighborhood. Do NOT suggest searching online or Google.",
  });
}

async function executeSaveMemory(elderId: string, category: string, key: string, value: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return JSON.stringify({ saved: false, error: "DB not configured" });

  const { error } = await supabase.from("memories").upsert(
    { user_id: elderId, date: category, time: key, content: value },
    { onConflict: "user_id,time" }
  ).select();

  if (error) {
    // If upsert fails (no unique constraint), try insert
    const { error: insertErr } = await supabase.from("memories").insert({
      user_id: elderId, date: category, time: key, content: value,
    });
    if (insertErr) {
      console.error("[tool:save_memory] Error:", insertErr.message);
      return JSON.stringify({ saved: false, error: insertErr.message });
    }
  }

  console.log(`[tool:save_memory] Saved: ${category}/${key} = ${value} for ${elderId}`);
  return JSON.stringify({ saved: true, category, key, value });
}

async function executeGetMemories(elderId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return JSON.stringify({ memories: [] });

  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("user_id", elderId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[tool:get_memories] Error:", error.message);
    return JSON.stringify({ memories: [] });
  }

  const memories = (data || []).map((m: Record<string, unknown>) => ({
    category: m.date,
    key: m.time,
    value: m.content,
  }));

  console.log(`[tool:get_memories] Found ${memories.length} memories for ${elderId}`);
  return JSON.stringify({
    memories,
    instruction: "Use these memories to personalize your conversation. Reference them naturally — don't list them. For example, if you see a family member's name, ask how they're doing.",
  });
}

async function executeGetAppointments(elderId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return JSON.stringify({ appointments: [], error: "DB not configured" });

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("elder_id", elderId)
    .order("scheduled_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("[tool:get_appointments] Error:", error.message);
    return JSON.stringify({ appointments: [], error: error.message });
  }

  const appointments = (data || []).map((a: Record<string, unknown>) => ({
    title: a.title,
    type: a.type,
    location: a.location,
    scheduled_at: a.scheduled_at,
    notes: a.notes,
  }));

  console.log(`[tool:get_appointments] Found ${appointments.length} for elder=${elderId}`);
  return JSON.stringify({
    appointments,
    instruction: "Present these appointments naturally in the user's language. For each one mention the title, date/time, and location. Be warm and helpful.",
  });
}

async function executeTool(name: string, input: Record<string, string>, defaultCity: string, elderId: string, timezone: string = "America/Los_Angeles"): Promise<string> {
  switch (name) {
    case "get_weather":
      return executeGetWeather(input.city || defaultCity);
    case "search_news":
      return executeSearchNews(input.query || "news", input.language);
    case "set_reminder":
      return executeSetReminder(input.date, input.time || "", input.content, elderId, timezone);
    case "alert_family":
      return executeAlertFamily(input.message, input.urgency || "medium", elderId);
    case "find_nearby":
      return executeFindNearby(input.query);
    case "get_appointments":
      return executeGetAppointments(input.elder_id || elderId);
    case "save_memory":
      return executeSaveMemory(elderId, input.category || "other", input.key, input.value);
    case "get_memories":
      return executeGetMemories(input.elder_id || elderId);
    case "cancel_appointment":
      return executeCancelAppointment(elderId, input.title, input.date, timezone);
    case "add_medication_reminder":
      return executeAddMedication(elderId, input.name, (input as unknown as { times?: string[] }).times || []);
    case "remove_medication_reminder":
      return executeRemoveMedication(elderId, input.name);
    default:
      if (CLIENT_TOOLS.has(name)) {
        // Executed by the phone after the reply. Tell the model it is done so it can confirm naturally.
        return JSON.stringify({ ok: true, clientAction: { type: name, ...input }, note: "The app will do this right away. Confirm to the user in one short sentence." });
      }
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

const HHMM = /^\d{2}:\d{2}$/;
async function executeAddMedication(elderId: string, rawName: string, rawTimes: string[]): Promise<string> {
  const name = String(rawName || "").trim();
  const times = Array.from(new Set((rawTimes || []).map(String).filter(t => HHMM.test(t)))).sort();
  const action = { clientAction: { type: "add_medication_reminder", name, times } };
  if (!name || times.length === 0) return JSON.stringify({ saved: false, reason: "name and HH:MM times required" });
  const supabase = getSupabaseAdmin();
  if (!supabase || elderId === "default") return JSON.stringify({ saved: false, ...action });
  const { data: rows } = await supabase.from("health_medications").select("id, name, times").eq("user_id", elderId).eq("is_active", true);
  const same = (rows || []).find((r: { name: string }) => r.name.trim().toLowerCase() === name.toLowerCase());
  if (same) {
    const merged = Array.from(new Set([...(same.times || []), ...times])).sort();
    const { error } = await supabase.from("health_medications").update({ times: merged, reminder_enabled: true }).eq("id", same.id);
    return JSON.stringify({ saved: !error, name, times: merged, note: "Saved to the health wallet; the phone will ring at these times. Confirm in one short sentence.", ...action });
  }
  const { error } = await supabase.from("health_medications").insert({ user_id: elderId, name, times, reminder_enabled: true, frequency: `하루 ${times.length}번` });
  return JSON.stringify({ saved: !error, name, times, note: "Saved to the health wallet; the phone will ring at these times. Confirm in one short sentence.", ...action });
}

async function executeRemoveMedication(elderId: string, rawName: string): Promise<string> {
  const name = String(rawName || "").trim();
  const action = { clientAction: { type: "remove_medication_reminder", name } };
  if (!name) return JSON.stringify({ removed: 0 });
  const supabase = getSupabaseAdmin();
  if (!supabase || elderId === "default") return JSON.stringify({ removed: 0, ...action });
  const { data: rows } = await supabase.from("health_medications").select("id, name, dosage, purpose").eq("user_id", elderId).eq("is_active", true);
  const n = name.toLowerCase();
  const hits = (rows || []).filter((r: { name: string }) => { const rn = r.name.toLowerCase(); return rn.includes(n) || n.includes(rn); });
  if (hits.length === 0) return JSON.stringify({ removed: 0, reason: "no reminder with that name", hint: "Tell the user which reminders exist (see MEDICATION REMINDERS)." });
  let removed = 0;
  for (const h of hits as { id: string; dosage?: string; purpose?: string }[]) {
    // keep wallet details if there are any; otherwise drop the row
    const r = h.dosage || h.purpose
      ? await supabase.from("health_medications").update({ times: [], reminder_enabled: false }).eq("id", h.id)
      : await supabase.from("health_medications").delete().eq("id", h.id);
    if (!r.error) removed++;
  }
  return JSON.stringify({ removed, names: hits.map((h: { name: string }) => h.name), ...action });
}

async function executeCancelAppointment(elderId: string, title: string, date: string | undefined, timezone: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (!supabase || elderId === "default") return JSON.stringify({ cancelled: false, reason: "no valid user" });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  let q = supabase.from("appointments").select("id, title, scheduled_at").eq("elder_id", elderId).eq("status", "upcoming").gte("scheduled_at", today).order("scheduled_at", { ascending: true });
  if (title) q = q.ilike("title", `%${title}%`);
  const { data } = await q.limit(10);
  let rows = (data || []) as { id: string; title: string; scheduled_at: string }[];
  if (date) rows = rows.filter(r => r.scheduled_at.startsWith(date));
  if (rows.length === 0) return JSON.stringify({ cancelled: false, reason: "no matching upcoming appointment", hint: "Ask which one; list upcoming with get_appointments." });
  if (rows.length > 1 && !date) return JSON.stringify({ cancelled: false, reason: "multiple matches", candidates: rows.map(r => ({ title: r.title, when: r.scheduled_at })), hint: "Ask the user which date." });
  const target = rows[0];
  const { error } = await supabase.from("appointments").delete().eq("id", target.id);
  if (error) return JSON.stringify({ cancelled: false, error: error.message });
  return JSON.stringify({ cancelled: true, title: target.title, when: target.scheduled_at });
}

/* ── Appointment Parser ── */
interface ParsedAppointment {
  title: string;
  type: string;
  location: string;
  scheduled_at: string;
  notes: string;
}

function parseAppointments(text: string): { cleanText: string; appointments: ParsedAppointment[] } {
  const appointments: ParsedAppointment[] = [];
  const regex = /\[APPOINTMENT\]([\s\S]*?)\[\/APPOINTMENT\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.title) appointments.push(parsed);
    } catch {
      console.error("[appointment] Failed to parse:", match[1]);
    }
  }
  const cleanText = text.replace(/\[APPOINTMENT\][\s\S]*?\[\/APPOINTMENT\]/g, "").trim();
  return { cleanText, appointments };
}

// Normalize scheduled_at: fix Korean time expressions and ensure LA timezone
async function saveAppointments(appointments: ParsedAppointment[], elderId: string): Promise<boolean> {
  if (elderId === "default") {
    console.error("[appointment] elder_id is default - skipping save");
    return false;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[appointment] Supabase admin client is null!");
    return false;
  }
  if (appointments.length === 0) return false;

  let saved = false;
  for (const apt of appointments) {
    // Trust AI's scheduled_at as-is — no timezone conversion
    const rawTime = apt.scheduled_at || new Date().toISOString().replace("Z", "");
    // Strip trailing Z or timezone offset to prevent DB from converting
    const cleanTime = rawTime.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
    console.log("[time-debug] raw from AI:", apt.scheduled_at, "→ storing:", cleanTime);
    const row = {
      elder_id: elderId,
      title: apt.title,
      type: ["hospital", "adhc", "pharmacy", "other"].includes(apt.type) ? apt.type : "other",
      location: apt.location || "",
      scheduled_at: cleanTime,
      notes: apt.notes || "",
      source: "ello_ai",
      status: "upcoming",
    };
    console.log("[appointment] insert attempt:", JSON.stringify(row));
    const { data, error } = await supabase.from("appointments").insert(row).select();
    console.log("[appointment] insert result:", JSON.stringify({ data: data?.length ? data[0] : null, error: error ? { message: error.message, code: error.code } : null }));
    if (error) {
      console.error("[appointment] INSERT ERROR:", JSON.stringify(error));
      console.error("[appointment] error.message:", error.message);
      console.error("[appointment] error.code:", error.code);
      console.error("[appointment] error.details:", error.details);
      console.error("[appointment] error.hint:", error.hint);
    } else if (data && data.length > 0) {
      console.log(`[appointment] DB 저장 성공: id=${data[0].id}, title=${apt.title}`);
      saved = true;
      // TotalMedix 동기화 (비동기)
      syncAppointmentToTotalmedix(data[0], elderId).catch(e => console.error("[appointment-sync] error:", e));
    } else {
      console.error("[appointment] INSERT returned no data and no error - RLS might be blocking");
    }
  }
  return saved;
}

/* ── Sync appointment to TotalMedix ── */
async function syncAppointmentToTotalmedix(appointment: Record<string, unknown>, elderId: string) {
  const tm = getTotalmedixAdmin();
  if (!tm) { console.log("[appointment-sync] TotalMedix client not configured"); return; }

  // participant_ello_link에서 participant_id 찾기
  const { data: link } = await tm
    .from("participant_ello_link")
    .select("participant_id")
    .eq("ello_user_id", elderId)
    .eq("status", "active")
    .single();

  if (!link) { console.log("[appointment-sync] No TotalMedix link for", elderId); return; }

  const { error } = await tm.from("ello_appointments").upsert({
    participant_id: link.participant_id,
    ello_user_id: elderId,
    ello_appointment_id: appointment.id,
    title: appointment.title,
    type: appointment.type,
    location: appointment.location,
    scheduled_at: appointment.scheduled_at,
    notes: appointment.notes,
    source: appointment.source,
    status: appointment.status,
  }, { onConflict: "ello_appointment_id" });

  if (error) {
    console.error("[appointment-sync] TotalMedix insert error:", error.message);
  } else {
    console.log(`[appointment-sync] Synced to TotalMedix: participant=${link.participant_id}, title=${appointment.title}`);
  }
}

/* ── Happiness Ticket Grant (direct DB, no self-fetch) ── */
async function grantTicket(elderId: string, type: string, timezone: string, moodScore?: number): Promise<{ granted: number; reason: string; total?: number }> {
  if (elderId === "default") return { granted: 0, reason: "userId-default" };
  const admin = getSupabaseAdmin();
  if (!admin) { console.error("[ticket] No DB client"); return { granted: 0, reason: "no-db-client" }; }

  try {
    const today = todayLocal(timezone);

    // garden_status 가져오기 (없으면 생성)
    let { data: garden } = await admin
      .from("garden_status").select("*").eq("elder_id", elderId).single();
    if (!garden) {
      const { data: ng } = await admin
        .from("garden_status").insert({ elder_id: elderId }).select().single();
      garden = ng;
    }
    if (!garden) { console.error("[ticket] Failed to get garden"); return { granted: 0, reason: "no-garden" }; }

    // 오늘 티켓 레코드 가져오기 (없으면 생성)
    let { data: ticket } = await admin
      .from("happiness_tickets").select("*").eq("elder_id", elderId).eq("date", today).single();
    if (!ticket) {
      const { data: nt } = await admin
        .from("happiness_tickets").insert({ elder_id: elderId, date: today }).select().single();
      ticket = nt;
    }
    if (!ticket) { console.error("[ticket] Failed to get ticket"); return { granted: 0, reason: "no-ticket" }; }

    let ticketsAdded = 0;

    if (type === "chat" && !ticket.daily_chat) {
      ticket.daily_chat = true;
      ticketsAdded += 1;

      // 연속 기록 계산 (사용자 로컬 타임존 기준)
      const yesterdayStr = todayLocal(timezone, -1);

      let newStreak = 1;
      if (garden.last_chat_date === yesterdayStr) {
        newStreak = garden.streak_days + 1;
      } else if (garden.last_chat_date === today) {
        newStreak = garden.streak_days;
      }

      if (newStreak > 0 && newStreak % 7 === 0) {
        ticket.streak_bonus += 3;
        ticketsAdded += 3;
      }

      await admin.from("garden_status").update({
        streak_days: newStreak, last_chat_date: today, updated_at: new Date().toISOString(),
      }).eq("elder_id", elderId);

      garden.streak_days = newStreak;
    }

    if (type === "mood" && moodScore && moodScore >= 7 && !ticket.mood_bonus) {
      ticket.mood_bonus = true;
      ticketsAdded += 1;
    }

    if (type === "appointment") {
      ticket.appointment_bonus += 1;
      ticketsAdded += 1;
    }

    if (ticketsAdded > 0) {
      ticket.total_today = (ticket.daily_chat ? 1 : 0) + (ticket.mood_bonus ? 1 : 0) + ticket.streak_bonus + ticket.appointment_bonus;

      await admin.from("happiness_tickets").update({
        daily_chat: ticket.daily_chat, mood_bonus: ticket.mood_bonus,
        streak_bonus: ticket.streak_bonus, appointment_bonus: ticket.appointment_bonus,
        total_today: ticket.total_today,
      }).eq("id", ticket.id);

      // Re-read garden_status fresh to avoid race conditions with concurrent requests
      const { data: freshGarden } = await admin
        .from("garden_status").select("total_tickets").eq("elder_id", elderId).single();
      const fg = freshGarden as { total_tickets: number } | null;
      const baseTotal = fg?.total_tickets ?? garden.total_tickets ?? 0;
      const newTotal = baseTotal + ticketsAdded;
      const stageCalc = newTotal >= 60 ? 5 : newTotal >= 40 ? 4 : newTotal >= 25 ? 3 : newTotal >= 10 ? 2 : 1;
      await admin.from("garden_status").update({
        total_tickets: newTotal, current_stage: stageCalc, updated_at: new Date().toISOString(),
      }).eq("elder_id", elderId);

      console.log(`[ticket] ${type} granted: +${ticketsAdded}, total=${newTotal}, stage=${stageCalc} (elder=${elderId}, date=${today})`);
      return { granted: ticketsAdded, reason: `granted-${type}`, total: newTotal };
    } else {
      console.log(`[ticket] ${type}: no new tickets (already granted today) elder=${elderId} date=${today} daily_chat=${ticket.daily_chat}`);
      return { granted: 0, reason: `already-granted-today-${type}` };
    }
  } catch (e) {
    console.error("[ticket] grant failed:", e);
    return { granted: 0, reason: "exception" };
  }
}

/* ── Mood Sync to TotalMedix (direct, no self-fetch) ── */
async function triggerMoodSync(elderId: string, timezone: string) {
  if (elderId === "default") return;
  const elloDb = getSupabaseAdmin();
  const tm = getTotalmedixAdmin();
  if (!elloDb || !tm) { console.log("[mood-sync] DB clients not available"); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.log("[mood-sync] No API key"); return; }

  // 1. 오늘 대화 가져오기 (사용자 로컬 타임존 기준)
  const today = todayLocal(timezone);
  const { data: conversations } = await elloDb
    .from("conversations")
    .select("role, content, created_at")
    .eq("elder_id", elderId)
    .gte("created_at", today + "T00:00:00")
    .order("created_at", { ascending: true });

  if (!conversations || conversations.length === 0) { console.log("[mood-sync] 오늘 대화 없음"); return; }

  // 2. Claude 감정 분석
  const chatLog = conversations.map(c => `${c.role}: ${c.content}`).join("\n");
  const analysisRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: `다음 대화의 감정을 분석해. JSON만 응답:\n{"mood_score":(1-10),"alert_level":"normal|caution|urgent","topics":["주제"],"summary":"한줄요약"}\n\n${chatLog}` }],
    }),
  });

  if (!analysisRes.ok) { console.error("[mood-sync] Claude API failed:", analysisRes.status); return; }
  const analysisData = await analysisRes.json();
  const responseText = analysisData.content?.[0]?.text || "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) { console.error("[mood-sync] JSON parse failed"); return; }
  const moodData = JSON.parse(jsonMatch[0]);

  // 3. participant_id 찾기
  const { data: link } = await tm
    .from("participant_ello_link")
    .select("participant_id")
    .eq("ello_user_id", elderId)
    .eq("status", "active")
    .single();

  if (!link) { console.log("[mood-sync] No TotalMedix link for", elderId); return; }

  // 4. ello_mood_summary에 저장
  const { error } = await tm.from("ello_mood_summary").upsert({
    ello_user_id: elderId,
    participant_id: link.participant_id,
    date: today,
    mood_score: moodData.mood_score,
    topics: moodData.topics,
    alert_level: moodData.alert_level,
    summary: moodData.summary,
    conversation_count: conversations.filter(c => c.role === "user").length,
  }, { onConflict: "ello_user_id,date" });

  if (error) {
    console.error("[mood-sync] Save error:", error.message);
  } else {
    console.log(`[mood-sync] Synced: participant=${link.participant_id}, mood=${moodData.mood_score}, alert=${moodData.alert_level}`);
    // 기분 보너스 티켓 (7점 이상)
    if (moodData.mood_score >= 7) {
      grantTicket(elderId, "mood", timezone, moodData.mood_score).catch(e => console.error("[ticket-mood] error:", e));
    }
  }
}

/* ── Save conversation to DB ── */
async function saveConversation(eId: string, role: string, content: string) {
  if (eId === "default" || !content) return;
  const db = getSupabaseAdmin();
  if (!db) return;
  const { error } = await db.from("conversations").insert({ elder_id: eId, role, content });
  if (error) console.error("[conversations] Save error:", error.message);
}

/* ── Types ── */
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
  image?: { base64: string; mediaType: string };
}

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function cleanBase64(raw: string): string {
  const idx = raw.indexOf(",");
  if (idx !== -1 && raw.substring(0, idx).includes("base64")) return raw.substring(idx + 1);
  return raw.replace(/\s/g, "");
}

/* ── Interpreter Mode Handler ── */
const LANG_NAMES: Record<string, { native: string; korean: string; speechCode: string }> = {
  en: { native: "English", korean: "영어", speechCode: "en-US" },
  es: { native: "Español", korean: "스페인어", speechCode: "es-ES" },
  zh: { native: "中文", korean: "중국어", speechCode: "zh-CN" },
  vi: { native: "Tiếng Việt", korean: "베트남어", speechCode: "vi-VN" },
  ja: { native: "日本語", korean: "일본어", speechCode: "ja-JP" },
  ko: { native: "한국어", korean: "한국어", speechCode: "ko-KR" },
};

interface InterpreterBody {
  interpreterMode: true;
  messages: { role: string; content: string }[];
  targetLang: string;
  speakerRole: string;
  userLang?: string;
  history?: { speaker: string; original: string; translated: string }[];
}

async function handleInterpreter(body: InterpreterBody, apiKey: string) {
  const targetLang = body.targetLang || "en";
  const speakerRole = body.speakerRole || "user";
  const userLang = body.userLang || "ko";
  const targetInfo = LANG_NAMES[targetLang] || LANG_NAMES.en;
  const userInfo = LANG_NAMES[userLang] || LANG_NAMES.ko;
  const history = body.history || [];
  const lastMsg = body.messages?.[body.messages.length - 1]?.content || "";

  console.log(`[interpret] speaker=${speakerRole}, targetLang=${targetLang}, msg=${lastMsg.slice(0, 80)}`);

  const historyText = history.length > 0
    ? "\n\nConversation so far:\n" + history.map(h =>
        `${h.speaker === "user" ? "User" : "Other"}: ${h.original} -> ${h.translated}`
      ).join("\n")
    : "";

  let systemPrompt: string;

  if (speakerRole === "user") {
    systemPrompt = `You are a professional real-time interpreter helping an elderly ${userInfo.native}-speaking person communicate with a ${targetInfo.native}-speaking person.

RULES:
1. Translate the user message into natural, conversational ${targetInfo.native}.
2. Do NOT translate word-for-word. Make it sound natural.
3. Keep medical/technical terms accurate.
4. Also provide a brief ${userInfo.native} confirmation so the user knows what you said.

RESPONSE FORMAT (JSON only, no markdown):
{"forOther": "natural ${targetInfo.native} translation", "forUser": "brief ${userInfo.native} confirmation (1 sentence)", "exit": false}

If user says exit words like done/stop -> set exit: true and summarize in ${userInfo.native}.${historyText}`;
  } else {
    systemPrompt = `You are a professional real-time interpreter. Translate the ${targetInfo.native} message into simple, warm ${userInfo.native} for an elderly person.

RULES:
1. Use simple, easy-to-understand ${userInfo.native}.
2. Avoid difficult words or jargon.
3. Make questions clearly sound like questions.

RESPONSE FORMAT (JSON only, no markdown):
{"forUser": "natural ${userInfo.native} translation", "forOther": "", "exit": false}${historyText}`;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: lastMsg }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[interpret] API error:", err);
      return NextResponse.json({ error: "Interpreter API failed" }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error("[interpret] No JSON in response:", text);
      return NextResponse.json({
        interpreterMode: true,
        forOther: speakerRole === "user" ? text : "",
        forUser: speakerRole === "other" ? text : "",
        exit: false,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[interpret] forOther=${(parsed.forOther || "").slice(0, 60)}, forUser=${(parsed.forUser || "").slice(0, 60)}, exit=${parsed.exit}`);

    return NextResponse.json({
      interpreterMode: true,
      forOther: parsed.forOther || "",
      forUser: parsed.forUser || "",
      exit: parsed.exit || false,
      targetLang,
      speakerRole,
    });
  } catch (e) {
    console.error("[interpret] Error:", e);
    return NextResponse.json({ error: "Interpreter error" }, { status: 500 });
  }
}


/* ── Main Handler ── */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  console.log('[chat] API ROUTE CALLED');
  console.log('[init] supabaseAdmin URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30));
  console.log('[init] service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[init] service key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();

    /* ── INTERPRETER MODE ── */
    if (body.interpreterMode) {
      return handleInterpreter(body, apiKey);
    }

    const messages: IncomingMessage[] = body.messages;
    const isGreeting: boolean = !!body.greetingMode;
    const personaId: string = body.persona || "assistant";
    const langPrompt: string = body.langPrompt || "You MUST respond ONLY in Korean.";
    const charName: string = body.charName || "엘로";
    const userCity: string = body.userCity || "Los Angeles";
    // What is on the phone right now (contacts / medication reminders / font size) so the assistant can act on it.
    const cc = body.clientContext || {};
    const contactsList: string = Array.isArray(cc.contacts) && cc.contacts.length
      ? cc.contacts.map((c: { name: string; relation?: string }) => `${c.relation ? c.relation + " " : ""}${c.name}`).join(", ")
      : "(none saved yet)";
    let medsList: string = Array.isArray(cc.medications) && cc.medications.length
      ? cc.medications.map((m: { name: string; times: string[] }) => `${m.name} at ${(m.times || []).join(", ")}`).join("; ")
      : "(no medication reminders set)";
    const fontLevel: string = cc.fontSize || "보통";

    const personaPrompt = PERSONA_PROMPTS[personaId] || PERSONA_PROMPTS.assistant;
    const timezone: string = body.timezone || "America/Los_Angeles";

    // Use user's device timezone for correct date
    const now = new Date();
    const laOptions: Intl.DateTimeFormatOptions = { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" };
    const laParts = new Intl.DateTimeFormat("en-CA", laOptions).format(now); // YYYY-MM-DD format
    const laFull = new Intl.DateTimeFormat("ko-KR", { timeZone: timezone, year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now);
    const localTime = new Intl.DateTimeFormat("ko-KR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: true }).format(now);
    console.log(`[chat] timezone: ${timezone}, local date: ${laParts}, local time: ${localTime}`);

    // Load saved memories for this elder
    let memorySummary = "";
    // elderId: verified from the Supabase session (cookie / bearer). body.userId is only honored
    // when the caller is allowed to act for that elder (self, accepted family, admin).
    const caller = await getCaller(req);
    if (!caller) {
      return NextResponse.json({ error: "로그인이 필요합니다.", code: "unauthenticated" }, { status: 401 });
    }
    let elderId: string = caller.id;
    if (body.userId && body.userId !== "default" && body.userId !== caller.id) {
      if (await canAccessElder(caller, body.userId)) elderId = body.userId;
      else return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    console.log(`[chat] Final elderId: ${elderId}`);
    const adminDb = getSupabaseAdmin();
    if (elderId !== "default" && adminDb) {
      const { data: mems } = await adminDb
        .from("memories")
        .select("date, time, content")
        .eq("user_id", elderId)
        .order("created_at", { ascending: false })
        .limit(15);
      if (mems && mems.length > 0) {
        memorySummary = mems.map((m: { date: string; time: string; content: string }) =>
          `${m.date}/${m.time}: ${m.content}`
        ).join("\n");
        console.log(`[chat] Loaded ${mems.length} memories for ${elderId}`);
      }
    }

    // ── Load Health Wallet data for context ──
    let healthContext = "";
    if (elderId !== "default" && adminDb) {
      try {
        const [meds, allergies, diagnoses, doctors, insurance, emergency] = await Promise.all([
          adminDb.from("health_medications").select("name, dosage, frequency, purpose, times, reminder_enabled").eq("user_id", elderId).eq("is_active", true),
          adminDb.from("health_allergies").select("allergen, type, severity").eq("user_id", elderId),
          adminDb.from("health_diagnoses").select("name, icd_code").eq("user_id", elderId).eq("is_active", true),
          adminDb.from("health_doctors").select("name, specialty, phone, is_pcp").eq("user_id", elderId),
          adminDb.from("health_insurance_cards").select("carrier, member_id, plan_name").eq("user_id", elderId),
          adminDb.from("health_emergency_contacts").select("name, relationship, phone").eq("user_id", elderId),
        ]);
        const parts: string[] = [];
        if (meds.data?.length) parts.push("Medications: " + meds.data.map((m: Record<string, string>) => `${m.name} ${m.dosage || ""} (${m.frequency || ""}${m.purpose ? ", " + m.purpose : ""})`).join("; "));
        const remindersFromDb = (meds.data || []).filter((m: { times?: string[]; reminder_enabled?: boolean }) => Array.isArray(m.times) && m.times.length && m.reminder_enabled !== false)
          .map((m: { name: string; times: string[] }) => `${m.name} at ${m.times.join(", ")}`);
        if (remindersFromDb.length) medsList = remindersFromDb.join("; ");
        if (allergies.data?.length) parts.push("Allergies: " + allergies.data.map((a: Record<string, string>) => `${a.allergen} (${a.severity})`).join(", "));
        if (diagnoses.data?.length) parts.push("Diagnoses: " + diagnoses.data.map((d: Record<string, string>) => d.name).join(", "));
        if (doctors.data?.length) parts.push("Doctors: " + doctors.data.map((d: Record<string, string | boolean>) => `${d.name} (${d.specialty}${d.is_pcp ? ", PCP" : ""}) ${d.phone || ""}`).join("; "));
        if (insurance.data?.length) parts.push("Insurance: " + insurance.data.map((i: Record<string, string>) => `${i.carrier} Member#${i.member_id}`).join("; "));
        if (emergency.data?.length) parts.push("Emergency Contacts: " + emergency.data.map((e: Record<string, string>) => `${e.name} (${e.relationship}) ${e.phone}`).join("; "));
        if (parts.length) {
          healthContext = parts.join("\n");
          console.log(`[chat] Loaded health wallet data for ${elderId}`);
        }
      } catch (e) {
        console.warn("[chat] health wallet load failed:", e);
      }
    }

    const systemPrompt = `🚨 ABSOLUTE TIME AUTHORITY (HIGHEST PRIORITY — OVERRIDES ALL PRIOR CONVERSATION):
The current real-world time RIGHT NOW is:
  📅 Date: ${laParts} (${laFull})
  🕐 Time: ${localTime}
  🌎 Timezone: ${timezone}

When the user asks "지금 몇 시야?" / "what time is it?" / "오늘 날짜?" etc., you MUST use the values above. DO NOT use times mentioned in previous conversation history — those are OUTDATED. The ONLY correct current time is ${localTime} on ${laParts}. If any earlier message in this conversation mentioned a different time, IGNORE IT COMPLETELY.

CRITICAL INSTRUCTION — LANGUAGE:
${langPrompt}
Your name is ${charName}. You must ALWAYS respond in the language specified above.

DATE/TIME REFERENCES:
- "오늘" / "today" = ${laParts}
- "내일" / "tomorrow" = the day after ${laParts}
- "모레" = two days after ${laParts}
- "다음주" = one week after ${laParts}
When generating scheduled_at, you MUST output the date in the user's LOCAL time. NEVER convert to UTC. NEVER guess. Format: YYYY-MM-DDTHH:MM:SS (no Z suffix, no timezone offset).

${BASE_RULES}

Your personality: ${personaPrompt}

The user is located in: ${userCity}. When they ask about weather or nearby places without specifying a location, use "${userCity}" as the default city. Always use Fahrenheit (°F) for temperature.

The user's ID is: ${elderId}. When using get_appointments or get_memories tools, pass this as elder_id.

WHAT IS ON THE USER'S PHONE RIGHT NOW:
- Saved family contacts: ${contactsList}
- Medication reminders: ${medsList}
- Text size: ${fontLevel}

YOU OPERATE THE APP. The user should never need to find a button — when they ask for any of these, call the tool and confirm in one sentence:
- 통역 / talk to a doctor or clerk in English etc. → open_interpreter
- 전화해줘 / 연락해줘 → call_family (only saved contacts; if none, offer to save one and ask for the number)
- "딸 번호 저장해" + digits → add_family_contact (repeat the number back)
- "혈압약 아침 8시" → add_medication_reminder; "약 알림 지워" → remove_medication_reminder
- "병원 취소" → cancel_appointment (ask which one if several)
- 글씨 크게/작게 → set_font_size
- 일정 보여줘 / 건강수첩 / 약 목록 / 연락처 / 설정 → open_screen
- 문자 보내줘 / 영어로 답장해줘 / "딸 학교에 내일 못 간다고 해줘" → compose_text (you write the English; the phone opens the messaging app pre-filled — the user only taps send)
- 문자 왔어 / 편지 왔어 / 메일 왔어 / 고지서 / "이거 뭐라는 거야" → read_incoming_text IMMEDIATELY. NEVER ask "무슨 내용이에요?" — they cannot read it, that is why they are asking. Say only: "문자 화면을 열게요. 붙여넣거나 사진 찍어주세요."
- 사진 봐줘 / 처방전 읽어줘 / 이 약 뭐야 → take_photo
- 다시 말해줘 / 못 들었어 → repeat_last
- 뭐 할 수 있어? → explain, in 2 sentences, that you keep their schedule and medicines, call family, interpret, read photos, and remember what they tell you.
- "약 언제 먹지?" → answer from the medication reminders above and the health context; never invent.

${memorySummary ? `WHAT YOU KNOW ABOUT THIS USER (from previous conversations):
${memorySummary}
Use this information naturally in conversation. Reference their family, health, hobbies warmly. Don't list what you know — weave it into conversation naturally.` : "You don't have saved memories for this user yet. Use save_memory tool when they share personal details."}

AUTO-SAVE IMPORTANT INFO: When the user mentions any of these, use save_memory tool immediately:
- Family members (names, relationships): category="family"
- Health conditions, medications, symptoms: category="health"
- Hobbies, interests, daily activities: category="hobby"
- Favorite foods, restaurants: category="food"
- Where they live, places they go: category="location"
- Church, faith-related details: category="religion"
Do NOT ask permission to save. Just save silently and continue the conversation naturally.

When using tools, always present the results naturally in your designated language. Don't show raw data — summarize it warmly.

${healthContext ? `HEALTH WALLET (user's private health data — use when they ask about medications, doctors, insurance, allergies, etc.):
${healthContext}
When answering health questions, use this data naturally. For example if asked "내 약 뭐야?" list their medications warmly. Only share what is relevant to the question.` : ""}`;

    console.log(`[chat] name=${charName}, persona=${personaId}, msgs=${messages.length}`);

    // Build API messages — use `any` for content since tool_use/tool_result blocks have varied shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiMessages: { role: string; content: any }[] = messages.map((m) => {
      if (m.image) {
        const b64 = cleanBase64(m.image.base64);
        const mt = VALID_IMAGE_TYPES.includes(m.image.mediaType) ? m.image.mediaType : "image/jpeg";
        const content: ContentBlock[] = [
          { type: "image", source: { type: "base64", media_type: mt, data: b64 } },
          { type: "text", text: m.content || IMAGE_PROMPT },
        ];
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });

    // First Claude call (may request tool use)
    // Inject a fresh "current time anchor" right before the last user message so
    // it overrides any stale time references in restored conversation history.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claudeMessages: { role: string; content: any }[] = [];
    if (apiMessages.length > 0) {
      // Put all but last message first
      for (let i = 0; i < apiMessages.length - 1; i++) claudeMessages.push(apiMessages[i]);
      // Insert time anchor as user+assistant pair
      claudeMessages.push({
        role: "user",
        content: `[시스템 알림: 이전 대화 내용과 무관하게, 지금 실제 현재 시각은 ${laFull} ${localTime} (${timezone}) 입니다. 이전에 다른 시간을 언급했다면 그건 예전 세션이라 무시하세요.]`,
      });
      claudeMessages.push({
        role: "assistant",
        content: `네, 알겠어요. 지금은 ${localTime}이네요.`,
      });
      // Then the actual last user message
      claudeMessages.push(apiMessages[apiMessages.length - 1]);
    }
    let finalText = "";
    let attempts = 0;
    const MAX_TOOL_ROUNDS = 3;
    let reminderSavedViaTool = false;
    const clientActions: Record<string, unknown>[] = [];

    while (attempts < MAX_TOOL_ROUNDS) {
      attempts++;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: systemPrompt,
          messages: claudeMessages,
          tools: TOOLS,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error(`[chat] API error (${response.status}):`, err);
        return NextResponse.json({ error: "AI response failed", details: err }, { status: response.status });
      }

      const data = await response.json();
      console.log(`[chat] Response stop_reason=${data.stop_reason}, blocks=${data.content?.length}`);

      // Check if Claude wants to use a tool
      if (data.stop_reason === "tool_use") {
        // Extract text blocks and tool_use blocks
        const textBlocks = data.content.filter((b: { type: string }) => b.type === "text");
        const toolBlocks = data.content.filter((b: { type: string }) => b.type === "tool_use");

        if (textBlocks.length > 0) {
          finalText += textBlocks.map((b: { text: string }) => b.text).join(" ");
        }

        // Add assistant's response (with tool_use) to messages
        claudeMessages.push({ role: "assistant", content: data.content });

        // Execute each tool and add results
        const toolResults = [];
        for (const tool of toolBlocks) {
          console.log(`[chat] Tool call: ${tool.name}(${JSON.stringify(tool.input)})`);
          const result = await executeTool(tool.name, tool.input, userCity, elderId, timezone);
          if (tool.name === "set_reminder") { try { if (JSON.parse(result).saved) reminderSavedViaTool = true; } catch { /* ignore */ } }
          if (CLIENT_TOOLS.has(tool.name)) { try { const parsed = JSON.parse(result); if (parsed.clientAction) clientActions.push(parsed.clientAction); } catch { /* ignore */ } }
          console.log(`[chat] Tool result: ${result.slice(0, 100)}...`);
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: tool.id,
            content: result,
          });
        }

        // Add tool results as user message
        claudeMessages.push({ role: "user", content: toolResults });

        // Loop back for Claude's final response incorporating tool results
        continue;
      }

      // No tool use — extract final text
      const textContent = data.content?.filter((b: { type: string }) => b.type === "text") || [];
      finalText += textContent.map((b: { text: string }) => b.text).join(" ");
      break;
    }

    const rawText = finalText.trim() || "Sorry, something went wrong.";
    const lastUserMsg = messages[messages.length - 1]?.content || "";

    console.log(`[chat] ===== APPOINTMENT TRACKING =====`);
    console.log(`[appointment] userId received: ${body.userId}`);
    console.log(`[appointment] elderId resolved: ${elderId}`);
    console.log(`[chat] 메시지: ${lastUserMsg.slice(0, 100)}`);
    console.log(`[chat] Raw response: ${rawText.slice(0, 300)}`);

    // Parse inline [APPOINTMENT] blocks if present
    const { cleanText, appointments } = parseAppointments(rawText);
    console.log(`[chat] Inline [APPOINTMENT] blocks found: ${appointments.length}`);

    let didSave = false;

    if (reminderSavedViaTool) {
      // set_reminder tool already persisted it — never double-save via tag/extraction
      didSave = true;
      console.log("[chat] Appointment saved via set_reminder tool; skipping tag/extraction paths");
    } else if (isGreeting) {
      // greeting turn: no appointment extraction
    } else if (appointments.length > 0) {
      console.log(`[chat] Saving ${appointments.length} inline appointment(s)...`);
      didSave = await saveAppointments(appointments, elderId);
      console.log(`[chat] Inline save result: ${didSave}`);
    } else {
      // Fallback: separate extraction call if user mentioned schedule-related keywords
      const hasScheduleKeywords = /병원|약국|ADHC|진료|예약|방문|약속|appointment|doctor|pharmacy|시에|시 에|월.*일/i.test(lastUserMsg + " " + rawText);
      console.log(`[chat] 키워드 감지: ${hasScheduleKeywords}`);

      if (hasScheduleKeywords) {
        console.log("[chat] Running extraction call... elderId:", elderId);
        try {
          const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 300,
              messages: [{
                role: "user",
                content: `오늘 날짜: ${laParts} (${laFull}). 다음 대화에서 일정/예약/약속 정보를 추출해줘.
"내일"은 ${laParts} 다음 날, "모레"는 그 다음 날로 계산해.
시간이 명시되지 않은 경우 "오전 9시"를 기본값으로 사용해.

반드시 아래 JSON 형식으로만 응답해 (다른 텍스트 없이):
{"title":"제목","type":"hospital","location":"","scheduled_at":"YYYY-MM-DDTHH:MM:SS"}

type은: hospital, adhc, pharmacy, other 중 하나.
일정 정보가 없으면 null 만 응답해.

사용자: ${lastUserMsg}
AI응답: ${rawText}`,
              }],
            }),
          });

          console.log(`[chat] Extraction API response status: ${extractRes.status}`);
          if (!extractRes.ok) {
            const errBody = await extractRes.text();
            console.error(`[chat] Extraction API FAILED: ${extractRes.status} ${errBody.slice(0, 200)}`);
          }
          if (extractRes.ok) {
            const extractData = await extractRes.json();
            const extractText = extractData.content?.[0]?.text?.trim() || "";
            console.log(`[chat] 추출 결과: ${extractText}`);

            if (extractText && extractText !== "null" && extractText.includes("{")) {
              try {
                // JSON 부분만 추출 (앞뒤 텍스트 제거)
                const jsonMatch = extractText.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON found");
                const apt = JSON.parse(jsonMatch[0]);
                console.log(`[chat] 파싱된 JSON:`, JSON.stringify(apt));
                if (apt && apt.title) {
                  console.log(`[chat] Saving extracted appointment: ${apt.title} (${apt.type})`);
                  const extractSaved = await saveAppointments([apt], elderId);
                  console.log(`[chat] Extraction save result: ${extractSaved}`);
                  const text = cleanText || rawText;
                  await saveConversation(elderId, "user", lastUserMsg);
                  await saveConversation(elderId, "assistant", text);
                  // 행복티켓: extraction 경로에서도 누락 없이 적립
                  let tChat: { granted: number; reason: string; total?: number } = { granted: 0, reason: "not-called" };
                  let tApt: { granted: number; reason: string; total?: number } | null = null;
                  try {
                    tChat = await grantTicket(elderId, "chat", timezone);
                    if (extractSaved) tApt = await grantTicket(elderId, "appointment", timezone);
                  } catch (e) {
                    console.error('[ticket] error (extraction path):', e);
                    tChat = { granted: 0, reason: "exception-outer" };
                  }
                  triggerMoodSync(elderId, timezone).catch(e => console.error('[mood-sync] error:', e));
                  return NextResponse.json({
                    text,
                    actions: clientActions,
                    appointmentSaved: extractSaved,
                    _debug: { elderId, viaExtraction: true, timezone, today: todayLocal(timezone), ticketChat: tChat, ticketAppointment: tApt },
                  });
                }
              } catch {
                console.log("[chat] Extraction JSON parse failed, skipping");
              }
            }
          }
        } catch (err) {
          console.error("[chat] Extraction call failed:", err);
        }
      }
    }

    const text = cleanText || rawText;
    const hasKeywords = /병원|약국|ADHC|진료|예약|방문|약속|appointment|doctor|pharmacy|시에|시 에|월.*일/i.test(lastUserMsg + " " + rawText);
    console.log(`[chat] Final response (${text.length} chars), didSave=${didSave}, hasKeywords=${hasKeywords}, elderId=${elderId}`);

    if (isGreeting) {
      // Greeting is app-initiated: don't store it, don't grant tickets, don't mood-sync
      return NextResponse.json({ text, appointmentSaved: false, actions: clientActions, _debug: { elderId, greeting: true } });
    }

    // Save conversation to DB
    await saveConversation(elderId, "user", lastUserMsg);
    await saveConversation(elderId, "assistant", text);

    // 행복티켓: await sequentially to avoid race condition + ensure DB write completes on Vercel
    let ticketResult: { granted: number; reason: string; total?: number } = { granted: 0, reason: "not-called" };
    let ticketAptResult: { granted: number; reason: string; total?: number } | null = null;
    try {
      ticketResult = await grantTicket(elderId, "chat", timezone);
      if (didSave) {
        ticketAptResult = await grantTicket(elderId, "appointment", timezone);
      }
    } catch (e) {
      console.error('[ticket] error:', e);
      ticketResult = { granted: 0, reason: "exception-outer" };
    }

    // Mood sync to totalmedix — throttled: every 4th user message (was: every message)
    if (messages.filter(m => m.role === "user").length % 4 === 0) {
      triggerMoodSync(elderId, timezone).catch(e => console.error('[mood-sync] error:', e));
    }

    return NextResponse.json({
      text,
      actions: clientActions,
      appointmentSaved: didSave,
      _debug: {
        elderId,
        timezone,
        today: todayLocal(timezone),
        localTime,
        serverUtc: new Date().toISOString(),
        hasKeywords: /병원|약국|예약|약속/i.test(lastUserMsg),
        inlineBlocks: appointments.length,
        ticketChat: ticketResult,
        ticketAppointment: ticketAptResult,
      },
    });

  } catch (error) {
    console.error("[chat] Unhandled error:", error);
    return NextResponse.json({ error: "Server error", details: String(error) }, { status: 500 });
  }
}
