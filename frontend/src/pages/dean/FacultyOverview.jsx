import { departmentsAPI } from '../../services/api'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function FacultyOverview() {
  const [depts, setDepts]   = useState([])
  const [loading,setLoading]= useState(true)
  useEffect(() => {
    departmentsAPI.list().then((d)=>setDepts(Array.isArray(d)?d:d?.results||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false))
  },[])
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Faculty Overview</h1><p className="page-subtitle">Department-by-department breakdown.</p></div>
      {loading ? <div className="page-loader"><div className="spinner"/></div> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'var(--sp-4)'}}>
          {depts.map((d)=>(
            <div key={d.id} className="card card-padded" style={{borderTop:'3px solid var(--color-primary)'}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'var(--text-md)',fontWeight:600,marginBottom:'var(--sp-3)'}}>{d.name}</div>
              <div className="info-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
                <div className="info-item"><div className="info-label">Code</div><div className="info-value table-mono">{d.code}</div></div>
                <div className="info-item"><div className="info-label">Programmes</div><div className="info-value">{d.programme_count}</div></div>
                <div className="info-item"><div className="info-label">Lecturers</div><div className="info-value">{d.lecturer_count}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}