import { useState, useEffect, useCallback } from 'react'
import { invoicesAPI, semestersAPI, studentsAPI, feeStructuresAPI } from '../../services/api'
import { Plus, Search, RefreshCw, Receipt, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = { student: '', semester: '', fee_structure: '', amount_due: '', due_date: '', notes: '' }

export default function Invoices() {
  const [invoices,    setInvoices]    = useState([])
  const [semesters,   setSemesters]   = useState([])
  const [structures,  setStructures]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [search,      setSearch]      = useState('')
  const [filterSem,   setFilterSem]   = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [studentResults, setStudentResults] = useState([])

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (filterSem) params.semester = filterSem
    Promise.all([
      invoicesAPI.list(params),
      semestersAPI.list(),
      feeStructuresAPI.list(),
    ]).then(([inv, sem, fs]) => {
      setInvoices(Array.isArray(inv) ? inv : inv?.results || [])
      setSemesters(Array.isArray(sem) ? sem : sem?.results || [])
      setStructures(Array.isArray(fs)  ? fs  : fs?.results  || [])
    }).catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [filterSem])

  useEffect(() => { load() }, [load])

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

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

  const handleSave = async () => {
    if (!form.student || !form.semester || !form.amount_due || !form.due_date) {
      return toast.error('Please fill all required fields.')
    }
    setSaving(true)
    try {
      await invoicesAPI.create({ ...form, amount_due: Number(form.amount_due) })
      toast.success('Invoice generated.')
      setModal(false); setForm(EMPTY_FORM); setStudentName(''); load()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to generate invoice.')
    } finally { setSaving(false) }
  }

  const filtered = invoices.filter((inv) =>
    !search || inv.invoice_number?.includes(search) ||
    inv.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.reg_number?.includes(search)
  )

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Generate and manage student fee invoices.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setModal(true); setForm(EMPTY_FORM); setStudentName('') }}>
          <Plus size={16} /> Generate Invoice
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input className="form-input search-input" placeholder="Search by invoice number or student…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 220 }} value={filterSem} onChange={(e) => setFilterSem(e.target.value)}>
          <option value="">All Semesters</option>
          {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /></button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Invoice #</th><th>Student</th><th>Semester</th><th>Amount Due</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="page-loader" style={{ minHeight: 120 }}><div className="spinner" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-title">No invoices found</div></div></td></tr>
            ) : filtered.map((inv) => (
              <tr key={inv.id}>
                <td><span className="table-mono" style={{ fontSize: 11 }}>{inv.invoice_number}</span></td>
                <td>
                  <div style={{ fontWeight: 500 }}>{inv.student_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{inv.reg_number}</div>
                </td>
                <td style={{ fontSize: 12 }}>{inv.semester_name}</td>
                <td>{Number(inv.amount_due).toLocaleString()}</td>
                <td style={{ color: 'var(--color-success)' }}>{Number(inv.amount_paid).toLocaleString()}</td>
                <td style={{ fontWeight: 700, color: Number(inv.balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                  {Number(inv.balance).toLocaleString()}
                </td>
                <td style={{ fontSize: 12 }}>{inv.due_date}</td>
                <td>
                  <span className={`badge ${inv.is_paid ? 'badge-active' : 'badge-danger'}`}>
                    {inv.is_paid ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate Invoice Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title"><Receipt size={18} /> Generate Invoice</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                {/* Student */}
                <div className="form-group">
                  <label className="form-label required">Student</label>
                  {form.student ? (
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      <div className="form-input" style={{ flex: 1, background: 'var(--color-surface-alt)' }}>{studentName}</div>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setForm(p => ({ ...p, student: '' })); setStudentName('') }}>Change</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input className="form-input" placeholder="Search student…" value={studentSearch}
                        onChange={(e) => { setStudentSearch(e.target.value); searchStudents(e.target.value) }} />
                      {studentResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 50, maxHeight: 180, overflowY: 'auto' }}>
                          {studentResults.map((s) => (
                            <div key={s.id} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 'var(--text-sm)', borderBottom: '1px solid var(--color-border)' }}
                              onMouseDown={() => selectStudent(s)}
                              onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                              onMouseOut={(e)  => e.currentTarget.style.background = ''}>
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
                    <label className="form-label required">Semester</label>
                    <select className="form-select" name="semester" value={form.semester} onChange={handleChange}>
                      <option value="">Select semester…</option>
                      {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fee Structure (optional)</label>
                    <select className="form-select" name="fee_structure" value={form.fee_structure} onChange={handleChange}>
                      <option value="">Select…</option>
                      {structures.map((fs) => <option key={fs.id} value={fs.id}>{fs.programme_code} Yr{fs.year_of_study}/Sem{fs.semester_number} — KES {Number(fs.total_fee).toLocaleString()}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Amount Due (KES)</label>
                    <input type="number" name="amount_due" className="form-input" value={form.amount_due} onChange={handleChange} min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Due Date</label>
                    <input type="date" name="due_date" className="form-input" value={form.due_date} onChange={handleChange} />
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
                {saving ? <><div className="spinner spinner-sm" /> Generating…</> : <><Receipt size={14} /> Generate</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}