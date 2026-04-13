import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ello-care Supabase (conversations 테이블)
const elloCareSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// totalmedix Supabase (ello_mood_summary 테이블)
const totalmedixSupabase = createClient(
  process.env.TOTALMEDIX_SUPABASE_URL!,
  process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { elderId } = await req.json()
    if (!elderId) return NextResponse.json({ error: 'elderId 필요' }, { status: 400 })

    // 1. 오늘 대화 내역 가져오기
    const today = new Date().toISOString().split('T')[0]
    const { data: conversations } = await elloCareSupabase
      .from('conversations')
      .select('role, content, created_at')
      .eq('elder_id', elderId)
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: true })

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ synced: false, reason: '오늘 대화 없음' })
    }

    // 2. Claude로 감정 분석
    const chatLog = conversations.map(c => `${c.role}: ${c.content}`).join('\n')

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `다음은 노인과 AI 말벗의 오늘 대화입니다. 감정을 분석해주세요.

대화 내용:
${chatLog}

JSON으로만 답해주세요:
{
  "mood_score": (1-10, 1=매우 우울, 10=매우 행복),
  "alert_level": ("normal" | "caution" | "urgent"),
  "topics": ["대화 주제1", "대화 주제2"],
  "summary": "한줄 요약 (한국어)"
}

alert_level 기준:
- normal: 평범한 대화
- caution: 외로움, 가벼운 우울감, 건강 불편 호소
- urgent: 심한 우울, 자해 언급, 낙상, 응급상황`
      }]
    })

    const responseText = analysis.content[0].type === 'text' ? analysis.content[0].text : ''

    // JSON 추출
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: '감정 분석 실패' }, { status: 500 })

    const moodData = JSON.parse(jsonMatch[0])

    // 3. totalmedix의 participant_ello_link에서 매칭 정보 가져오기
    const { data: connection } = await totalmedixSupabase
      .from('participant_ello_link')
      .select('participant_id')
      .eq('ello_user_id', elderId)
      .eq('status', 'active')
      .single()

    if (!connection) return NextResponse.json({ error: 'ADHC 연결 없음' }, { status: 404 })

    // 4. totalmedix의 ello_mood_summary에 저장
    const { data: saved, error: saveError } = await totalmedixSupabase
      .from('ello_mood_summary')
      .upsert({
        ello_user_id: elderId,
        participant_id: connection.participant_id,
        date: today,
        mood_score: moodData.mood_score,
        topics: moodData.topics,
        alert_level: moodData.alert_level,
        summary: moodData.summary,
        conversation_count: conversations.filter(c => c.role === 'user').length
      }, { onConflict: 'ello_user_id,date' })
      .select()
      .single()

    if (saveError) {
      console.error('Mood save error:', saveError)
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    // 5. alert_level이 caution/urgent면 ello_alerts에 자동 insert
    let alertCreated = false
    if (moodData.alert_level === 'caution' || moodData.alert_level === 'urgent') {
      // 같은 참가자의 오늘 날짜 alert가 이미 있는지 확인 (중복 방지)
      const { data: existingAlert } = await totalmedixSupabase
        .from('ello_alerts')
        .select('id, alert_level')
        .eq('participant_id', connection.participant_id)
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 기존 alert가 없거나, urgent로 승급된 경우만 새 alert 생성
      const shouldCreateAlert = !existingAlert ||
        (existingAlert.alert_level === 'caution' && moodData.alert_level === 'urgent')

      if (shouldCreateAlert) {
        const { error: alertError } = await totalmedixSupabase
          .from('ello_alerts')
          .insert({
            participant_id: connection.participant_id,
            mood_summary_id: saved.id,
            alert_level: moodData.alert_level,
            mood_score: moodData.mood_score,
            summary: moodData.summary,
            topics: moodData.topics,
          })

        if (alertError) {
          console.error('Alert insert error:', alertError)
        } else {
          alertCreated = true
          console.log(`[mood-sync] Alert created: ${moodData.alert_level} for participant ${connection.participant_id}`)
        }
      }
    }

    return NextResponse.json({
      synced: true,
      mood: moodData,
      saved,
      alertCreated
    })
  } catch (error) {
    console.error('Mood sync error:', error)
    return NextResponse.json({ error: '감정 분석 동기화 실패' }, { status: 500 })
  }
}
