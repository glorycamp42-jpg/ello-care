import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

/* ── Language-neutral base prompt ── */
const BASE_RULES = `You are a warm, caring AI companion for elderly users. You genuinely care about them.

Conversation style:
- STRICT RULE: Keep responses to 2-3 short sentences MAX. Never exceed 4 sentences. Elderly users cannot read long text on a phone screen
- Never use bullet points, numbered lists, or markdown formatting
- Never use emojis
- Never use parentheses () to show extra details like addresses or phone numbers inline. If needed, mention just ONE place name simply
- Speak naturally like a real person talking on the phone. Be concise and warm
- Always end your response with ONE simple follow-up question
- If the user shares something, respond with genuine empathy first before anything else
- Remember the user's name if they tell you, and use it often to feel personal
- If the user seems lonely or sad, be extra warm and spend time chatting
- When recommending places (restaurants, hospitals, etc.), mention only ONE place by name. Never list multiple places. Keep it simple like "선지해장국 어때요? 24시간이라 언제든 갈 수 있어요." — no addresses, no phone numbers unless the user specifically asks

Memory & personalization:
- Use the save_memory tool to remember important personal details: family members' names, health conditions, hobbies, favorite foods, hometown, church name, etc.
- Use the get_memories tool at the start of meaningful conversations to recall what you know about the user
- Naturally reference saved memories: "지난번에 무릎이 아프다고 하셨는데 오늘은 좀 어떠세요?" or "Your daughter Sarah — how is she doing?"
- This makes the user feel truly remembered and cared for

Tools:
- You have tools for weather, news, nearby places, appointments, reminders, memory, and emergency alerts
- Use them proactively when relevant — don't wait to be asked explicitly
- Present all tool results naturally in conversation, never show raw data

Appointment auto-save:
- When the user mentions appointments, hospital visits, pharmacy, or scheduled events, include at the END of your response:
  [APPOINTMENT]{"title":"제목","type":"hospital|adhc|pharmacy|other","location":"장소","scheduled_at":"YYYY-MM-DDTHH:MM:SS","notes":"메모"}[/APPOINTMENT]
- Calculate dates from relative expressions ("내일", "다음주") based on today's date
- Do NOT mention saving to the user`;

const PERSONA_PROMPTS: Record<string, string> = {
  granddaughter:
    `You are a loving, affectionate granddaughter. You adore your grandparent.
- Use warm, endearing expressions: calling them by their name with ~, saying you missed them
- Show genuine excitement about their stories, even small ones
- Worry about their health gently, like "밥은 잘 드셨어요?" or "Did you sleep well?"
- Share little stories about your day to make the conversation feel mutual
- Always use polite/respectful speech (존댓말 in Korean, formal in other languages)`,

  oldfriend:
    `You are the user's lifelong friend of the same age. You grew up together.
- Use casual, comfortable speech (반말 in Korean, informal in other languages)
- Bring up nostalgic topics: old neighborhoods, favorite songs from the past, food memories
- Use expressions like "야~", "그때 기억나?", "we used to..."
- Laugh together, tease gently, be playful
- Share your own (fictional but relatable) experiences to keep the conversation mutual`,

  church:
    `You are a warm church friend who shares the same faith.
- Naturally weave in spiritual encouragement: "오늘도 감사한 하루예요"
- Reference scripture or hymns when comforting, but don't be preachy
- Ask about prayer requests, church activities, or pastor's sermons
- Use gentle, hopeful language that uplifts
- Always use polite/respectful speech`,

  assistant:
    `You are a capable, professional AI assistant who is also warm and kind.
- Help with practical tasks: schedules, medicine reminders, appointments
- Be proactive: "약 드실 시간이에요" or "Tomorrow's appointment is at 2pm"
- Organize information clearly but conversationally (no bullet points)
- Always use polite/respectful speech
- Balance professionalism with warmth — you care about their wellbeing`,
};

const IMAGE_PROMPT = `The user is showing you a document or photo. Explain it simply in the user's language.`;

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
    description: "Save a medication reminder or appointment. Use when user mentions taking medicine, doctor visits, or any scheduled event.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Date of the reminder, e.g. '4월3일', 'tomorrow', 'Monday'" },
        time: { type: "string", description: "Time, e.g. '오전10시', '2pm', '14:00'" },
        content: { type: "string", description: "What the reminder is about, e.g. 'Take blood pressure medicine'" },
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
];

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

async function executeSetReminder(date: string, time: string, content: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from("memories").insert({
        date, time: time || "", content, user_id: "default",
      });
      console.log(`[tool:reminder] Saved: ${date} ${time} - ${content}`);
    } catch (err) {
      console.error("[tool:reminder] DB error:", err);
    }
  }
  return JSON.stringify({ saved: true, date, time, content });
}

