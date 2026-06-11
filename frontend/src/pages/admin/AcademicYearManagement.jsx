import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function AcademicYearManagement() {
  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">AcademicYearManagement</h1>
          <p className="page-subtitle">Manage records. Connect API and build table/form here.</p>
        </div>
        <button className="btn btn-primary"><Plus size={16}/> Add New</button>
      </div>
      <div className="card card-padded" style={{marginTop:'var(--sp-4)'}}>
        <div className="empty-state">
          <div className="empty-state-title">AcademicYearManagement</div>
          <p className="empty-state-desc">Ready for implementation.</p>
          <a href="/admin/dashboard" className="btn btn-primary" style={{marginTop:'var(--sp-4)'}}>Back to Dashboard</a>
        </div>
      </div>
    </div>
  )
}