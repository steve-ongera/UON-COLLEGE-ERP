import { FileText, Download, Shield, GraduationCap, Receipt, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const DOCS = [
  { title:'Admission Letter',      icon:GraduationCap, desc:'Official admission letter to your programme', color:'#003087' },
  { title:'Academic Transcript',   icon:BookOpen,      desc:'Full academic transcript with all semester results', color:'#7c3aed' },
  { title:'Fee Statement',         icon:Receipt,       desc:'Current fee account statement and payment history', color:'#16a34a' },
  { title:'Registration Slip',     icon:Shield,        desc:'Current semester unit registration confirmation', color:'#d97706' },
  { title:'Student ID Letter',     icon:FileText,      desc:'Letter confirming your student status', color:'#0284c7' },
  { title:'Clearance Form',        icon:FileText,      desc:'Academic clearance form for graduating students', color:'#dc2626' },
]

export default function MyDocuments() {
  const { user } = useAuth()

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Documents</h1>
        <p className="page-subtitle">Download official academic documents and letters.</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 'var(--sp-6)' }}>
        <Shield size={16} />
        <div>
          <strong>Official Documents</strong> — Documents are generated in real-time from your current academic record.
          Contact the registrar's office for certified hard copies.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-4)' }}>
        {DOCS.map(({ title, icon: Icon, desc, color }) => (
          <div key={title} className="card card-padded" style={{ transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseOut={e  => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--radius-lg)',
              background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 'var(--sp-4)',
            }}>
              <Icon size={24} style={{ color }} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 6 }}>
              {title}
            </h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--sp-5)', lineHeight: 1.5 }}>
              {desc}
            </p>
            <button
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'center', borderColor: color, color }}
              onClick={() => alert(`Document generation for "${title}" — connect to your PDF generation API.`)}
            >
              <Download size={14} /> Download PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}