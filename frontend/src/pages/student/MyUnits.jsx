import { useState, useEffect } from 'react'
import { studentsAPI, semestersAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { BookOpen, Clock, User, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyUnits() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [semester,    setSemester]    = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      studentsAPI.list({ search: user.email }),
      semestersAPI.current(),
    ]).then(([d, sem]) => {
      const list = Array.isArray(d) ? d : d?.results || []
      const me   = list[0]
      setSemester(sem)
      if (!me) return
      return studentsAPI.enrollments(me.id, { semester: sem?.id })
    })
    .then((data) => setEnrollments(data || []))
    .catch(() => toast.error('Failed to load units'))
    .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Units</h1>
        <p className="page-subtitle">
          {semester ? `${semester.name} — Registered units` : 'Registered units this semester'}
        </p>
      </div>

      {/* Semester info */}
      {semester && (
        <div className="alert alert-info" style={{ marginBottom: 'var(--sp-5)' }}>
          <BookOpen size={16} />
          <div>
            <strong>{semester.name}</strong>
            <span style={{ marginLeft: 12, fontSize: 'var(--text-xs)', opacity: 0.75 }}>
              {semester.start_date} → {semester.end_date}
            </span>
          </div>
        </div>
      )}

      {enrollments.length === 0 ? (
        <div className="card card-padded">
          <div className="empty-state">
            <div className="empty-state-icon"><BookOpen size={32} /></div>
            <div className="empty-state-title">No units registered</div>
            <p className="empty-state-desc">You have no units registered for the current semester. Contact your department to register.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--sp-4)' }}>
          {enrollments.map((en) => (
            <div key={en.id} className="card card-padded" style={{ borderTop: '3px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
                <span className="table-mono" style={{ fontSize: 'var(--text-sm)', background: 'var(--color-primary-10)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                  {en.unit_code}
                </span>
                <span className={`badge ${en.status === 'registered' ? 'badge-active' : 'badge-warning'}`}>
                  {en.status_display}
                </span>
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--sp-4)', lineHeight: 1.3 }}>
                {en.unit_name}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <User size={13} /> <span>{en.unit_offering?.lecturer_name || 'TBA'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <Clock size={13} /> <span>{en.semester_name}</span>
                </div>
              </div>
              <div className="info-divider" style={{ margin: 'var(--sp-3) 0' }} />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Enrolled: {new Date(en.enrolled_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}