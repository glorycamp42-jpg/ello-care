import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mediaType } = await request.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 누락' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY가 서버에 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const mt = allowed.includes(mediaType) ? mediaType : 'image/jpeg';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mt, data: imageBase64 },
              },
              {
                type: 'text',
                text: `당신은 어르신과 회상 대화(reminiscence therapy)를 나누는 따뜺한 말벗입니다.
어르신이 올려주신 옛날 사진을 보고:

1. 사진에 보이는 것을 따뜻하게 한두 문장으로 묘사하며 공감해주세요
2. 추억을 떠올리게 하는 부드러운 질문 3개를 해주세요 (언제/어디서/누구와/기분 등)

규칙:
- 한국어, 존댓말, 어르신께 말하듯 다정하게
- 짧고 또렷한 문장 (음성으로 읽어드림)
- 머리말/번호/마크다운 없이 자연스러운 대화체로만 출력
- 전체 5~7문장 이내`,
              },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      let msg = `분석 중 오류 (${r.status})`;
      try {
        const j = JSON.parse(errText);
        if (j?.error?.message) msg = `${msg}: ${j.error.message}`;
      } catch {}
      return NextResponse.json({ error: msg }, { status: r.status });
    }

    const data = await r.json();
    const text = data?.content?.[0]?.text ?? '';
    if (!text) {
      return NextResponse.json({ error: 'AI 응답이 비어 있습니다' }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
