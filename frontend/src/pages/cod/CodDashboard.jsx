import { useState, useEffect } from 'react'
import { dashboardAPI } from '../../services/api'
import { Users, BookOpen, ClipboardCheck, UserCog } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CodDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Department Dashboard</h1>
        <p className="page-subtitle">{data?.department || 'Your department overview'}</p>
      </div>

      <div className="stats-grid">
        {[
          { label:'Active Students',   value: data?.total_students   || 0, icon: Users,         color:'#003087', bg:'var(--color-primary-10)' },
          { label:'Lecturers',         value: data?.total_lecturers  || 0, icon: UserCog,        color:'#16a34a', bg:'var(--color-success-light)' },
          { label:'Programmes',        value: data?.total_programmes || 0, icon: BookOpen,       color:'#7c3aed', bg:'#f5f3ff' },
          { label:'Pending Approvals', value: data?.pending_approvals|| 0, icon: ClipboardCheck, color:'#dc2626', bg:'var(--color-danger-light)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card" style={{ '--stat-color': color, '--stat-icon-bg': bg }}>
            <div className="stat-card-top"><div className="stat-icon-wrap"><Icon size={22} /></div></div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
        <div className="card card-padded">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-4)' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {[
              { label:'Approve Marks',         href:'/cod/approve-marks' },
              { label:'View Department Students', href:'/cod/students' },
              { label:'Manage Programmes',     href:'/cod/programmes' },
              { label:'Staff Management',      href:'/cod/staff' },
            ].map(({ label, href }) => (
              <a key={href} href={href} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>{label}</a>
            ))}
          </div>
        </div>
        <div className="card card-padded">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-4)' }}>Pending Actions</h3>
          {data?.pending_approvals > 0 ? (
            <div className="alert alert-warning">
              <ClipboardCheck size={16} />
              <div>
                <strong>{data.pending_approvals} unit results</strong> awaiting your approval.
                <a href="/cod/approve-marks" className="btn btn-warning btn-sm" style={{ marginLeft: 'var(--sp-3)' }}>Review Now</a>
              </div>
            </div>
          ) : (
            <div className="alert alert-success"><ClipboardCheck size={16} /><span>All results are approved. No pending actions.</span></div>
          )}
        </div>
      </div>
    </div>
  )
}