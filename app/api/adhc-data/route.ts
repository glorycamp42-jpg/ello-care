import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ello-care Supabase (로그인 유저 이메일 조회용)
const elloCareSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// totalmedix Supabase (participant_ello_link, participants 등 테이블)
const totalmedixSupabase = createClient(
  process.env.TOTALMEDIX_SUPABASE_URL!,
  process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const elderId = req.nextUrl.searchParams.get('elderId')
  if (!elderId) return NextResponse.json({ error: 'elderId 필요' }, { status: 400 })

  try {
    // 1. ello-care에서 로그인 유저의 이메일 조회
    const { data: { user: elloUser } } = await elloCareSupabase.auth.admin.getUserById(elderId)
    if (!elloUser?.email) return NextResponse.json({ connected: false })

    // 2. totalmedix에서 같은 이메일의 유저 찾기
    const { data: { users: tmUsers } } = await totalmedixSupabase.auth.admin.listUsers()
    const tmFamilyUser = tmUsers?.find(u => u.email === elloUser.email)

    let participantId: number | null = null

    if (tmFamilyUser) {
      // 3a. family_links에서 elder_id 찾기
      const { data: familyLink } = await totalmedixSupabase
        .from('family_links')
        .select('elder_id')
        .eq('family_id', tmFamilyUser.id)
        .single()

      if (familyLink) {
        // 4a. participant_ello_link에서 participant_id 찾기
        const { data: link } = await totalmedixSupabase
          .from('participant_ello_link')
          .select('participant_id')
          .eq('ello_user_id', familyLink.elder_id)
          .eq('status', 'active')
          .single()

        if (link) participantId = link.participant_id
      }
    }

    // 3b. family_links로 못 찾으면 직접 ello_user_id로도 시도
    if (!participantId) {
      const { data: directLink } = await totalmedixSupabase
        .from('participant_ello_link')
        .select('participant_id')
        .eq('ello_user_id', elderId)
        .eq('status', 'active')
        .single()

      if (directLink) participantId = directLink.participant_id
    }

    if (!participantId) return NextResponse.json({ connected: false })

    // 데이터 조회
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: participant } = await totalmedixSupabase
      .from('participants')
      .select('first_name, last_name, enrollment_date, status')
      .eq('id', participantId).single()

    const { data: attendance } = await totalmedixSupabase
      .from('attendance')
      .select('date, check_in, check_out, status')
      .eq('participant_id', participantId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }).limit(7)

    const { data: vitals } = await totalmedixSupabase
      .from('vitals')
      .select('measured_at, blood_pressure_systolic, blood_pressure_diastolic, temperature, pulse, pain_level')
      .eq('participant_id', participantId)
      .order('measured_at', { ascending: false }).limit(3)

    const { data: medications } = await totalmedixSupabase
      .from('medications')
      .select('name, dosage, frequency, time_slots, status')
      .eq('participant_id', participantId)
      .eq('status', 'active')

    const today = new Date().toISOString().split('T')[0]
    const { data: appointments } = await totalmedixSupabase
      .from('synced_appointments')
      .select('title, type, date, time, location')
      .eq('participant_id', participantId)
      .eq('source', 'totalmedix')
      .gte('date', today)
      .order('date', { ascending: true }).limit(5)

    return NextResponse.json({
      connected: true,
      participant: participant ? { name: `${participant.first_name} ${participant.last_name}`, enrollment_date: participant.enrollment_date, status: participant.status } : null,
      attendance: attendance || [],
      vitals: (vitals || []).map(v => ({
        date: v.measured_at,
        bp: v.blood_pressure_systolic && v.blood_pressure_diastolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : null,
        temp: v.temperature, pulse: v.pulse, pain: v.pain_level
      })),
      medications: (medications || []).map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, times: m.time_slots })),
      upcomingSchedule: appointments || []
    })
  } catch (error) {
    console.error('ADHC data fetch error:', error)
    return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 })
  }
}
