'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = '/'
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
    </div>
  )
}
