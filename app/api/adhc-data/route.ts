import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// totalmedix Supabase에 연결 (participant_ello_link, participants 등 테이블이 여기에 있음)
const totalmedixSupabase = createClient(
  process.env.TOTALMEDIX_SUPABASE_URL!,
  process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const elderId = req.nextUrl.searchParams.get('elderId')
  if (!elderId) return NextResponse.json({ error: 'elderId 필요' }, { status: 400 })

  try {
    const { data: link } = await totalmedixSupabase
      .from('participant_ello_link')
      .select('participant_id, status')
      .eq('ello_user_id', elderId)
      .eq('status', 'active')
      .single()

    if (!link) return NextResponse.json({ connected: false })

    const participantId = link.participant_id
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
