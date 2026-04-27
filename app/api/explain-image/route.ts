import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 누락' }, { status: 400 });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
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
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `이 이미지에 보이는 프로그램/앱/웹사이트를 시니어 사용자에게 광고처럼 따뜻하고 친근하게 소개해주세요.

규칙:
- 한국어로 작성
- 5~7문장, 총 30~45초 분량 (너무 길지 않게)
- 첫 문장은 호기심을 끄는 한 마디
- 각 문장은 짧고 또렷하게 (한 호흡에 읽을 수 있게)
- 어려운 영어/전문용어 금지, 쉬운 말로
- 마지막 문장은 따뜻한 권유로 마무리
- 머리말/꼬리말/번호/마크다운 없이 본문만 출력`,
              },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Anthropic error:', errText);
      return NextResponse.json({ error: 'Vision API 오류' }, { status: 500 });
    }

    const data = await r.json();
    const script =
      data.content?.[0]?.type === 'text' ? data.content[0].text.trim() : '';

    return NextResponse.json({ script });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
