import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ello-care Supabase (adhc_connections 테이블 조회용)
const elloCareSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// totalmedix Supabase (participants, attendance 등 ADHC 데이터)
const totalmedixSupabase = createClient(
  process.env.TOTALMEDIX_SUPABASE_URL!,
  process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const elderId = req.nextUrl.searchParams.get('elderId')
  if (!elderId) return NextResponse.json({ error: 'elderId 필요' }, { status: 400 })

  try {
    // 1. ello-care의 adhc_connections 테이블에서 participant_id 조회
    const { data: connection } = await elloCareSupabase
      .from('adhc_connections')
      .select('participant_id')
      .eq('ello_user_id', elderId)
      .eq('status', 'active')
      .single()

    if (!connection) return NextResponse.json({ connected: false })

    const participantId = connection.participant_id

    // 2. totalmedix에서 ADHC 데이터 조회
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: participant } = await totalmedixSupabase
      .from('participants')
      .select('first_name, last_name, status, created_at')
      .eq('id', participantId).single()

    const { data: attendance } = await totalmedixSupabase
      .from('attendance')
      .select('date, arrival_time, departure_time, status')
      .eq('participant_id', participantId)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }).limit(7)

    const { data: vitals } = await totalmedixSupabase
      .from('vitals')
      .select('date, time, bp_systolic, bp_diastolic, pulse, temp, pain_level')
      .eq('participant_id', participantId)
      .order('date', { ascending: false }).limit(3)

    const { data: medications } = await totalmedixSupabase
      .from('medications')
      .select('medication_name, dosage, frequency, schedule_times, active')
      .eq('participant_id', participantId)
      .eq('active', true)

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
      participant: participant ? { name: `${participant.first_name} ${participant.last_name}`, enrollment_date: participant.created_at?.split('T')[0] || null, status: participant.status } : null,
      attendance: (attendance || []).map(a => ({
        date: a.date, check_in: a.arrival_time, check_out: a.departure_time, status: a.status
      })),
      vitals: (vitals || []).map(v => ({
        date: v.date + (v.time ? `T${v.time}` : ''),
        bp: v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : null,
        temp: v.temp, pulse: v.pulse, pain: v.pain_level
      })),
      medications: (medications || []).map(m => ({ name: m.medication_name, dosage: m.dosage, frequency: m.frequency, times: m.schedule_times })),
      upcomingSchedule: appointments || []
    })
  } catch (error) {
    console.error('ADHC data fetch error:', error)
    return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 })
  }
}
