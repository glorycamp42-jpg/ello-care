/**
 * API: /api/pin-login
 * 어르신 PIN 로그인
 * 1. TotalMedix DB에서 PIN 검증 → participant 정보 확인
 * 2. Ello Care DB에서 해당 사용자 세션 생성
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// TotalMedix Supabase (PIN 조회용)
const totalmedixAdmin = createClient(
  process.env.TOTALMEDIX_SUPABASE_URL!,
  process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY!
)

// Ello Care Supabase (세션 생성용)
const elloAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()

    if (!pin || pin.length < 4) {
      return NextResponse.json({ error: 'PIN 번호를 입력해주세요' }, { status: 400 })
    }

    // 1. TotalMedix DB에서 PIN으로 participant_ello_link 조회
    const { data: link, error: linkError } = await totalmedixAdmin
      .from('participant_ello_link')
      .select('ello_user_id, participant_id, status')
      .eq('pin', pin)
      .eq('status', 'active')
      .single()

    if (linkError || !link) {
      return NextResponse.json({ error: 'PIN 번호가 올바르지 않습니다' }, { status: 401 })
    }

    // 2. TotalMedix에서 사용자 정보 가져오기
    const { data: tmUser } = await totalmedixAdmin.auth.admin.getUserById(link.ello_user_id)
    const participantName = tmUser?.user?.user_metadata?.name || '어르신'
    const elderEmail = `participant_${link.participant_id}@ellocare.local`

    // 3. Ello Care에서 해당 사용자 찾거나 생성
    const { data: existingUsers } = await elloAdmin.auth.admin.listUsers()
    let elloUser = existingUsers?.users?.find(u => u.email === elderEmail)

    if (!elloUser) {
      // Ello Care에 계정 생성
      const { data: newUser, error: createErr } = await elloAdmin.auth.admin.createUser({
        email: elderEmail,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { name: participantName, role: 'elder', source: 'totalmedix_pin', participant_id: link.participant_id }
      })
      if (createErr || !newUser?.user) {
        return NextResponse.json({ error: '계정 생성 실패' }, { status: 500 })
      }
      elloUser = newUser.user

      // profiles 테이블에도 추가
      await elloAdmin.from('profiles').upsert({ id: elloUser.id, name: participantName, role: 'elder' })
    }

    // 4. 매직 링크 토큰 생성 (세션 생성용)
    const { data: linkData, error: genError } = await elloAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: elderEmail,
    })

    if (genError || !linkData) {
      return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email: elderEmail,
      token: linkData.properties?.email_otp,
      name: participantName,
    })
  } catch (error) {
    console.error('PIN login error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
