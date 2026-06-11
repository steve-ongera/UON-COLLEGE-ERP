import { useState, useEffect, useCallback } from 'react'
import { feeStructuresAPI, programmesAPI, academicYearsAPI } from '../../services/api'
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = {
  programme: '', academic_year: '', year_of_study: 1, semester_number: 1,
  tuition_fee: 0, registration_fee: 0, examination_fee: 0,
  library_fee: 0, caution_money: 0, medical_fee: 0, activity_fee: 0, other_fees: 0,
}

export default function FeeStructures() {
  const [structures, setStructures] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [years,      setYears]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [form,       setForm]       = useState(EMPTY)
  const [selected,   setSelected]   = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [filterYear, setFilterYear] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      feeStructuresAPI.list(filterYear ? { academic_year: filterYear } : {}),
      programmesAPI.list(),
      academicYearsAPI.list(),
    ]).then(([s, p, y]) => {
      setStructures(Array.isArray(s) ? s : s?.results || [])
      setProgrammes(Array.isArray(p) ? p : p?.results || [])
      setYears(Array.isArray(y) ? y : y?.results || [])
    }).catch(() => toast.error('Failed to load fee structures'))
      .finally(() => setLoading(false))
  }, [filterYear])

  useEffect(() => { load() }, [load])

  const open = (item = null) => {
    setSelected(item)
    setForm(item ? { ...item } : EMPTY)
    setModal(true)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: ['tuition_fee','registration_fee','examination_fee','library_fee','caution_money','medical_fee','activity_fee','other_fees'].includes(name) ? Number(value) : value }))
  }

  const totalFee = Object.entries(form)
    .filter(([k]) => k.endsWith('_fee') || k === 'caution_money' || k === 'other_fees')
    .reduce((s, [, v]) => s + Number(v || 0), 0)

  const save = async () => {
    setSaving(true)
    try {
      if (selected) await feeStructuresAPI.update(selected.id, form)
      else          await feeStructuresAPI.create(form)
      toast.success(selected ? 'Fee structure updated.' : 'Fee structure created.')
      setModal(null); load()
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this fee structure?')) return
    try { await feeStructuresAPI.delete(id); toast.success('Deleted.'); load() }
    catch { toast.error('Cannot delete — may be in use.') }
  }

  const FEE_FIELDS = [
    ['tuition_fee', 'Tuition Fee'],
    ['registration_fee', 'Registration Fee'],
    ['examination_fee', 'Examination Fee'],
    ['library_fee', 'Library Fee'],
    ['caution_money', 'Caution Money'],
    ['medical_fee', 'Medical Fee'],
    ['activity_fee', 'Activity Fee'],
    ['other_fees', 'Other Fees'],
  ]

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Fee Structures</h1>
          <p className="page-subtitle">Configure fee structures per programme, year and semester.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open()}><Plus size={16} /> Add Fee Structure</button>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ minWidth: 200 }}>
          <select className="form-select" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">All Academic Years</option>
            {years.map((y) => <option key={y.id} value={y.id}>{y.year_label}</option>)}
          </select>
        </div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /></button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Programme</th><th>Year</th><th>Yr/Sem</th>
              <th>Tuition</th><th>Exam</th><th>Reg.</th><th>Total (KES)</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}><div className="page-loader" style={{ minHeight: 120 }}><div className="spinner" /></div></td></tr>
            ) : structures.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-title">No fee structures found</div></div></td></tr>
            ) : structures.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{s.programme_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.programme_code}</div>
                </td>
                <td style={{ fontSize: 12 }}>{s.academic_year_label}</td>
                <td style={{ fontSize: 12 }}>Yr{s.year_of_study} / Sem{s.semester_number}</td>
                <td>{Number(s.tuition_fee).toLocaleString()}</td>
                <td>{Number(s.examination_fee).toLocaleString()}</td>
                <td>{Number(s.registration_fee).toLocaleString()}</td>
                <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{Number(s.total_fee).toLocaleString()}</td>
                <td><span className={`badge ${s.is_active ? 'badge-active' : 'badge-inactive'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => open(s)}><Edit2 size={14} /></button>
                    <button className="btn btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => del(s.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{selected ? 'Edit Fee Structure' : 'New Fee Structure'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ marginBottom: 'var(--sp-5)' }}>
                <div className="form-group">
                  <label className="form-label required">Programme</label>
                  <select className="form-select" name="programme" value={form.programme} onChange={handleChange}>
                    <option value="">Select programme…</option>
                    {programmes.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Academic Year</label>
                  <select className="form-select" name="academic_year" value={form.academic_year} onChange={handleChange}>
                    <option value="">Select year…</option>
                    {years.map((y) => <option key={y.id} value={y.id}>{y.year_label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Year of Study</label>
                  <select className="form-select" name="year_of_study" value={form.year_of_study} onChange={handleChange}>
                    {[1,2,3,4,5].map((y) => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Semester</label>
                  <select className="form-select" name="semester_number" value={form.semester_number} onChange={handleChange}>
                    {[1,2,3].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', marginBottom: 'var(--sp-4)' }}>Fee Components (KES)</h4>
                <div className="form-grid">
                  {FEE_FIELDS.map(([name, label]) => (
                    <div key={name} className="form-group">
                      <label className="form-label">{label}</label>
                      <input type="number" name={name} className="form-input" value={form[name]} onChange={handleChange} min={0} step={100} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 'var(--sp-4)', background: 'var(--color-primary-10)',
                borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-primary-20)',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Total Fee</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                  KES {totalFee.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><div className="spinner spinner-sm" /> Saving…</> : 'Save Fee Structure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}