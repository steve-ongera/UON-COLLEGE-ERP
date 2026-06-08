import { useState, useEffect } from 'react'
import { reportsAPI, studentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Award, TrendingUp, BookOpen, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const GRADE_BADGE = {
  'A': 'badge-grade-A', 'B+': 'badge-grade-B', 'B': 'badge-grade-B',
  'C+': 'badge-grade-C', 'C': 'badge-grade-C',
  'D+': 'badge-grade-D', 'D': 'badge-grade-D', 'E': 'badge-grade-E',
}

export default function MyResults() {
  const { user } = useAuth()
  const [transcript, setTranscript] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [studentId,  setStudentId]  = useState(null)

  useEffect(() => {
    if (!user) return
    studentsAPI.list({ search: user.email })
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.results || []
        const me   = list[0]
        if (me) {
          setStudentId(me.id)
          return reportsAPI.transcript(me.id)
        }
        throw new Error('Student profile not found')
      })
      .then(setTranscript)
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  const cumulativeGpa = transcript?.cumulative_gpa || 0

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Academic Transcript</h1>
        <p className="page-subtitle">Your full academic record across all semesters.</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--sp-6)' }}>
        <div className="stat-card" style={{ '--stat-color': '#7c3aed', '--stat-icon-bg': '#f5f3ff' }}>
          <div className="stat-card-top"><div className="stat-icon-wrap"><TrendingUp size={22} /></div></div>
          <div className="stat-value" style={{ color: Number(cumulativeGpa) >= 3 ? 'var(--color-success)' : Number(cumulativeGpa) >= 2 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
            {Number(cumulativeGpa).toFixed(2)}
          </div>
          <div className="stat-label">Cumulative GPA</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--color-primary)', '--stat-icon-bg': 'var(--color-primary-10)' }}>
          <div className="stat-card-top"><div className="stat-icon-wrap"><BookOpen size={22} /></div></div>
          <div className="stat-value">{transcript?.semester_results?.length || 0}</div>
          <div className="stat-label">Semesters Completed</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--color-success)', '--stat-icon-bg': 'var(--color-success-light)' }}>
          <div className="stat-card-top"><div className="stat-icon-wrap"><Award size={22} /></div></div>
          <div className="stat-value">
            {(transcript?.semester_results || []).reduce((s, r) => s + (r.credits_earned || 0), 0)}
          </div>
          <div className="stat-label">Credits Earned</div>
        </div>
      </div>

      {/* Semester-by-semester results */}
      {(transcript?.semester_results || []).length === 0 ? (
        <div className="card card-padded">
          <div className="empty-state">
            <div className="empty-state-icon"><Award size={32} /></div>
            <div className="empty-state-title">No results yet</div>
            <p className="empty-state-desc">Your results will appear here once they are released.</p>
          </div>
        </div>
      ) : (
        (transcript?.semester_results || []).map((sem) => (
          <div key={sem.id} className="transcript-semester">
            {/* Semester header */}
            <div className="transcript-semester-header">
              <div>
                <div className="transcript-sem-name">{sem.semester_name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                  {sem.units_passed} passed &nbsp;·&nbsp; {sem.units_failed} failed &nbsp;·&nbsp;
                  {sem.credits_earned}/{sem.credits_attempted} credits
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.55)', marginBottom: 2 }}>Semester GPA</div>
                <div className="transcript-gpa">{Number(sem.gpa).toFixed(2)}</div>
              </div>
            </div>

            {/* Unit results table */}
            <table className="table" style={{ borderRadius: 0 }}>
              <thead>
                <tr>
                  <th>Unit Code</th>
                  <th>Unit Name</th>
                  <th>CAT</th>
                  <th>Exam</th>
                  <th>Total</th>
                  <th>Grade</th>
                  <th>Points</th>
                  <th>Credits</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(sem.unit_results || []).map((ur) => (
                  <tr key={ur.id}>
                    <td><span className="table-mono">{ur.unit_code}</span></td>
                    <td style={{ fontWeight: 500 }}>{ur.unit_name}</td>
                    <td>{Number(ur.cat_total  || 0).toFixed(1)}</td>
                    <td>{Number(ur.exam_score || 0).toFixed(1)}</td>
                    <td><strong>{Number(ur.total_score || 0).toFixed(1)}</strong></td>
                    <td>
                      <span className={`badge ${GRADE_BADGE[ur.grade] || 'badge-inactive'}`}>
                        {ur.grade || '—'}
                      </span>
                    </td>
                    <td>{Number(ur.grade_points || 0).toFixed(1)}</td>
                    <td>{ur.credit_hours}</td>
                    <td>
                      {ur.status === 'pass'
                        ? <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14}/> Pass</span>
                        : <span style={{ color: 'var(--color-danger)',  display: 'flex', alignItems: 'center', gap: 4 }}><XCircle   size={14}/> Fail</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Semester footer */}
            <div style={{
              padding: 'var(--sp-3) var(--sp-5)',
              background: 'var(--color-surface-alt)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between',
              fontSize: 'var(--text-sm)',
            }}>
              <span>
                <strong>Semester Status:</strong>{' '}
                <span className={`badge ${sem.status === 'pass' ? 'badge-active' : sem.status === 'supplementary' ? 'badge-warning' : 'badge-danger'}`}>
                  {sem.status_display || sem.status}
                </span>
              </span>
              <span><strong>Cumulative GPA:</strong> {Number(sem.cumulative_gpa).toFixed(2)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}