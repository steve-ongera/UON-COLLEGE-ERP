import { useState, useEffect } from 'react'
import { lecturersAPI } from '../../services/api'
import { UserCog } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StaffManagement() {
  const [staff,   setStaff]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    lecturersAPI.list()
      .then((d) => setStaff(Array.isArray(d) ? d : d?.results || []))
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Staff Management</h1><p className="page-subtitle">Department lecturers and their assignments.</p></div>
      {loading ? <div className="page-loader"><div className="spinner"/></div> : (
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Staff No.</th><th>Name</th><th>Designation</th><th>Specialization</th><th>Units</th><th>Status</th></tr></thead>
            <tbody>
              {staff.length === 0
                ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-title">No staff found</div></div></td></tr>
                : staff.map((s) => (
                <tr key={s.id}>
                  <td><span className="table-mono">{s.staff_number}</span></td>
                  <td style={{fontWeight:500}}>{s.user?.full_name}</td>
                  <td style={{fontSize:12}}>{s.designation_display}</td>
                  <td style={{fontSize:12}}>{s.specialization||'—'}</td>
                  <td><span className="badge badge-accent">{s.unit_count}</span></td>
                  <td><span className={`badge ${s.is_active?'badge-active':'badge-inactive'}`}>{s.is_active?'Active':'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}