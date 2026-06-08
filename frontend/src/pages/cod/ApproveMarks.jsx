import { useState, useEffect } from 'react'
import { unitResultsAPI, semestersAPI, offeringsAPI } from '../../services/api'
import { CheckCircle, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ApproveMarks() {
  const [results,   setResults]   = useState([])
  const [offerings, setOfferings] = useState([])
  const [selOff,    setSelOff]    = useState('')
  const [loading,   setLoading]   = useState(false)
  const [approving, setApproving] = useState(false)

  useEffect(() => { offeringsAPI.list().then((d) => setOfferings(Array.isArray(d) ? d : d?.results || [])) }, [])

  const load = () => {
    if (!selOff) return
    setLoading(true)
    unitResultsAPI.list({ 'enrollment__unit_offering': selOff })
      .then((d) => setResults(Array.isArray(d) ? d : d?.results || []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [selOff])

  const approveOne = async (id) => {
    try {
      await unitResultsAPI.approve(id)
      toast.success('Result approved.')
      load()
    } catch { toast.error('Failed to approve.') }
  }

  const approveAll = async () => {
    if (!selOff) return
    setApproving(true)
    try {
      await unitResultsAPI.bulkApprove({ unit_offering: selOff })
      toast.success('All results approved.')
      load()
    } catch { toast.error('Bulk approval failed.') }
    finally { setApproving(false) }
  }

  const pending = results.filter((r) => !r.is_approved)

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Approve Marks</h1>
          <p className="page-subtitle">Review and approve unit results before releasing to students.</p>
        </div>
        {pending.length > 0 && (
          <button className="btn btn-primary" onClick={approveAll} disabled={approving}>
            {approving ? <><div className="spinner spinner-sm"/>Approving…</> : <><CheckSquare size={15}/> Approve All ({pending.length})</>}
          </button>
        )}
      </div>

      <div className="form-group" style={{ maxWidth: 420, marginBottom: 'var(--sp-5)' }}>
        <label className="form-label">Select Unit Offering</label>
        <select className="form-select" value={selOff} onChange={(e) => setSelOff(e.target.value)}>
          <option value="">Choose a unit offering…</option>
          {offerings.map((o) => <option key={o.id} value={o.id}>{o.unit_code} — {o.unit_name} ({o.semester_name})</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : selOff && (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Reg. No</th><th>Student</th><th>CAT</th><th>Exam</th><th>Total</th><th>Grade</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {results.length === 0
                ? <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-title">No results found</div></div></td></tr>
                : results.map((r) => (
                <tr key={r.id} style={{ background: r.is_approved ? 'var(--color-success-light)' : '' }}>
                  <td><span className="table-mono">{r.reg_number}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                  <td>{Number(r.cat_total  || 0).toFixed(1)}</td>
                  <td>{Number(r.exam_score || 0).toFixed(1)}</td>
                  <td><strong>{Number(r.total_score || 0).toFixed(1)}</strong></td>
                  <td><span className={`badge badge-grade-${(r.grade||'E').replace('+','')}`}>{r.grade || '—'}</span></td>
                  <td>
                    {r.is_approved
                      ? <span className="badge badge-active">Approved</span>
                      : <span className="badge badge-warning">Pending</span>}
                  </td>
                  <td>
                    {!r.is_approved && (
                      <button className="btn btn-success btn-sm" onClick={() => approveOne(r.id)}>
                        <CheckCircle size={13}/> Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}