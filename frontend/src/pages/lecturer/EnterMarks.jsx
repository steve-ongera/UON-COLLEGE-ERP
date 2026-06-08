import { useState, useEffect } from 'react'
import { offeringsAPI, unitAssessmentsAPI, marksAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Save, RefreshCw, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EnterMarks() {
  const { user } = useAuth()
  const [offerings,    setOfferings]    = useState([])
  const [assessments,  setAssessments]  = useState([])
  const [classlist,    setClasslist]    = useState([])
  const [existingMarks,setExistingMarks]= useState({})
  const [marks,        setMarks]        = useState({})   // { enrollment_id: score }
  const [selOffering,  setSelOffering]  = useState('')
  const [selAssessment,setSelAssessment]= useState('')
  const [loading,      setLoading]      = useState(false)
  const [saving,       setSaving]       = useState(false)

  // Load lecturer's unit offerings
  useEffect(() => {
    offeringsAPI.list().then((d) => setOfferings(Array.isArray(d) ? d : d?.results || []))
  }, [])

  // Load assessments when offering selected
  useEffect(() => {
    if (!selOffering) { setAssessments([]); setSelAssessment(''); return }
    offeringsAPI.assessments(selOffering).then((d) => setAssessments(Array.isArray(d) ? d : []))
  }, [selOffering])

  // Load classlist + existing marks when assessment selected
  useEffect(() => {
    if (!selOffering || !selAssessment) { setClasslist([]); setMarks({}); return }
    setLoading(true)
    Promise.all([
      offeringsAPI.classlist(selOffering),
      marksAPI.list({ unit_assessment: selAssessment }),
    ]).then(([cl, existMks]) => {
      const list   = Array.isArray(cl)      ? cl      : []
      const mklist = Array.isArray(existMks)? existMks : existMks?.results || []
      setClasslist(list)
      // Pre-fill existing marks
      const preMarks = {}
      mklist.forEach((m) => { preMarks[m.enrollment] = { score: m.score, is_absent: m.is_absent } })
      setExistingMarks(preMarks)
      const initMarks = {}
      list.forEach((s) => { initMarks[s.enrollment_id] = preMarks[s.enrollment_id]?.score ?? '' })
      setMarks(initMarks)
    }).finally(() => setLoading(false))
  }, [selOffering, selAssessment])

  const selectedAssessment = assessments.find((a) => a.id === selAssessment)

  const handleMarkChange = (enrollId, val) => {
    const max = Number(selectedAssessment?.max_score || 100)
    const num = parseFloat(val)
    if (val !== '' && (num < 0 || num > max)) return
    setMarks((p) => ({ ...p, [enrollId]: val }))
  }

  const handleSave = async () => {
    if (!selAssessment) return toast.error('Select an assessment first.')
    const marksData = classlist.map((s) => ({
      enrollment_id: s.enrollment_id,
      score:         marks[s.enrollment_id] ?? 0,
      is_absent:     marks[s.enrollment_id] === '' ? 'true' : 'false',
    }))
    setSaving(true)
    try {
      await marksAPI.bulk({ unit_assessment: selAssessment, marks: marksData })
      toast.success(`Marks saved for ${marksData.length} students.`)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save marks.')
    } finally { setSaving(false) }
  }

  const maxScore = Number(selectedAssessment?.max_score || 100)

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Enter Marks</h1>
          <p className="page-subtitle">Select a unit and assessment, then enter marks for each student.</p>
        </div>
        {classlist.length > 0 && (
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner spinner-sm"/> Saving…</> : <><Save size={15}/> Save All Marks</>}
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="card card-padded" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label required">Unit Offering</label>
            <select className="form-select" value={selOffering} onChange={(e) => setSelOffering(e.target.value)}>
              <option value="">Select unit…</option>
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.unit_code} — {o.unit_name} ({o.semester_name})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Assessment</label>
            <select className="form-select" value={selAssessment} onChange={(e) => setSelAssessment(e.target.value)} disabled={!selOffering}>
              <option value="">Select assessment…</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>{a.assessment_label} (Max: {a.max_score}, Weight: {a.weight_percentage}%)</option>
              ))}
            </select>
          </div>
        </div>
        {selectedAssessment && (
          <div className="alert alert-info" style={{ marginTop: 'var(--sp-4)' }}>
            <CheckCircle size={15} />
            <span>
              <strong>{selectedAssessment.assessment_label}</strong> — Max Score: <strong>{selectedAssessment.max_score}</strong>
              &nbsp;·&nbsp; Weight: <strong>{selectedAssessment.weight_percentage}%</strong>
              {selectedAssessment.due_date && <> &nbsp;·&nbsp; Due: <strong>{selectedAssessment.due_date}</strong></>}
            </span>
          </div>
        )}
      </div>

      {/* Marks Table */}
      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : classlist.length > 0 ? (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Reg. Number</th>
                <th>Student Name</th>
                <th>Programme</th>
                <th style={{ width: 160 }}>Score / {maxScore}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {classlist.map((s, i) => {
                const val       = marks[s.enrollment_id]
                const hasExisting = !!existingMarks[s.enrollment_id]
                const score     = parseFloat(val)
                const isValid   = val !== '' && !isNaN(score)
                const pct       = isValid ? (score / maxScore) * 100 : null
                return (
                  <tr key={s.enrollment_id}>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td><span className="table-mono">{s.reg_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                    <td style={{ fontSize: 12 }}>{s.programme}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                        <input
                          type="number"
                          min={0}
                          max={maxScore}
                          step="0.5"
                          className="form-input"
                          style={{ width: 90 }}
                          value={val}
                          placeholder="0"
                          onChange={(e) => handleMarkChange(s.enrollment_id, e.target.value)}
                        />
                        {isValid && (
                          <span style={{ fontSize: 11, color: pct >= 40 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                            {pct.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {hasExisting
                        ? <span className="badge badge-active">Saved</span>
                        : <span className="badge badge-inactive">Pending</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {/* Sticky save at bottom */}
          <div style={{ padding: 'var(--sp-4) var(--sp-5)', background: 'var(--color-surface-alt)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {classlist.length} students · {Object.values(marks).filter(v => v !== '').length} marks entered
            </span>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><div className="spinner spinner-sm"/>Saving…</> : <><Save size={15}/> Save All Marks</>}
            </button>
          </div>
        </div>
      ) : selAssessment ? (
        <div className="card card-padded">
          <div className="empty-state"><div className="empty-state-title">No students enrolled in this unit</div></div>
        </div>
      ) : null}
    </div>
  )
}