'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }

    // Lookup role from users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = userData?.role || data.user.user_metadata?.role || 'elder'

    if (role === 'family') {
      window.location.href = '/family'
    } else {
      window.location.href = '/'
    }
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) setError(error.message)
  }

  return (
    <div style={{ padding: 40, maxWidth: 400, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Ello Care 로그인</h1>
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="이메일"
        type="email"
        style={{ display: 'block', width: '100%', padding: 12, marginBottom: 12, fontSize: 16, boxSizing: 'border-box' }}
      />
      <input
        value={password}
        onChange={e => setPassword(e.target.value)}
        type="password"
        placeholder="비밀번호"
        style={{ display: 'block', width: '100%', padding: 12, marginBottom: 16, fontSize: 16, boxSizing: 'border-box' }}
      />
      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
      <button
        type="button"
        onClick={handleLogin}
        disabled={loading}
        style={{ display: 'block', width: '100%', padding: 14, fontSize: 18, background: loading ? '#7aacf0' : '#1B6FE8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#ddd' }} />
        <span style={{ color: '#aaa', fontSize: 14 }}>또는</span>
        <div style={{ flex: 1, height: 1, background: '#ddd' }} />
      </div>
      <button
        type="button"
        onClick={handleGoogle}
        style={{ display: 'block', width: '100%', padding: 14, fontSize: 16, background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' }}
      >
        구글로 로그인
      </button>
      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#888' }}>
        <a href="/login/signup" style={{ color: '#1B6FE8', fontWeight: 700, textDecoration: 'none' }}>회원가입</a>
        {' | '}
        <a href="/family/login" style={{ color: '#888', textDecoration: 'underline' }}>가족 로그인</a>
      </p>
    </div>
  )
}
