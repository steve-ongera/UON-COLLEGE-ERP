import { useState, useEffect, useCallback } from 'react'
import { paymentsAPI, studentsAPI, academicYearsAPI, semestersAPI } from '../../services/api'
import { Plus, Search, RefreshCw, RotateCcw, CreditCard } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const METHODS = ['mpesa','bank','cash','scholarship','waiver','cheque']
const METHOD_COLORS = { mpesa:'#16a34a', bank:'#0284c7', cash:'#d97706', scholarship:'#7c3aed', waiver:'#64748b', cheque:'#0f172a' }
const EMPTY_FORM = { student:'', academic_year:'', semester:'', amount:'', payment_method:'mpesa', reference_number:'', notes:'' }

export default function StudentPayments() {
  const { user } = useAuth()
  const [payments,  setPayments]  = useState([])
  const [years,     setYears]     = useState([])
  const [semesters, setSemesters] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [filterYear,setFilterYear]= useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (search)     params.search       = search
    if (filterYear) params.academic_year = filterYear
    Promise.all([
      paymentsAPI.list(params),
      academicYearsAPI.list(),
      semestersAPI.list(),
    ]).then(([p, y, s]) => {
      setPayments(Array.isArray(p) ? p : p?.results || [])
      setYears(Array.isArray(y) ? y : y?.results || [])
      setSemesters(Array.isArray(s) ? s : s?.results || [])
    }).catch(() => toast.error('Failed to load payments'))
      .finally(() => setLoading(false))
  }, [search, filterYear])

  useEffect(() => { load() }, [load])

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    if (!form.student || !form.amount || !form.reference_number || !form.academic_year) {
      return toast.error('Please fill all required fields.')
    }
    setSaving(true)
    try {
      await paymentsAPI.create({ ...form, amount: Number(form.amount) })
      toast.success('Payment recorded successfully.')
      setModal(false); setForm(EMPTY_FORM); load()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to record payment.')
    } finally { setSaving(false) }
  }

  const handleReverse = async (id) => {
    if (!confirm('Reverse this payment? This cannot be undone.')) return
    try {
      await paymentsAPI.reverse(id)
      toast.success('Payment reversed.')
      load()
    } catch { toast.error('Failed to reverse payment.') }
  }

  // Student lookup for the form
  const [studentSearch, setStudentSearch] = useState('')
  const [studentResults, setStudentResults] = useState([])
  const [studentName, setStudentName] = useState('')

  const searchStudents = async (q) => {
    if (!q || q.length < 3) { setStudentResults([]); return }
    const d = await studentsAPI.list({ search: q })
    setStudentResults(Array.isArray(d) ? d : d?.results || [])
  }

  const selectStudent = (s) => {
    setForm((p) => ({ ...p, student: s.id }))
    setStudentName(`${s.full_name} (${s.reg_number})`)
    setStudentResults([])
    setStudentSearch('')
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Student Payments</h1>
          <p className="page-subtitle">Record and manage student fee payments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setModal(true); setForm(EMPTY_FORM); setStudentName('') }}>
          <Plus size={16} /> Record Payment
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input className="form-input search-input" placeholder="Search by ref. or student name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 200 }} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">All Academic Years</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.year_label}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /></button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Student</th><th>Reg. No.</th><th>Amount (KES)</th><th>Method</th><th>Reference</th><th>Received By</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}><div className="page-loader" style={{ minHeight: 120 }}><div className="spinner" /></div></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-title">No payments found</div></div></td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} style={{ opacity: p.is_reversed ? 0.55 : 1 }}>
                <td style={{ fontSize: 12 }}>{p.payment_date}</td>
                <td style={{ fontWeight: 500 }}>{p.student_name}</td>
                <td><span className="table-mono">{p.reg_number}</span></td>
                <td><strong>{Number(p.amount).toLocaleString()}</strong></td>
                <td>
                  <span className="badge" style={{
                    background: `${METHOD_COLORS[p.payment_method] || '#003087'}18`,
                    color: METHOD_COLORS[p.payment_method] || '#003087',
                  }}>
                    {p.payment_method_display}
                  </span>
                </td>
                <td><span className="table-mono" style={{ fontSize: 11 }}>{p.reference_number}</span></td>
                <td style={{ fontSize: 12 }}>{p.received_by_name || '—'}</td>
                <td>
                  <span className={`badge ${p.is_reversed ? 'badge-danger' : 'badge-active'}`}>
                    {p.is_reversed ? 'Reversed' : 'Confirmed'}
                  </span>
                </td>
                <td>
                  {!p.is_reversed && (
                    <button className="btn btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleReverse(p.id)} title="Reverse">
                      <RotateCcw size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Record Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {/* Student search */}
                <div className="form-group">
                  <label className="form-label required">Student</label>
                  {form.student ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <div className="form-input" style={{ flex: 1, background: 'var(--color-surface-alt)', color: 'var(--color-text)' }}>
                        {studentName}
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setForm(p => ({ ...p, student: '' })); setStudentName('') }}>Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        className="form-input"
                        placeholder="Search student by name or reg. number…"
                        value={studentSearch}
                        onChange={(e) => { setStudentSearch(e.target.value); searchStudents(e.target.value) }}
                      />
                      {studentResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 50, maxHeight: 200, overflowY: 'auto' }}>
                          {studentResults.map((s) => (
                            <div key={s.id} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--color-border)' }}
                              onMouseDown={() => selectStudent(s)}
                              onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                              onMouseOut={(e) => e.currentTarget.style.background = ''}>
                              <div style={{ fontWeight: 500 }}>{s.full_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.reg_number} · {s.programme_code}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label required">Academic Year</label>
                    <select className="form-select" name="academic_year" value={form.academic_year} onChange={handleChange}>
                      <option value="">Select year…</option>
                      {years.map((y) => <option key={y.id} value={y.id}>{y.year_label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Semester (optional)</label>
                    <select className="form-select" name="semester" value={form.semester} onChange={handleChange}>
                      <option value="">Select semester…</option>
                      {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Amount (KES)</label>
                    <input type="number" name="amount" className="form-input" value={form.amount} onChange={handleChange} min={0} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Payment Method</label>
                    <select className="form-select" name="payment_method" value={form.payment_method} onChange={handleChange}>
                      {METHODS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label required">Reference Number</label>
                    <input name="reference_number" className="form-input" value={form.reference_number} onChange={handleChange} placeholder="e.g. MPesa transaction ID, bank ref…" />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Notes</label>
                    <textarea name="notes" className="form-textarea" rows={2} value={form.notes} onChange={handleChange} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner spinner-sm" /> Recording…</> : <><CreditCard size={14} /> Record Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}