import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, mediaType, text } = await request.json();
    if (!imageBase64 && !text) {
      return NextResponse.json({ error: '이미지 또는 문자 내용이 필요합니다' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY가 서버에 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const mt = allowed.includes(mediaType) ? mediaType : 'image/jpeg';

    const instruction = `당신은 노인 대상 사기(보이스피싱, 스미싱, 사기 문자) 판별 전문가입니다.
주어진 ${imageBase64 ? '문자/메시지 화면 캡처' : '문자 내용'}을 분석해 사기 여부를 판단하세요.

위험 신호: 정부기관/은행/택배 사칭, 긴급함 조성, 링크 클릭 유도, 개인정보/금전 요구, 가족 사칭("엄마 나 폰 고장났어"), 의심스러운 URL, 검찰/경찰 사칭, 대출 권유, 환급금 안내 등.

반드시 아래 JSON 형식으로만 답하세요 (다른 텍스트 없이):
{"verdict": "danger" 또는 "caution" 또는 "safe", "title": "한 줄 결론 (쉬운 한국어)", "explanation": "왜 그런지 2~3문장 (어르신이 이해하기 쉽게)", "advice": "지금 해야 할 행동 1~2문장"}`;

    const content: unknown[] = [];
    if (imageBase64) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: mt, data: imageBase64 },
      });
    }
    content.push({
      type: 'text',
      text: text ? `${instruction}\n\n문자 내용: ${text}` : instruction,
    });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content }],
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
    const raw = data?.content?.[0]?.text ?? '';

    // JSON 파싱 (모델이 코드블록으로 감쌀 경우 대비)
    let parsed: { verdict?: string; title?: string; explanation?: string; advice?: string } = {};
    try {
      const jsonStr = raw.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      // JSON 실패 시 본문을 설명으로 사용
      parsed = {
        verdict: 'caution',
        title: '판별 결과를 확인하세요',
        explanation: raw.slice(0, 300),
        advice: '확실하지 않으면 가족에게 보여주세요.',
      };
    }

    const verdict = ['danger', 'caution', 'safe'].includes(parsed.verdict || '')
      ? parsed.verdict
      : 'caution';

    return NextResponse.json({
      verdict,
      title: parsed.title || '판별 완료',
      explanation: parsed.explanation || '',
      advice: parsed.advice || '',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
