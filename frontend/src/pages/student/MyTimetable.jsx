import { useState, useEffect } from 'react'
import { studentsAPI, semestersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['mon','tue','wed','thu','fri','sat']
const DAY_LABELS = { mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thursday', fri:'Friday', sat:'Saturday' }
const COLORS = ['#003087','#16a34a','#d97706','#7c3aed','#0284c7','#dc2626']

export default function MyTimetable() {
  const { user } = useAuth()
  const [entries,  setEntries]  = useState([])
  const [semester, setSemester] = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      studentsAPI.list({ search: user.email }),
      semestersAPI.current(),
    ]).then(([d, sem]) => {
      const list = Array.isArray(d) ? d : d?.results || []
      const me   = list[0]
      setSemester(sem)
      if (!me) return []
      return studentsAPI.timetable(me.id)
    })
    .then((data) => setEntries(Array.isArray(data) ? data : []))
    .catch(() => toast.error('Failed to load timetable'))
    .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  // Group entries by day
  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = entries.filter((e) => e.day_of_week === d).sort((a,b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {})

  // Assign colours per unit
  const unitColors = {}
  let ci = 0
  entries.forEach((e) => {
    if (!unitColors[e.unit_code]) unitColors[e.unit_code] = COLORS[ci++ % COLORS.length]
  })

  const activeDays = DAYS.filter((d) => byDay[d].length > 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Timetable</h1>
        <p className="page-subtitle">{semester ? semester.name : 'Current semester schedule'}</p>
      </div>

      {entries.length === 0 ? (
        <div className="card card-padded">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={32} /></div>
            <div className="empty-state-title">No timetable entries</div>
            <p className="empty-state-desc">Your timetable will appear here once it's been configured for the current semester.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {activeDays.map((day) => (
            <div key={day} className="card">
              <div className="card-header">
                <h3 className="card-title">{DAY_LABELS[day]}</h3>
                <span className="badge badge-primary">{byDay[day].length} session{byDay[day].length > 1 ? 's' : ''}</span>
              </div>
              <div className="card-body" style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {byDay[day].map((entry) => {
                  const color = unitColors[entry.unit_code] || 'var(--color-primary)'
                  return (
                    <div key={entry.id} style={{
                      display: 'flex', gap: 'var(--sp-4)', alignItems: 'center',
                      padding: 'var(--sp-3) var(--sp-4)',
                      borderRadius: 'var(--radius-lg)', borderLeft: `4px solid ${color}`,
                      background: `${color}0d`,
                    }}>
                      {/* Time */}
                      <div style={{ minWidth: 110, textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color }}>
                          {entry.start_time?.slice(0,5)}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>to</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600, color }}>
                          {entry.end_time?.slice(0,5)}
                        </div>
                      </div>
                      {/* Divider */}
                      <div style={{ width: 1, height: 48, background: `${color}30` }} />
                      {/* Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 3 }}>
                          <span className="table-mono" style={{ color, fontSize: 'var(--text-sm)' }}>{entry.unit_code}</span>
                          <span className="badge badge-info" style={{ fontSize: 10 }}>{entry.session_type_display}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 3 }}>{entry.unit_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          {entry.lecturer_name} &nbsp;·&nbsp; {entry.venue}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}