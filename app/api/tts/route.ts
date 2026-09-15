import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("[tts] ELEVENLABS_API_KEY is not set");
    return NextResponse.json({ error: "ElevenLabs API 설정이 필요합니다." }, { status: 500 });
  }

  try {
    const { text: rawText, voiceId, languageCode } = await req.json();

    if (!voiceId) {
      return NextResponse.json({ error: "voiceId가 필요합니다." }, { status: 400 });
    }

    // Strip emojis and UI labels before sending to TTS
    const text = rawText
      .replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27FF}|\u{2300}-\u{23FF}|\u{FE00}-\u{FEFF}|\u{1F900}-\u{1F9FF}]/gu, "")
      .replace(/\b(기쁨|대화|슬픔|화남|놀람)\b/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "텍스트가 비어있습니다." }, { status: 400 });
    }

    console.log(`[tts] voiceId=${voiceId}, lang=${languageCode || "auto"}, text length=${text.length}`);

    const FALLBACK_VOICE = "xi3rF0t7dg7uN2M0WUhr"; // granddaughter voice — known to exist on this account
    const callTts = (vid: string) => fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          // turbo_v2_5 gives more natural Korean pronunciation with lower latency
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            // Higher stability = more consistent, less weird intonation jumps
            stability: 0.55,
            // Slightly lower to reduce robotic artifacts
            similarity_boost: 0.75,
            // style=0 removes accent/intonation exaggeration (main cause of unnatural Korean)
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    let response = await callTts(voiceId);
    // Unknown/unavailable voice id → retry once with the fallback voice instead of going silent
    if ((response.status === 404 || response.status === 400 || response.status === 422) && voiceId !== FALLBACK_VOICE) {
      console.warn(`[tts] voice ${voiceId} failed (${response.status}); retrying with fallback voice`);
      response = await callTts(FALLBACK_VOICE);
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`[tts] ElevenLabs API error (${response.status}):`, error);
      return NextResponse.json(
        { error: "음성 생성에 실패했습니다.", details: error },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("[tts] Error:", error);
    return NextResponse.json(
      { error: "음성 생성 중 오류가 발생했습니다.", details: String(error) },
      { status: 500 }
    );
  }
}
