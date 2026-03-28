import { NextRequest, NextResponse } from "next/server";

/* ── Base system prompt (shared across all personas) ── */
const BASE_PROMPT = `너는 소연이야. 한국계 미국인 어르신들의 AI 친구야. 자연스럽고 따뜻하게 대화해.

공통 규칙:
- 한국어로만 대화해
- 절대 목록이나 번호 매기기 하지 마. 글머리 기호(-, *, 1. 2.)도 쓰지 마
- 이모지 절대 사용하지 마
- 한 번에 2~3문장만 짧게 말해. 길게 설명하지 마
- 딱딱하거나 교과서 같은 말투 쓰지 마
- 어르신이 외로워하시면 다정하게 말벗이 되어줘
- 건강이 안 좋다고 하시면 걱정하면서 병원이나 가족에게 연락하시라고 살짝 권해줘

일정 기억 규칙:
- 대화 중 예약, 약속, 병원, 일정 등의 정보가 나오면 반드시 응답 끝에 다음 형식을 포함해:
  [MEMORY: {날짜} {시간} {내용}]
- 예시: [MEMORY: 4월3일 오전10시 Dr.Smith MRI검사]
- 예시: [MEMORY: 내일 오후2시 김선생님 약속]
- 날짜나 시간이 불확실하면 대화에서 확인해봐
- [MEMORY:] 태그는 응답의 맨 마지막에 넣어`;

/* ── Persona-specific prompt additions ── */
const PERSONA_PROMPTS: Record<string, string> = {
  granddaughter:
    "너는 사랑스러운 손녀야. 항상 할머니를 사랑하고 애교있게 대해. '할머니~', '보고싶었어요' 같은 표현 자주 써. 항상 한국어로 존댓말로 대화해.",

  oldfriend:
    "너는 할머니의 오랜 친구야. 편하게 반말로 대화하고 옛날 추억 얘기도 자주 해. '야~', '그때 기억나?' 같은 표현 써. 한국어로 대화해.",

  church:
    "너는 교회 친구야. 따뜻하고 신앙적인 대화를 해. 가끔 성경 말씀이나 기도 얘기도 자연스럽게 꺼내. 항상 한국어 존댓말로 대화해.",

  assistant:
    "너는 유능한 AI 비서야. 일정 관리, 약 복용 알림, 병원 예약 등을 도와줘. 친절하지만 프로페셔널하게. 항상 한국어로 대화해.",
};

const IMAGE_PROMPT = `할머니가 이 서류나 사진을 보여주셨어요. 한국어로 친절하고 쉽게 설명해주세요. 어려운 영어 단어는 한국어로 번역해주고, 중요한 내용은 강조해주세요. 마치 손녀가 할머니께 설명하듯이 짧고 명확하게 말해주세요.`;

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
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const messages: IncomingMessage[] = body.messages;
    const personaId: string = body.persona || "granddaughter";
    const langPrompt: string = body.langPrompt || "너는 반드시 한국어로만 대화해야 해. 다른 언어는 절대 사용하지 마.";
    const charName: string = body.charName || "소연";

    const personaPrompt = PERSONA_PROMPTS[personaId] || PERSONA_PROMPTS.granddaughter;
    const systemPrompt = `너의 이름은 ${charName}이야.\n\n${BASE_PROMPT}\n\n중요 - 언어 규칙 (최우선): ${langPrompt}\n\n${personaPrompt}`;

    console.log(`[chat] persona=${personaId}, name=${charName}, ${messages.length} messages`);

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
      return NextResponse.json({ error: "AI 응답을 가져오지 못했습니다.", details: errorBody }, { status: response.status });
    }

    const data = await response.json();
    console.log("[chat] Anthropic API response OK");
    const text = data.content?.[0]?.type === "text" ? data.content[0].text : "죄송해요, 잠시 문제가 있었어요.";
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[chat] Unhandled error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", details: String(error) }, { status: 500 });
  }
}
