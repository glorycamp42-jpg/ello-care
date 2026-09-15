/**
 * API: /api/pin-login
 * 어르신 PIN 로그인
 * 1. TotalMedix DB에서 PIN 검증 → participant 정보 확인
 * 2. Ello Care DB에서 해당 사용자 세션 생성
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Lazy clients — never crash at import time if an env var is missing
function getClients() {
  const tmUrl = process.env.TOTALMEDIX_SUPABASE_URL
  const tmKey = process.env.TOTALMEDIX_SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!tmUrl || !tmKey || !url || !key) return null
  const opts = { auth: { autoRefreshToken: false, persistSession: false } }
  return { totalmedixAdmin: createClient(tmUrl, tmKey, opts), elloAdmin: createClient(url, key, opts) }
}

// In-memory brute-force guard: counts only FAILED PIN attempts per IP (successful logins are free,
// since many elders at one day-care center share a single NAT IP). Resets on cold start.
const failures = new Map<string, { count: number; resetAt: number }>()
const MAX_FAILS = 25
function rateLimited(ip: string): boolean {
  const rec = failures.get(ip)
  return !!rec && rec.resetAt > Date.now() && rec.count >= MAX_FAILS
}
function recordFailure(ip: string) {
  const now = Date.now()
  const rec = failures.get(ip)
  if (!rec || rec.resetAt < now) failures.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 })
  else rec.count += 1
}

export async function POST(req: NextRequest) {
  try {
    const clients = getClients()
    if (!clients) return NextResponse.json({ error: '서버 설정 오류' }, { status: 503 })
    const { totalmedixAdmin, elloAdmin } = clients

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (rateLimited(ip)) {
      return NextResponse.json({ error: '시도 횟수를 초과했습니다. 10분 후 다시 시도해주세요' }, { status: 429 })
    }

    const { pin } = await req.json()

    if (!pin || typeof pin !== 'string' || pin.length < 4) {
      return NextResponse.json({ error: 'PIN 번호를 입력해주세요' }, { status: 400 })
    }

    // 0. 가족이 발급한 PIN (ello-care elder_pins) 먼저 확인
    const { data: famPin } = await elloAdmin.from('elder_pins').select('elder_id').eq('pin', pin).maybeSingle()
    if (famPin?.elder_id) {
      const { data: elderUser } = await elloAdmin.auth.admin.getUserById(famPin.elder_id)
      const email = elderUser?.user?.email
      if (!email) return NextResponse.json({ error: '계정을 찾을 수 없어요' }, { status: 404 })
      const { data: linkData, error: genError } = await elloAdmin.auth.admin.generateLink({ type: 'magiclink', email })
      if (genError || !linkData) return NextResponse.json({ error: '로그인 처리 중 오류가 발생했습니다' }, { status: 500 })
      return NextResponse.json({ success: true, email, token: linkData.properties?.email_otp, name: elderUser?.user?.user_metadata?.name || '어르신', userId: famPin.elder_id })
    }

    // 1. TotalMedix DB에서 PIN으로 participant_ello_link 조회
    const { data: link, error: linkError } = await totalmedixAdmin
      .from('participant_ello_link')
      .select('ello_user_id, participant_id, status')
      .eq('pin', pin)
      .eq('status', 'active')
      .single()

    if (linkError || !link) {
      recordFailure(ip)
      return NextResponse.json({ error: 'PIN 번호가 올바르지 않습니다' }, { status: 401 })
    }

    // 2. TotalMedix에서 사용자 정보 가져오기
    const { data: tmUser } = await totalmedixAdmin.auth.admin.getUserById(link.ello_user_id)
    const participantName = tmUser?.user?.user_metadata?.name || '어르신'
    const elderEmail = `participant_${link.participant_id}@ellocare.local`

    // 3. Ello Care에서 해당 사용자 찾거나 생성 (public.users.email 로 조회 — listUsers 50건 페이지 한계 회피)
    let elloUser: { id: string } | null = null
    const { data: existingRow } = await elloAdmin.from('users').select('id').eq('email', elderEmail).maybeSingle()
    if (existingRow) {
      elloUser = { id: existingRow.id }
    } else {
      // fallback: page through auth users
      let page = 1
      while (!elloUser) {
        const { data: pageData } = await elloAdmin.auth.admin.listUsers({ page, perPage: 200 })
        const found = pageData?.users?.find(u => u.email === elderEmail)
        if (found) elloUser = { id: found.id }
        if (!pageData?.users?.length || pageData.users.length < 200) break
        page += 1
      }
    }

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
      elloUser = { id: newUser.user.id }

      // public.users 테이블에도 추가 (handle_new_user 트리거가 없을 때 대비)
      await elloAdmin.from('users').upsert({ id: elloUser.id, email: elderEmail, full_name: participantName, role: 'elder' })
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
      userId: elloUser.id,
    })
  } catch (error) {
    console.error('PIN login error:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
