import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, Edit2, Trash2 } from 'lucide-react'
import { programmesAPI, departmentsAPI } from '../../services/api'
import toast from 'react-hot-toast'

const TYPES = ['certificate','diploma','undergraduate','postgraduate_diploma','masters','phd']
const EMPTY = { name:'', code:'', department:'', programme_type:'undergraduate', duration_years:3, semesters_per_year:2, description:'' }

export default function ProgrammeManagement() {
  const [items,  setItems]  = useState([])
  const [depts,  setDepts]  = useState([])
  const [loading,setLoading]= useState(true)
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(EMPTY)
  const [selected,setSelected]=useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      programmesAPI.list({ search: search || undefined }),
      departmentsAPI.list(),
    ]).then(([p, d]) => {
      setItems(Array.isArray(p) ? p : p?.results || [])
      setDepts(Array.isArray(d) ? d : d?.results || [])
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { load() }, [load])

  const open = (item = null) => {
    setSelected(item)
    setForm(item ? { ...item } : EMPTY)
    setModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (selected) await programmesAPI.update(selected.id, form)
      else await programmesAPI.create(form)
      toast.success(selected ? 'Programme updated.' : 'Programme created.')
      setModal(null); load()
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed.') }
    finally { setSaving(false) }
  }

  const del = async (id) => {
    if (!confirm('Delete this programme?')) return
    try { await programmesAPI.delete(id); toast.success('Deleted.'); load() }
    catch { toast.error('Cannot delete programme.') }
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Programme Management</h1>
          <p className="page-subtitle">Manage all academic programmes across departments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open()}><Plus size={16} /> Add Programme</button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input className="form-input search-input" placeholder="Search programmes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /></button>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Type</th><th>Duration</th><th>Sems/Yr</th><th>Students</th><th>Actions</th></tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8}><div className="page-loader" style={{minHeight:120}}><div className="spinner"/></div></td></tr>
              : items.map((p) => (
              <tr key={p.id}>
                <td><span className="table-mono">{p.code}</span></td>
                <td style={{fontWeight:500}}>{p.name}</td>
                <td style={{fontSize:12}}>{p.department_name}</td>
                <td><span className="badge badge-primary" style={{fontSize:10}}>{p.programme_type_display}</span></td>
                <td style={{fontSize:13}}>{p.duration_years} yr{p.duration_years>1?'s':''}</td>
                <td style={{fontSize:13}}>{p.semesters_per_year}</td>
                <td><span className="badge badge-accent">{p.student_count}</span></td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button className="btn btn-icon btn-sm" onClick={() => open(p)}><Edit2 size={14}/></button>
                    <button className="btn btn-icon btn-sm" style={{color:'var(--color-danger)'}} onClick={() => del(p.id)}><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target===e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{selected ? 'Edit Programme' : 'New Programme'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {[['name','Programme Name','text'],['code','Code','text']].map(([n,l,t]) => (
                  <div key={n} className="form-group">
                    <label className="form-label required">{l}</label>
                    <input name={n} type={t} className="form-input" value={form[n]||''} onChange={(e)=>setForm(p=>({...p,[e.target.name]:e.target.value}))} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label required">Department</label>
                  <select className="form-select" value={form.department||''} onChange={(e)=>setForm(p=>({...p,department:e.target.value}))}>
                    <option value="">Select department…</option>
                    {depts.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Programme Type</label>
                  <select className="form-select" value={form.programme_type} onChange={(e)=>setForm(p=>({...p,programme_type:e.target.value}))}>
                    {TYPES.map((t)=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Duration (Years)</label>
                  <select className="form-select" value={form.duration_years} onChange={(e)=>setForm(p=>({...p,duration_years:+e.target.value}))}>
                    {[1,2,3,4,5].map((y)=><option key={y} value={y}>{y} Year{y>1?'s':''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label required">Semesters per Year</label>
                  <select className="form-select" value={form.semesters_per_year} onChange={(e)=>setForm(p=>({...p,semesters_per_year:+e.target.value}))}>
                    <option value={2}>2 Semesters</option>
                    <option value={3}>3 Semesters</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description||''} onChange={(e)=>setForm(p=>({...p,description:e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving?<><div className="spinner spinner-sm"/>Saving…</>:'Save Programme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}