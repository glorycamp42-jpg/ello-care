'use client'

import { useState, useEffect } from 'react'

interface ADHCData {
  connected: boolean
  participant: { name: string; enrollment_date: string; status: string } | null
  attendance: Array<{ date: string; check_in: string | null; check_out: string | null; status: string }>
  vitals: Array<{ date: string; bp: string | null; temp: number | null; pulse: number | null; pain: number | null }>
  medications: Array<{ name: string; dosage: string; frequency: string; times: string[] }>
  upcomingSchedule: Array<{ title: string; type: string; date: string; time: string; location: string }>
}

export default function ADHCActivityTab({ elderId }: { elderId: string }) {
  const [data, setData] = useState<ADHCData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'attendance' | 'vitals' | 'meds'>('attendance')

  useEffect(() => {
    async function fetchADHC() {
      try {
        const res = await fetch(`/api/adhc-data?elderId=${elderId}`)
        setData(await res.json())
      } catch (err) { console.error('ADHC data fetch error:', err) }
      finally { setLoading(false) }
    }
    fetchADHC()
  }, [elderId])

  if (loading) return (
    <div className="p-4 space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!data?.connected) return (
    <div className="p-6 text-center">
      <p className="text-gray-500 text-sm">ADHC 센터와 연결되지 않았습니다</p>
      <p className="text-gray-400 text-xs mt-1">센터에서 Ello Care 연결을 설정해야 합니다</p>
    </div>
  )

  const getDayName = (d: string) => ['일','월','화','수','목','금','토'][new Date(d).getDay()]

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">TM</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Total Medix ADHC</p>
          <p className="text-xs text-gray-500">등록일: {data.participant?.enrollment_date || '-'}</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${data.participant?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {data.participant?.status === 'active' ? '이용 중' : '비활성'}
        </span>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {([['attendance','출석'],['vitals','건강'],['meds','투약']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveSection(key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${activeSection === key ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'attendance' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 px-1">최근 7일</p>
          {data.attendance.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">출석 기록이 없습니다</p> :
            data.attendance.map((a, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl border p-3">
                <div className="w-10 text-center">
                  <p className="text-xs text-gray-400">{getDayName(a.date)}</p>
                  <p className="font-bold text-gray-800 text-sm">{new Date(a.date).getDate()}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${a.status === 'present' ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className="text-sm text-gray-700">{a.status === 'present' ? '출석' : '결석'}</span>
                  </div>
                  {a.check_in && <p className="text-xs text-gray-400">{a.check_in} ~ {a.check_out || '진행 중'}</p>}
                </div>
              </div>
            ))}
        </div>
      )}

      {activeSection === 'vitals' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 px-1">최근 측정</p>
          {data.vitals.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">바이탈 기록이 없습니다</p> :
            data.vitals.map((v, i) => (
              <div key={i} className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-400 mb-2">{new Date(v.date).toLocaleDateString('ko-KR')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {v.bp && <div><p className="text-xs text-gray-500">혈압</p><p className="font-semibold text-gray-800">{v.bp}</p></div>}
                  {v.temp && <div><p className="text-xs text-gray-500">체온</p><p className="font-semibold text-gray-800">{v.temp}°F</p></div>}
                  {v.pulse && <div><p className="text-xs text-gray-500">맥박</p><p className="font-semibold text-gray-800">{v.pulse} bpm</p></div>}
                  {v.pain != null && <div><p className="text-xs text-gray-500">통증</p><p className={`font-semibold ${v.pain >= 7 ? 'text-red-600' : v.pain >= 4 ? 'text-yellow-600' : 'text-green-600'}`}>{v.pain}/10</p></div>}
                </div>
              </div>
            ))}
        </div>
      )}

      {activeSection === 'meds' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 px-1">현재 투약 목록</p>
          {data.medications.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">투약 정보가 없습니다</p> :
            data.medications.map((m, i) => (
              <div key={i} className="bg-white rounded-xl border p-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div><p className="font-medium text-gray-800 text-sm">{m.name}</p><p className="text-xs text-gray-500">{m.dosage} / {m.frequency}</p></div>
              </div>
            ))}
        </div>
      )}

      {data.upcomingSchedule.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 px-1 mb-2">다가오는 일정</p>
          {data.upcomingSchedule.map((s, i) => (
            <div key={i} className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 mb-1">
              <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                <span className="text-blue-700 text-xs font-bold">{new Date(s.date).getDate()}</span>
              </div>
              <div><p className="text-sm font-medium text-gray-800">{s.title}</p><p className="text-xs text-gray-500">{s.time} {s.location && `| ${s.location}`}</p></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
        }
