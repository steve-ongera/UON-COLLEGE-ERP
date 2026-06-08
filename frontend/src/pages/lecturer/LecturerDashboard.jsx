import { useState, useEffect } from 'react'
import { BookOpen, Users, ClipboardCheck, BarChart3 } from 'lucide-react'
import { dashboardAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function LecturerDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(() => toast.error('Failed to load dashboard')).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Lecturer Dashboard</h1>
        <p className="page-subtitle">
          {data?.lecturer?.department_name} &nbsp;·&nbsp; {data?.lecturer?.designation_display}
        </p>
      </div>

      <div className="stats-grid">
        {[
          { label:'Units This Semester', value: data?.units_this_sem || 0,  icon: BookOpen,        color:'#003087', bg:'var(--color-primary-10)' },
          { label:'Total Students',      value: data?.total_students || 0,  icon: Users,           color:'#16a34a', bg:'var(--color-success-light)' },
          { label:'Pending Marks',       value: data?.pending_marks  || 0,  icon: ClipboardCheck,  color:'#d97706', bg:'var(--color-warning-light)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card" style={{ '--stat-color': color, '--stat-icon-bg': bg }}>
            <div className="stat-card-top"><div className="stat-icon-wrap"><Icon size={22} /></div></div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Current Units */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">My Current Units</h3>
          <a href="/lecturer/units" className="btn btn-ghost btn-sm">View All</a>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {(data?.current_units || []).length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">No units assigned this semester</div></div>
          ) : (
            <table className="table">
              <thead><tr><th>Code</th><th>Unit Name</th><th>Room</th><th>Enrolled</th><th>Actions</th></tr></thead>
              <tbody>
                {(data?.current_units || []).map((u) => (
                  <tr key={u.id}>
                    <td><span className="table-mono">{u.unit_code}</span></td>
                    <td style={{ fontWeight: 500 }}>{u.unit_name}</td>
                    <td>{u.room || '—'}</td>
                    <td><span className="badge badge-accent">{u.enrolled_count}/{u.capacity}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <a href={`/lecturer/classlist?offering=${u.id}`} className="btn btn-ghost btn-sm">Class List</a>
                        <a href={`/lecturer/marks?offering=${u.id}`} className="btn btn-outline btn-sm">Enter Marks</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}