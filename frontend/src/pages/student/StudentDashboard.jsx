import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, DollarSign, Calendar, Award, AlertCircle, CheckCircle } from 'lucide-react'
import { dashboardAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const GPAColor = (gpa) => {
  if (gpa >= 3.5) return 'gpa-excellent'
  if (gpa >= 3.0) return 'gpa-good'
  if (gpa >= 2.0) return 'gpa-warning'
  return 'gpa-danger'
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  const student = data?.student
  const gpa     = data?.cumulative_gpa || 0
  const latestGpa = data?.latest_gpa || 0

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
        borderRadius: 'var(--radius-xl)', padding: 'var(--sp-6) var(--sp-8)',
        color: '#fff', marginBottom: 'var(--sp-6)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 180, height: 180,
          border: '1px solid rgba(200,169,81,0.2)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 30, top: 30, width: 100, height: 100,
          border: '1px solid rgba(200,169,81,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>Welcome back,</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 8 }}>
            {user?.first_name} {user?.last_name}
          </h2>
          <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>📋 {student?.reg_number}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>📚 {student?.programme_code}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>📅 Year {data?.current_year} · Semester {data?.current_semester}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card" style={{ '--stat-color': 'var(--color-primary)', '--stat-icon-bg': 'var(--color-primary-10)' }}>
          <div className="stat-card-top">
            <div className="stat-icon-wrap"><BookOpen size={22} /></div>
          </div>
          <div className="stat-value">{data?.current_units?.length || 0}</div>
          <div className="stat-label">Units This Semester</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#7c3aed', '--stat-icon-bg': '#f5f3ff' }}>
          <div className="stat-card-top">
            <div className="stat-icon-wrap"><TrendingUp size={22} /></div>
          </div>
          <div className={`stat-value ${GPAColor(latestGpa)}`}>{Number(latestGpa).toFixed(2)}</div>
          <div className="stat-label">Semester GPA</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#0284c7', '--stat-icon-bg': '#f0f9ff' }}>
          <div className="stat-card-top">
            <div className="stat-icon-wrap"><Award size={22} /></div>
          </div>
          <div className={`stat-value ${GPAColor(gpa)}`}>{Number(gpa).toFixed(2)}</div>
          <div className="stat-label">Cumulative GPA</div>
        </div>

        <div className="stat-card" style={{
          '--stat-color': data?.is_fee_cleared ? 'var(--color-success)' : 'var(--color-danger)',
          '--stat-icon-bg': data?.is_fee_cleared ? 'var(--color-success-light)' : 'var(--color-danger-light)',
        }}>
          <div className="stat-card-top">
            <div className="stat-icon-wrap"><DollarSign size={22} /></div>
          </div>
          <div className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>
            {data?.is_fee_cleared ? 'Cleared' : `KES ${Number(data?.fee_balance || 0).toLocaleString()}`}
          </div>
          <div className="stat-label">Fee Balance</div>
        </div>
      </div>

      {/* Current units + progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--sp-4)' }}>
        {/* Current Units */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Current Units</h3>
            <a href="/student/units" className="btn btn-ghost btn-sm">View All</a>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {data?.current_units?.length === 0 ? (
              <div className="empty-state"><div className="empty-state-title">No units registered</div></div>
            ) : (
              <table className="table">
                <thead><tr><th>Code</th><th>Unit Name</th><th>Lecturer</th><th>Room</th></tr></thead>
                <tbody>
                  {(data?.current_units || []).map((u) => (
                    <tr key={u.id}>
                      <td><span className="table-mono">{u.unit_code}</span></td>
                      <td style={{ fontWeight: 500 }}>{u.unit_name}</td>
                      <td style={{ fontSize: 12 }}>{u.lecturer_name}</td>
                      <td style={{ fontSize: 12 }}>{u.room || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {/* Academic Progress */}
          <div className="card card-padded">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>
              Academic Progress
            </h4>
            <div style={{ marginBottom: 'var(--sp-2)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              <span>Year {data?.current_year} of {student?.total_semesters ? Math.ceil(student.total_semesters / 2) : '—'}</span>
              <span>{student?.progress_percent || 0}%</span>
            </div>
            <div className="progress">
              <div className="progress-bar accent" style={{ width: `${student?.progress_percent || 0}%` }} />
            </div>
            <div className="info-divider" />
            <div className="info-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="info-item">
                <div className="info-label">Programme</div>
                <div className="info-value" style={{ fontSize: 12 }}>{student?.programme_code}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Intake</div>
                <div className="info-value" style={{ fontSize: 12 }}>{student?.intake_name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Status</div>
                <div className="info-value">
                  <span className={`badge ${student?.status === 'active' ? 'badge-active' : 'badge-warning'}`}>
                    {student?.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Status */}
          <div className="card card-padded">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>
              Fee Status
            </h4>
            {data?.is_fee_cleared ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-success)' }}>
                <CheckCircle size={18} />
                <span style={{ fontWeight: 600 }}>Fees Cleared</span>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)', marginBottom: 12 }}>
                  <AlertCircle size={18} />
                  <span style={{ fontWeight: 600 }}>Outstanding Balance</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--color-danger)' }}>
                  KES {Number(data?.fee_balance || 0).toLocaleString()}
                </div>
                <a href="/student/fees" className="btn btn-danger" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>
                  View Fee Details
                </a>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card card-padded">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>
              Quick Links
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
              {[
                { label: 'View Timetable', href: '/student/timetable' },
                { label: 'My Results',     href: '/student/results' },
                { label: 'My Documents',   href: '/student/documents' },
                { label: 'My Profile',     href: '/student/profile' },
              ].map(({ label, href }) => (
                <a key={href} href={href} className="btn btn-ghost" style={{ justifyContent: 'flex-start', fontSize: 13 }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}