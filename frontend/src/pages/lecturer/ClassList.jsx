import { useState, useEffect } from 'react'
import { offeringsAPI } from '../../services/api'
import { Users, Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ClassList() {
  const [offerings, setOfferings] = useState([])
  const [students,  setStudents]  = useState([])
  const [selected,  setSelected]  = useState('')
  const [search,    setSearch]    = useState('')
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    offeringsAPI.list().then((d) => setOfferings(Array.isArray(d) ? d : d?.results || []))
  }, [])

  useEffect(() => {
    if (!selected) { setStudents([]); return }
    setLoading(true)
    offeringsAPI.classlist(selected)
      .then((d) => setStudents(Array.isArray(d) ? d : []))
      .catch(() => toast.error('Failed to load class list'))
      .finally(() => setLoading(false))
  }, [selected])

  const filtered = students.filter((s) =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.reg_number.includes(search)
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Class Lists</h1>
        <p className="page-subtitle">View students enrolled in each of your unit offerings.</p>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1, maxWidth: 400 }}>
          <select className="form-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select a unit offering…</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>{o.unit_code} — {o.unit_name} ({o.semester_name})</option>
            ))}
          </select>
        </div>
        {selected && (
          <div className="search-input-wrap" style={{ maxWidth: 260 }}>
            <Search size={16} className="search-icon" />
            <input className="form-input search-input" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )}
      </div>

      {selected && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>#</th><th>Reg. Number</th><th>Full Name</th><th>Programme</th><th>Year</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6}><div className="page-loader" style={{ minHeight: 100 }}><div className="spinner" /></div></td></tr>
                : filtered.length === 0
                ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-title">No students found</div></div></td></tr>
                : filtered.map((s, i) => (
                  <tr key={s.enrollment_id}>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td><span className="table-mono">{s.reg_number}</span></td>
                    <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                    <td style={{ fontSize: 12 }}>{s.programme}</td>
                    <td><span className="badge badge-primary">Year {s.year}</span></td>
                    <td><span className={`badge ${s.status === 'registered' ? 'badge-active' : 'badge-warning'}`}>{s.status}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          {!loading && filtered.length > 0 && (
            <div style={{ padding: 'var(--sp-3) var(--sp-5)', background: 'var(--color-surface-alt)', borderTop: '1px solid var(--color-border)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Showing {filtered.length} of {students.length} students
            </div>
          )}
        </div>
      )}
    </div>
  )
}