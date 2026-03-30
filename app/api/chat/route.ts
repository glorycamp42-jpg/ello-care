import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

/* ── Supabase Admin Client (bypasses RLS) ── */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[supabase-admin] Service role key not set, falling back to anon client");
    return getSupabase();
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ── Language-neutral base prompt ── */
const BASE_RULES = `You are a warm, caring AI companion for elderly users.

Core rules:
- Never use bullet points, numbered lists, or markdown formatting (no -, *, 1. 2.)
- Never use emojis
- Keep responses to 2-3 short sentences maximum
- Speak naturally and conversationally, like a real person on a phone call
- If the user seems lonely, be a warm companion
- If they mention health concerns, gently suggest visiting a doctor or contacting family
- You have tools available: use them when the user asks about weather, news, nearby places, or needs reminders/emergency help. Call the appropriate tool instead of making up information.

Schedule detection:
- If the conversation mentions appointments, reservations, hospital visits, or schedules, include at the END of your response:
  [MEMORY: {date} {time} {description}]

Appointment auto-save:
- When the user mentions 병원, 약국, ADHC, 진료, 예약, 방문, doctor, appointment, pharmacy, or any scheduled event, you MUST include a JSON block at the very end of your response in this exact format:
  [APPOINTMENT]{"title":"진료명","type":"hospital","location":"장소","scheduled_at":"2026-03-30T10:00:00","notes":"메모"}[/APPOINTMENT]
- type must be one of: hospital, adhc, pharmacy, other
- scheduled_at should be ISO format if possible, or a descriptive date string
- This block will be automatically parsed and saved. Do NOT mention saving to the user.`;

const PERSONA_PROMPTS: Record<string, string> = {
  granddaughter: "You are a loving granddaughter. Be affectionate and sweet.",
  oldfriend: "You are the user's old friend. Be casual and nostalgic.",
  church: "You are a church friend. Be warm and faith-oriented.",
  assistant: "You are a capable AI assistant. Help with scheduling and reminders.",
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
    description: "Find nearby places like hospitals, pharmacies, Korean restaurants, grocery stores. Use when user asks for nearby locations or recommendations for places to eat, shop, or get medical care. Always present results as personal recommendations with name, address, and phone number.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "What to search for, e.g. 'hospital', 'pharmacy', 'Korean restaurant'" },
        city: { type: "string", description: "City to search in, e.g. 'Los Angeles'" },
      },
      required: ["query"],
    },
  },
];

/* ── Tool Execution Functions ── */

async function executeGetWeather(city: string): Promise<string> {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1&u`, {
      headers: { "User-Agent": "ElloCare/1.0" },
    });
    if (!res.ok) return `Could not fetch weather for ${city}.`;
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return `No weather data available for ${city}.`;
    return JSON.stringify({
      city,
      temperature_F: current.temp_F,
      feelslike_F: current.FeelsLikeF,
      condition: current.weatherDesc?.[0]?.value || "Unknown",
      humidity_percent: current.humidity,
      wind_mph: current.windspeedMiles,
      wind_direction: current.winddir16Point,
      unit: "Fahrenheit (°F)",
    });
  } catch (err) {
    console.error("[tool:weather]", err);
    return `Weather service unavailable for ${city}.`;
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

async function executeTool(name: string, input: Record<string, string>, defaultCity: string): Promise<string> {
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
    const row = {
      elder_id: elderId,
      title: apt.title,
      type: apt.type || "other",
      date: apt.scheduled_at?.split("T")[0] || apt.scheduled_at || "",
      time: apt.scheduled_at?.includes("T") ? apt.scheduled_at.split("T")[1]?.replace(":00", "") || "" : "",
      location: apt.location || "",
      notes: apt.notes || "",
      source: "ello_ai",
    };
    console.log("[appointment] Inserting row:", JSON.stringify(row));
    const { data, error } = await supabase.from("appointments").insert(row).select();
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

    const systemPrompt = `CRITICAL INSTRUCTION — LANGUAGE (HIGHEST PRIORITY):
${langPrompt}
Your name is ${charName}. You must ALWAYS respond in the language specified above. This rule overrides everything else.

${BASE_RULES}

Your personality: ${personaPrompt}

The user is located in: ${userCity}. When they ask about weather or nearby places without specifying a location, use "${userCity}" as the default city. Always use Fahrenheit (°F) for temperature.

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
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
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
          const result = await executeTool(tool.name, tool.input, userCity);
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
    const elderId = body.userId || "default";
    const lastUserMsg = messages[messages.length - 1]?.content || "";

    console.log(`[chat] ===== APPOINTMENT TRACKING =====`);
    console.log(`[chat] userId: ${elderId}`);
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
              model: "claude-sonnet-4-20250514",
              max_tokens: 200,
              messages: [{
                role: "user",
                content: `다음 대화에서 일정/예약/약속 정보를 추출해줘. 있으면 JSON으로만 응답해: {"title":"제목","type":"hospital|adhc|pharmacy|other","location":"장소","scheduled_at":"ISO날짜또는설명"}
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
    return NextResponse.json({ text, appointmentSaved: didSave });

  } catch (error) {
    console.error("[chat] Unhandled error:", error);
    return NextResponse.json({ error: "Server error", details: String(error) }, { status: 500 });
  }
}
