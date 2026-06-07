import { useState, useEffect } from 'react'
import { Users, GraduationCap, BookOpen, Building2, DollarSign, TrendingUp, ClipboardCheck, School } from 'lucide-react'
import { dashboardAPI } from '../../services/api'

const STAT_CARDS = [
  { key: 'active_students',   label: 'Active Students',   icon: GraduationCap, color: '#003087', bg: 'rgba(0,48,135,0.1)' },
  { key: 'total_lecturers',   label: 'Lecturers',         icon: Users,         color: '#16a34a', bg: '#f0fdf4' },
  { key: 'total_programmes',  label: 'Programmes',        icon: BookOpen,      color: '#d97706', bg: '#fffbeb' },
  { key: 'total_departments', label: 'Departments',       icon: Building2,     color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'total_units',       label: 'Units',             icon: School,        color: '#0284c7', bg: '#f0f9ff' },
  { key: 'revenue_this_year', label: 'Revenue (KES)',     icon: DollarSign,    color: '#16a34a', bg: '#f0fdf4', format: 'currency' },
  { key: 'pending_unit_results', label: 'Pending Approvals', icon: ClipboardCheck, color: '#dc2626', bg: '#fef2f2' },
  { key: 'enrollments_total', label: 'Enrollments',       icon: TrendingUp,    color: '#0ea5e9', bg: '#f0f9ff' },
]

const fmt = (key, val, format) => {
  if (format === 'currency') return `KES ${Number(val || 0).toLocaleString()}`
  return Number(val || 0).toLocaleString()
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get().then(setStats).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">
          System overview — {stats?.current_year || '—'} &nbsp;·&nbsp; {stats?.current_semester || '—'}
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : (
        <div className="stats-grid">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, format }) => (
            <div key={key} className="stat-card" style={{ '--stat-color': color, '--stat-icon-bg': bg }}>
              <div className="stat-card-top">
                <div className="stat-icon-wrap"><Icon size={22} /></div>
              </div>
              <div className="stat-value">{fmt(key, stats?.[key], format)}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Info row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        <div className="card card-padded">
          <div className="card-title" style={{ marginBottom: 'var(--sp-4)' }}>Academic Status</div>
          <div className="info-grid">
            {[
              { label: 'Current Year',     value: stats?.current_year     || 'Not set' },
              { label: 'Current Semester', value: stats?.current_semester || 'Not set' },
              { label: 'Total Faculties',  value: stats?.total_faculties  || 0 },
              { label: 'Total Students',   value: stats?.total_students   || 0 },
              { label: 'Graduated',        value: stats?.graduated_students || 0 },
              { label: 'Pending Results',  value: stats?.pending_semester_results || 0 },
            ].map(({ label, value }) => (
              <div key={label} className="info-item">
                <div className="info-label">{label}</div>
                <div className="info-value">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-padded">
          <div className="card-title" style={{ marginBottom: 'var(--sp-4)' }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {[
              { label: 'Manage Users',        href: '/admin/users' },
              { label: 'Manage Programmes',   href: '/admin/programmes' },
              { label: 'Set Academic Year',   href: '/admin/academic-years' },
              { label: 'Configure Intakes',   href: '/admin/intakes' },
              { label: 'System Settings',     href: '/admin/settings' },
            ].map(({ label, href }) => (
              <a key={href} href={href} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}