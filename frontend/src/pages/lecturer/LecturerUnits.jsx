import { useState, useEffect } from 'react'
import { offeringsAPI } from '../../services/api'
import { BookOpen, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LecturerUnits() {
  const [units,   setUnits]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    offeringsAPI.list()
      .then((d) => setUnits(Array.isArray(d) ? d : d?.results || []))
      .catch(() => toast.error('Failed to load units'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Units</h1>
        <p className="page-subtitle">All unit offerings assigned to you across semesters.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--sp-4)' }}>
        {units.length === 0 ? (
          <div className="card card-padded">
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={32} /></div>
              <div className="empty-state-title">No units assigned</div>
            </div>
          </div>
        ) : units.map((u) => (
          <div key={u.id} className="card card-padded" style={{ borderTop: '3px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
              <span className="table-mono" style={{ background: 'var(--color-primary-10)', padding: '2px 8px', borderRadius: 4, color: 'var(--color-primary)' }}>
                {u.unit_code}
              </span>
              <span className="badge badge-accent">{u.enrolled_count}/{u.capacity}</span>
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 'var(--sp-2)', lineHeight: 1.3 }}>
              {u.unit_name}
            </h4>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-4)' }}>
              {u.semester_name} &nbsp;·&nbsp; {u.credit_hours} credit hours &nbsp;·&nbsp; Room: {u.room || 'TBA'}
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <a href={`/lecturer/classlist?offering=${u.id}`} className="btn btn-ghost btn-sm flex-1" style={{ justifyContent: 'center' }}>
                <Users size={13} /> Class List
              </a>
              <a href={`/lecturer/marks?offering=${u.id}`} className="btn btn-outline btn-sm flex-1" style={{ justifyContent: 'center' }}>
                Enter Marks
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}