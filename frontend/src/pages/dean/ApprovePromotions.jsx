import { useState, useEffect } from 'react'
import { promotionsAPI, intakesAPI, semestersAPI } from '../../services/api'
import { TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ApprovePromotions() {
  const [promotions, setPromotions] = useState([])
  const [intakes,    setIntakes]    = useState([])
  const [semesters,  setSemesters]  = useState([])
  const [form,       setForm]       = useState({ intake_id:'', to_semester_id:'' })
  const [loading,    setLoading]    = useState(true)
  const [running,    setRunning]    = useState(false)

  useEffect(() => {
    Promise.all([
      promotionsAPI.list(),
      intakesAPI.list({ is_active: true }),
      semestersAPI.list(),
    ]).then(([p, i, s]) => {
      setPromotions(Array.isArray(p) ? p : p?.results || [])
      setIntakes(Array.isArray(i) ? i : i?.results || [])
      setSemesters(Array.isArray(s) ? s : s?.results || [])
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])

  const runBulkPromotion = async () => {
    if (!form.intake_id || !form.to_semester_id) return toast.error('Select intake and target semester.')
    setRunning(true)
    try {
      const result = await promotionsAPI.bulk({ intake_id: form.intake_id, to_semester_id: form.to_semester_id })
      toast.success(`Promotion complete: ${result.promoted} promoted, ${result.supplementary} supplementary, ${result.repeat} repeat, ${result.graduated} graduated.`)
      const p = await promotionsAPI.list()
      setPromotions(Array.isArray(p) ? p : p?.results || [])
    } catch { toast.error('Bulk promotion failed.') }
    finally { setRunning(false) }
  }

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Approve Promotions</h1><p className="page-subtitle">Promote students to the next semester or year of study.</p></div>

      <div className="card card-padded" style={{ marginBottom: 'var(--sp-5)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-5)' }}>Bulk Promotion</h3>
        <div className="alert alert-warning" style={{ marginBottom: 'var(--sp-4)' }}>
          <TrendingUp size={16} />
          <span>This action will promote all eligible students in the selected intake based on their computed GPA.</span>
        </div>
        <div className="form-grid-2" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="form-group">
            <label className="form-label required">Intake</label>
            <select className="form-select" value={form.intake_id} onChange={(e) => setForm(p => ({ ...p, intake_id: e.target.value }))}>
              <option value="">Select intake…</option>
              {intakes.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Promote To Semester</label>
            <select className="form-select" value={form.to_semester_id} onChange={(e) => setForm(p => ({ ...p, to_semester_id: e.target.value }))}>
              <option value="">Select target semester…</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={runBulkPromotion} disabled={running}>
          {running ? <><div className="spinner spinner-sm"/> Running…</> : <><TrendingUp size={15}/> Run Bulk Promotion</>}
        </button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Student</th><th>Reg. No</th><th>From</th><th>To</th><th>Type</th><th>GPA</th><th>Date</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><div className="page-loader" style={{minHeight:100}}><div className="spinner"/></div></td></tr>
              : promotions.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-title">No promotions yet</div></div></td></tr>
              : promotions.map((p) => (
              <tr key={p.id}>
                <td style={{fontWeight:500}}>{p.student_name}</td>
                <td><span className="table-mono">{p.reg_number}</span></td>
                <td style={{fontSize:12}}>Yr{p.from_year} Sem{p.from_sem_number}</td>
                <td style={{fontSize:12}}>Yr{p.to_year} Sem{p.to_sem_number}</td>
                <td>
                  <span className={`badge ${p.promotion_type==='normal'?'badge-active':p.promotion_type==='graduate'?'badge-accent':p.promotion_type==='repeat'?'badge-danger':'badge-warning'}`}>
                    {p.promotion_type_display}
                  </span>
                </td>
                <td style={{fontFamily:'var(--font-mono)',fontWeight:600}}>{Number(p.gpa_at_promotion).toFixed(2)}</td>
                <td style={{fontSize:12}}>{new Date(p.promoted_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}