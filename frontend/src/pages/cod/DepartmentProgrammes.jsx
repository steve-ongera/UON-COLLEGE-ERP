import { Plus } from 'lucide-react'
export default function DepartmentProgrammes() {
  return (
    <div>
      <div className="page-header-row">
        <div><h1 className="page-title">Department Programmes</h1><p className="page-subtitle">Manage programmes offered by your department.</p></div>
        <a href="/admin/programmes" className="btn btn-primary"><Plus size={15}/> Manage Programmes</a>
      </div>
      <div className="card card-padded" style={{marginTop:'var(--sp-4)'}}>
        <div className="empty-state">
          <div className="empty-state-title">Department Programmes</div>
          <p className="empty-state-desc">Use the Programme Management page for full CRUD. This view will show department-scoped programmes.</p>
          <a href="/admin/programmes" className="btn btn-primary" style={{marginTop:'var(--sp-4)'}}>Go to Programmes</a>
        </div>
      </div>
    </div>
  )
}