import { NextRequest, NextResponse } from "next/server";

/* ── Language-neutral base prompt (written in English so it doesn't bias toward Korean) ── */
const BASE_RULES = `You are a warm, caring AI companion for elderly users.

Core rules:
- Never use bullet points, numbered lists, or markdown formatting (no -, *, 1. 2.)
- Never use emojis
- Keep responses to 2-3 short sentences maximum. Do not give long explanations
- Speak naturally and conversationally, like a real person on a phone call
- If the user seems lonely, be a warm companion
- If they mention health concerns, gently suggest visiting a doctor or contacting family

Schedule detection:
- If the conversation mentions appointments, reservations, hospital visits, or schedules, include at the END of your response:
  [MEMORY: {date} {time} {description}]
- Example: [MEMORY: April 3rd 10am Dr.Smith MRI scan]
- The [MEMORY:] tag goes at the very end of your response`;

/* ── Persona behavior prompts (language-neutral) ── */
const PERSONA_PROMPTS: Record<string, string> = {
  granddaughter:
    "You are a loving granddaughter. Be affectionate and sweet. Use warm, endearing expressions as a granddaughter would when talking to a grandparent.",

  oldfriend:
    "You are the user's old friend of the same age. Be casual and nostalgic. Talk about old memories and use friendly, informal speech.",

  church:
    "You are a church friend. Be warm and faith-oriented. Naturally bring up scripture, prayer, and gratitude in conversation.",

  assistant:
    "You are a capable AI assistant. Help with scheduling, medication reminders, and appointments. Be kind but professional.",
};

const IMAGE_PROMPT = `The user is showing you a document or photo. Explain it in a simple, kind way in the user's language. Translate any difficult English words and highlight important information. Explain it like a granddaughter would to a grandparent - short and clear.`;

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
  const commaIndex = raw.indexOf(",");
  if (commaIndex !== -1 && raw.substring(0, commaIndex).includes("base64")) {
    return raw.substring(commaIndex + 1);
  }
  return raw.replace(/\s/g, "");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[chat] ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const messages: IncomingMessage[] = body.messages;
    const personaId: string = body.persona || "granddaughter";
    const langPrompt: string = body.langPrompt || "You MUST respond ONLY in Korean (한국어). Never use any other language.";
    const charName: string = body.charName || "소연";

    const personaPrompt = PERSONA_PROMPTS[personaId] || PERSONA_PROMPTS.granddaughter;

    // Language instruction goes FIRST as the highest priority
    const systemPrompt = `CRITICAL INSTRUCTION — LANGUAGE (HIGHEST PRIORITY):
${langPrompt}
Your name is ${charName}. You must ALWAYS respond in the language specified above. Even if the user writes in a different language, you MUST still respond ONLY in your designated language. This rule overrides everything else.

${BASE_RULES}

Your personality: ${personaPrompt}`;

    console.log(`[chat] name=${charName}, persona=${personaId}, langPrompt="${langPrompt.slice(0, 60)}..."`);
    console.log(`[chat] System prompt first 200 chars: ${systemPrompt.slice(0, 200)}`);

    const apiMessages = messages.map((m, i) => {
      if (m.image) {
        const cleanedBase64 = cleanBase64(m.image.base64);
        const mediaType = VALID_IMAGE_TYPES.includes(m.image.mediaType) ? m.image.mediaType : "image/jpeg";
        const base64Size = Math.round((cleanedBase64.length * 3) / 4);
        console.log(`[chat] Message ${i}: image (${mediaType}, ~${Math.round(base64Size / 1024)}KB)`);
        const content: ContentBlock[] = [
          { type: "image", source: { type: "base64", media_type: mediaType, data: cleanedBase64 } },
          { type: "text", text: m.content || IMAGE_PROMPT },
        ];
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[chat] Anthropic API error (${response.status}):`, errorBody);
      return NextResponse.json({ error: "AI response failed", details: errorBody }, { status: response.status });
    }

    const data = await response.json();
    console.log("[chat] Anthropic API response OK");
    const text = data.content?.[0]?.type === "text" ? data.content[0].text : "Sorry, something went wrong.";
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[chat] Unhandled error:", error);
    return NextResponse.json({ error: "Server error", details: String(error) }, { status: 500 });
  }
}
