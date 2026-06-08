import { useState, useEffect } from 'react'
import { studentsAPI } from '../../services/api'
import { Search, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DepartmentStudents() {
  const [students, setStudents] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    studentsAPI.list({ search: search || undefined })
      .then((d) => setStudents(Array.isArray(d) ? d : d?.results || []))
      .catch(() => toast.error('Failed to load students'))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Department Students</h1>
        <p className="page-subtitle">All students enrolled in department programmes.</p>
      </div>
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input className="form-input search-input" placeholder="Search by name or reg. number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="table-wrapper">
        <table className="table">
          <thead><tr><th>Reg. Number</th><th>Name</th><th>Programme</th><th>Intake</th><th>Year</th><th>Status</th><th>GPA</th></tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7}><div className="page-loader" style={{minHeight:120}}><div className="spinner"/></div></td></tr>
              : students.length === 0
              ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-title">No students found</div></div></td></tr>
              : students.map((s) => (
              <tr key={s.id}>
                <td><span className="table-mono">{s.reg_number}</span></td>
                <td style={{fontWeight:500}}>{s.full_name}</td>
                <td style={{fontSize:12}}>{s.programme_code}</td>
                <td style={{fontSize:12}}>{s.intake_name}</td>
                <td><span className="badge badge-primary">Year {s.current_year_of_study}</span></td>
                <td><span className={`badge ${s.status==='active'?'badge-active':'badge-warning'}`}>{s.status}</span></td>
                <td style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:600}}>{Number(s.cumulative_gpa||0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}