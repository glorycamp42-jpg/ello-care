'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function LoginPage() {
  const [mode, setMode] = useState<'pin' | 'email'>('pin')

  // PIN 상태
  const [pin, setPin] = useState(['', '', '', ''])
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError] = useState('')

  // 이메일 상태
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  function handlePinChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return // 숫자만
    const newPin = [...pin]
    newPin[index] = value.slice(-1) // 1자리만
    setPin(newPin)
    setPinError('')

    // 다음 칸으로 자동 이동
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus()
    }

    // 4자리 다 입력되면 자동 로그인
    if (value && index === 3) {
      const fullPin = newPin.join('')
      if (fullPin.length === 4) {
        handlePinLogin(fullPin)
      }
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus()
    }
  }

  async function handlePinLogin(fullPin?: string) {
    const pinCode = fullPin || pin.join('')
    if (pinCode.length < 4) { setPinError('PIN 4자리를 입력해주세요'); return }

    setPinLoading(true)
    setPinError('')

    try {
      const res = await fetch('/api/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinCode })
      })
      const data = await res.json()

      if (!data.success) {
        setPinError(data.error || 'PIN 번호가 올바르지 않습니다')
        setPin(['', '', '', ''])
        pinRefs[0].current?.focus()
        setPinLoading(false)
        return
      }

      // verifyOtp로 세션 생성
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token,
        type: 'magiclink',
      })

      if (verifyError) {
        setPinError('로그인 처리 중 오류가 발생했습니다')
        setPinLoading(false)
        return
      }

      window.location.href = '/'
    } catch {
      setPinError('서버 연결에 실패했습니다')
      setPinLoading(false)
    }
  }

  async function handleEmailLogin() {
    setEmailError('')
    setEmailLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setEmailError(error.message); setEmailLoading(false); return }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = userData?.role || data.user.user_metadata?.role || 'elder'
    window.location.href = role === 'family' ? '/family' : '/'
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) setEmailError(error.message)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '40px 32px', maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 28 }}>
            💜
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Ello Care</h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>AI 말벗 서비스</p>
        </div>

        {/* 모드 탭 */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          <button
            onClick={() => setMode('pin')}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', background: mode === 'pin' ? '#fff' : 'transparent', color: mode === 'pin' ? '#667eea' : '#888', boxShadow: mode === 'pin' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}
          >
            PIN 로그인
          </button>
          <button
            onClick={() => setMode('email')}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', background: mode === 'email' ? '#fff' : 'transparent', color: mode === 'email' ? '#667eea' : '#888', boxShadow: mode === 'email' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}
          >
            이메일
          </button>
        </div>

        {mode === 'pin' ? (
          <>
            <p style={{ textAlign: 'center', fontSize: 16, color: '#555', marginBottom: 24 }}>
              시설에서 받은 PIN 번호를<br />입력해주세요
            </p>

            {/* PIN 입력 칸 4개 */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  ref={pinRefs[i]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  disabled={pinLoading}
                  style={{
                    width: 60, height: 72, textAlign: 'center', fontSize: 28, fontWeight: 700,
                    border: `2px solid ${pinError ? '#ef4444' : digit ? '#667eea' : '#d1d5db'}`,
                    borderRadius: 16, outline: 'none', color: '#1a1a2e',
                    background: pinLoading ? '#f9fafb' : '#fff',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102,126,234,0.15)' }}
                  onBlur={(e) => { e.target.style.borderColor = digit ? '#667eea' : '#d1d5db'; e.target.style.boxShadow = 'none' }}
                />
              ))}
            </div>

            {pinError && <p style={{ color: '#ef4444', textAlign: 'center', fontSize: 14, marginBottom: 12 }}>{pinError}</p>}

            {pinLoading && (
              <p style={{ textAlign: 'center', color: '#667eea', fontSize: 14 }}>로그인 중...</p>
            )}
          </>
        ) : (
          <>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일"
              type="email"
              style={{ display: 'block', width: '100%', padding: 14, marginBottom: 12, fontSize: 16, border: '1px solid #d1d5db', borderRadius: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="비밀번호"
              style={{ display: 'block', width: '100%', padding: 14, marginBottom: 16, fontSize: 16, border: '1px solid #d1d5db', borderRadius: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            {emailError && <p style={{ color: '#ef4444', marginBottom: 12, fontSize: 14 }}>{emailError}</p>}
            <button
              type="button"
              onClick={handleEmailLogin}
              disabled={emailLoading}
              style={{ display: 'block', width: '100%', padding: 14, fontSize: 17, fontWeight: 600, background: emailLoading ? '#a5b4fc' : 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}
            >
              {emailLoading ? '로그인 중...' : '로그인'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ color: '#aaa', fontSize: 13 }}>또는</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              style={{ display: 'block', width: '100%', padding: 14, fontSize: 15, background: '#fff', color: '#444', border: '1px solid #d1d5db', borderRadius: 12, cursor: 'pointer' }}
            >
              구글로 로그인
            </button>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
          <a href="/login/signup" style={{ color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>회원가입</a>
          {' | '}
          <a href="/family/login" style={{ color: '#888', textDecoration: 'underline' }}>가족 로그인</a>
        </div>
      </div>
    </div>
  )
}
