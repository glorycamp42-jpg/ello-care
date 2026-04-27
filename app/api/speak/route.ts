import { NextRequest, NextResponse } from 'next/server';

// ElevenLabs 소연 음성 (Voice ID: 6yp5xWNuHEXOVkwW5Ghz)
// API 키 없으면 503 — 클라이언트가 브라우저 TTS로 폴백
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'text 누락' }, { status: 400 });
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY 미설정 — 브라우저 TTS 사용' },
        { status: 503 }
      );
    }

    const r = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/6yp5xWNuHEXOVkwW5Ghz',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!r.ok) {
      return NextResponse.json({ error: 'ElevenLabs 오류' }, { status: 502 });
    }

    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
