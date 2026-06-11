import { useState } from 'react'
import { reportsAPI, academicYearsAPI } from '../../services/api'
import { useEffect } from 'react'
import { FileBarChart2, Download, Users, TrendingUp, GraduationCap, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  { key: 'enrollment', label: 'Enrollment Report',     icon: Users,          desc: 'Student enrollment breakdown by programme, year, and status.' },
  { key: 'results',    label: 'Academic Results',      icon: TrendingUp,     desc: 'GPA distribution and pass/fail rates across the faculty.' },
  { key: 'graduates',  label: 'Graduates Report',      icon: GraduationCap,  desc: 'List of all graduated students with their programmes.' },
  { key: 'defaulters', label: 'Fee Defaulters',        icon: AlertCircle,    desc: 'Students with outstanding fee balances.' },
]

export default function FacultyReports() {
  const [years,       setYears]       = useState([])
  const [selYear,     setSelYear]     = useState('')
  const [reportType,  setReportType]  = useState('')
  const [reportData,  setReportData]  = useState(null)
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    academicYearsAPI.list()
      .then((d) => setYears(Array.isArray(d) ? d : d?.results || []))
      .catch(() => {})
  }, [])

  const generateReport = async () => {
    if (!reportType) return toast.error('Select a report type.')
    setLoading(true)
    setReportData(null)
    try {
      const params = selYear ? { academic_year: selYear } : {}
      let data
      switch (reportType) {
        case 'enrollment': data = await reportsAPI.enrollment(params); break
        case 'results':    data = await reportsAPI.results(params);    break
        case 'graduates':  data = await reportsAPI.graduates(params);  break
        case 'defaulters': data = await reportsAPI.defaulters(params); break
        default: break
      }
      setReportData(data)
    } catch { toast.error('Failed to generate report.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Faculty Reports</h1>
        <p className="page-subtitle">Generate and view faculty-wide academic and financial reports.</p>
      </div>

      {/* Report selector cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        {REPORT_TYPES.map(({ key, label, icon: Icon, desc }) => (
          <div
            key={key}
            className="card card-padded"
            style={{
              cursor: 'pointer',
              borderColor: reportType === key ? 'var(--color-primary)' : 'var(--color-border)',
              borderWidth: reportType === key ? 2 : 1,
              transition: 'all 0.15s',
            }}
            onClick={() => setReportType(key)}
          >
            <div style={{
              width: 42, height: 42,
              borderRadius: 'var(--radius-lg)',
              background: reportType === key ? 'var(--color-primary-10)' : 'var(--color-surface-alt)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 'var(--sp-3)',
              color: reportType === key ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}>
              <Icon size={20} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="card card-padded" style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: 220 }}>
            <label className="form-label">Academic Year (optional)</label>
            <select className="form-select" value={selYear} onChange={(e) => setSelYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.year_label}</option>)}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={generateReport}
            disabled={!reportType || loading}
          >
            {loading
              ? <><div className="spinner spinner-sm" /> Generating…</>
              : <><FileBarChart2 size={15} /> Generate Report</>
            }
          </button>
        </div>
      </div>

      {/* Report output */}
      {loading && <div className="page-loader"><div className="spinner spinner-lg" /></div>}

      {!loading && reportData && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{REPORT_TYPES.find(r => r.key === reportType)?.label}</h3>
            <button className="btn btn-ghost btn-sm"><Download size={14} /> Export CSV</button>
          </div>
          <div className="card-body">
            {/* Enrollment Report */}
            {reportType === 'enrollment' && (
              <div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 'var(--sp-5)' }}>
                  <div className="card card-padded" style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>{reportData.total}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>Total Students</div>
                  </div>
                </div>

                {reportData.by_programme?.length > 0 && (
                  <>
                    <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--sp-3)' }}>By Programme</h4>
                    <div className="table-wrapper" style={{ marginBottom: 'var(--sp-5)' }}>
                      <table className="table">
                        <thead><tr><th>Programme</th><th>Code</th><th>Students</th></tr></thead>
                        <tbody>
                          {reportData.by_programme.map((r) => (
                            <tr key={r.programme__code}>
                              <td style={{ fontWeight: 500 }}>{r.programme__name}</td>
                              <td><span className="table-mono">{r.programme__code}</span></td>
                              <td><span className="badge badge-accent">{r.count}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {reportData.by_status?.length > 0 && (
                  <>
                    <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--sp-3)' }}>By Status</h4>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead><tr><th>Status</th><th>Count</th></tr></thead>
                        <tbody>
                          {reportData.by_status.map((r) => (
                            <tr key={r.status}>
                              <td><span className={`badge ${r.status === 'active' ? 'badge-active' : r.status === 'graduated' ? 'badge-accent' : 'badge-warning'}`}>{r.status}</span></td>
                              <td><strong>{r.count}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Results Report */}
            {reportType === 'results' && (
              <div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--sp-5)' }}>
                  <div className="card card-padded" style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>{reportData.total}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>Semester Results</div>
                  </div>
                  <div className="card card-padded" style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                      {Number(reportData.avg_gpa || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>Average GPA</div>
                  </div>
                </div>

                {reportData.top_students?.length > 0 && (
                  <>
                    <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--sp-3)' }}>Top 10 Students by GPA</h4>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead><tr><th>Rank</th><th>Reg. Number</th><th>Name</th><th>Programme</th><th>CGPA</th></tr></thead>
                        <tbody>
                          {reportData.top_students.map((s, i) => (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 700, color: i < 3 ? 'var(--color-accent-dark)' : 'var(--color-text-muted)' }}>#{i + 1}</td>
                              <td><span className="table-mono">{s.reg_number}</span></td>
                              <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                              <td style={{ fontSize: 12 }}>{s.programme_code}</td>
                              <td>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                                  color: Number(s.cumulative_gpa) >= 3.5 ? 'var(--color-success)' : Number(s.cumulative_gpa) >= 2.0 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                                  {Number(s.cumulative_gpa || 0).toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Graduates Report */}
            {reportType === 'graduates' && (
              <div>
                {Array.isArray(reportData) && reportData.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-title">No graduates found</div></div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>Reg. Number</th><th>Name</th><th>Programme</th><th>Intake</th><th>CGPA</th></tr></thead>
                      <tbody>
                        {(Array.isArray(reportData) ? reportData : []).map((s) => (
                          <tr key={s.id}>
                            <td><span className="table-mono">{s.reg_number}</span></td>
                            <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                            <td>{s.programme_code}</td>
                            <td style={{ fontSize: 12 }}>{s.intake_name}</td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-success)' }}>
                              {Number(s.cumulative_gpa || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Defaulters Report */}
            {reportType === 'defaulters' && (
              <div>
                {Array.isArray(reportData) && reportData.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-title">No defaulters — all accounts cleared!</div></div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>Student</th><th>Reg. Number</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Cleared</th></tr></thead>
                      <tbody>
                        {(Array.isArray(reportData) ? reportData : []).map((a) => (
                          <tr key={a.id}>
                            <td style={{ fontWeight: 500 }}>{a.student_name}</td>
                            <td><span className="table-mono">{a.reg_number}</span></td>
                            <td>KES {Number(a.total_billed).toLocaleString()}</td>
                            <td>KES {Number(a.total_paid).toLocaleString()}</td>
                            <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>KES {Number(a.balance).toLocaleString()}</td>
                            <td><span className="badge badge-danger">Outstanding</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}