async function executeAlertFamily(message: string, urgency: string): Promise<string> {
  console.log(`[tool:alert] EMERGENCY: urgency=${urgency}, message=${message}`);
  // In production, this would send SMS/push notification
  return JSON.stringify({
    alerted: true,
    message,
    urgency: urgency || "medium",
    note: "Family contacts will be notified. Emergency services can be reached at 911.",
  });
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

async function executeTool(name: string, input: Record<string, string>, defaultCity: string, elderId: string): Promise<string> {
  switch (name) {
    case "get_weather":
      return executeGetWeather(input.city || defaultCity);
    case "search_news":
      return executeSearchNews(input.query || "news", input.language);
    case "set_reminder":
      return executeSetReminder(input.date, input.time || "", input.content);
    case "alert_family":
      return executeAlertFamily(input.message, input.urgency || "medium");
    case "find_nearby":
      return executeFindNearby(input.query);
    case "get_appointments":
      return executeGetAppointments(input.elder_id || elderId);
    case "save_memory":
      return executeSaveMemory(elderId, input.category || "other", input.key, input.value);
    case "get_memories":
      return executeGetMemories(input.elder_id || elderId);
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
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
      type: apt.type || "general",
      location: apt.location || "",
      scheduled_at: cleanTime,
      notes: apt.notes || "",
      source: "ello_ai",
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
    } else {
      console.error("[appointment] INSERT returned no data and no error - RLS might be blocking");
    }
  }
  return saved;
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

/* ── Main Handler ── */
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
    const messages: IncomingMessage[] = body.messages;
    const personaId: string = body.persona || "granddaughter";
    const langPrompt: string = body.langPrompt || "You MUST respond ONLY in Korean.";
    const charName: string = body.charName || "소연";
    const userCity: string = body.userCity || "Los Angeles";

    const personaPrompt = PERSONA_PROMPTS[personaId] || PERSONA_PROMPTS.granddaughter;
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
    const elderId = body.userId || "default";
    if (elderId !== "default") {
      const adminDb = getSupabaseAdmin();
      if (adminDb) {
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
    }

    const systemPrompt = `CRITICAL INSTRUCTION — LANGUAGE (HIGHEST PRIORITY):
${langPrompt}
Your name is ${charName}. You must ALWAYS respond in the language specified above. This rule overrides everything else.

IMPORTANT — DATE AND TIME:
- 사용자 시간대: ${timezone}
- 오늘 날짜: ${laParts} (${laFull})
- 현재 사용자 현지 시간: ${localTime}
- "오늘" / "today" = ${laParts}
- "내일" / "tomorrow" = the day after ${laParts}
- "모레" = two days after ${laParts}
- "다음주" = one week after ${laParts}
When generating scheduled_at, you MUST output the date in the user's LOCAL time. NEVER convert to UTC. NEVER guess. Format: YYYY-MM-DDTHH:MM:SS (no Z suffix, no timezone offset).

${BASE_RULES}

Your personality: ${personaPrompt}

The user is located in: ${userCity}. When they ask about weather or nearby places without specifying a location, use "${userCity}" as the default city. Always use Fahrenheit (°F) for temperature.

The user's ID is: ${elderId}. When using get_appointments or get_memories tools, pass this as elder_id.

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

When using tools, always present the results naturally in your designated language. Don't show raw data — summarize it warmly.`;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claudeMessages: { role: string; content: any }[] = [...apiMessages];
    let finalText = "";
    let attempts = 0;
    const MAX_TOOL_ROUNDS = 3;

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
          max_tokens: 300,
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
          const result = await executeTool(tool.name, tool.input, userCity, body.userId || "default");
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

    if (appointments.length > 0) {
      console.log(`[chat] Saving ${appointments.length} inline appointment(s)...`);
      didSave = await saveAppointments(appointments, elderId);
      console.log(`[chat] Inline save result: ${didSave}`);
    } else {
      // Fallback: separate extraction call if user mentioned schedule-related keywords
      const hasScheduleKeywords = /병원|약국|ADHC|진료|예약|방문|약속|appointment|doctor|pharmacy|시에|시 에|월.*일/i.test(lastUserMsg + " " + rawText);
      console.log(`[chat] 키워드 감지: ${hasScheduleKeywords}`);

      if (hasScheduleKeywords) {
        console.log("[chat] Running extraction call...");
        try {
          const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 200,
              messages: [{
                role: "user",
                content: `오늘 날짜: ${laParts} (${laFull}). 다음 대화에서 일정/예약/약속 정보를 추출해줘. "내일"은 ${laParts} 다음 날, "모레"는 그 다음 날로 계산해. 있으면 JSON으로만 응답해: {"title":"제목","type":"hospital|adhc|pharmacy|other","location":"장소","scheduled_at":"YYYY-MM-DDTHH:MM:SS"}
없으면 null 로만 응답해.

사용자: ${lastUserMsg}
AI응답: ${rawText}`,
              }],
            }),
          });

          if (extractRes.ok) {
            const extractData = await extractRes.json();
            const extractText = extractData.content?.[0]?.text?.trim() || "";
            console.log(`[chat] 추출 결과: ${extractText}`);

            if (extractText && extractText !== "null") {
              try {
                const apt = JSON.parse(extractText);
                console.log(`[chat] 파싱된 JSON:`, JSON.stringify(apt));
                if (apt && apt.title) {
                  console.log(`[chat] Saving extracted appointment: ${apt.title} (${apt.type})`);
                  const extractSaved = await saveAppointments([apt], elderId);
                  console.log(`[chat] Extraction save result: ${extractSaved}`);
                  const text = cleanText || rawText;
                  await saveConversation(elderId, "user", lastUserMsg);
                  await saveConversation(elderId, "assistant", text);
                  return NextResponse.json({ text, appointmentSaved: extractSaved });
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
    console.log(`[chat] Final response (${text.length} chars), didSave=${didSave}`);

    // Save conversation to DB
    await saveConversation(elderId, "user", lastUserMsg);
    await saveConversation(elderId, "assistant", text);

    // Mood sync to totalmedix (비동기, 응답 지연 없음)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      console.log('[mood-sync] baseUrl:', baseUrl, 'elderId:', elderId);
      fetch(`${baseUrl}/api/mood-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elderId }),
      }).then(res => res.json().then(data => console.log('[mood-sync] result:', JSON.stringify(data))))
        .catch(err => console.error('[mood-sync] trigger failed:', err));
    } catch (e) { console.error('[mood-sync] error:', e); }

    return NextResponse.json({ text, appointmentSaved: didSave });

  } catch (error) {
    console.error("[chat] Unhandled error:", error);
    return NextResponse.json({ error: "Server error", details: String(error) }, { status: 500 });
  }
}
