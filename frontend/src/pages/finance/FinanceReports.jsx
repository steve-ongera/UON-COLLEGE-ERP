import { useState, useEffect } from 'react'
import { reportsAPI, academicYearsAPI } from '../../services/api'
import { FileBarChart2, Download, DollarSign, AlertCircle, CreditCard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const REPORT_TYPES = [
  { key: 'finance',   label: 'Revenue Report',   icon: DollarSign,    desc: 'Fee collection totals broken down by payment method and semester.' },
  { key: 'defaulters',label: 'Defaulters List',  icon: AlertCircle,   desc: 'Students with outstanding fee balances for the selected year.' },
]

const METHOD_COLORS = { mpesa: '#16a34a', bank: '#0284c7', cash: '#d97706', scholarship: '#7c3aed' }

export default function FinanceReports() {
  const [years,      setYears]      = useState([])
  const [selYear,    setSelYear]    = useState('')
  const [reportType, setReportType] = useState('finance')
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    academicYearsAPI.list().then((d) => {
      const list = Array.isArray(d) ? d : d?.results || []
      setYears(list)
      const current = list.find((y) => y.is_current)
      if (current) setSelYear(current.id)
    }).catch(() => {})
  }, [])

  const generate = async () => {
    setLoading(true); setData(null)
    try {
      const params = selYear ? { academic_year: selYear } : {}
      const result = reportType === 'finance'
        ? await reportsAPI.finance(params)
        : await reportsAPI.defaulters(params)
      setData(result)
    } catch { toast.error('Failed to generate report.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Finance Reports</h1>
        <p className="page-subtitle">Revenue analysis, collection rates, and defaulter tracking.</p>
      </div>

      {/* Report Type Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)' }}>
        {REPORT_TYPES.map(({ key, label, icon: Icon, desc }) => (
          <div key={key} className="card card-padded" style={{
            cursor: 'pointer',
            borderColor: reportType === key ? 'var(--color-primary)' : 'var(--color-border)',
            borderWidth: reportType === key ? 2 : 1,
          }} onClick={() => setReportType(key)}>
            <div style={{
              width: 42, height: 42, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--sp-3)',
              background: reportType === key ? 'var(--color-primary-10)' : 'var(--color-surface-alt)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            <label className="form-label">Academic Year</label>
            <select className="form-select" value={selYear} onChange={(e) => setSelYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.year_label}{y.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading
              ? <><div className="spinner spinner-sm" /> Generating…</>
              : <><FileBarChart2 size={15} /> Generate Report</>
            }
          </button>
          {data && <button className="btn btn-ghost"><Download size={14} /> Export CSV</button>}
        </div>
      </div>

      {loading && <div className="page-loader"><div className="spinner spinner-lg" /></div>}

      {!loading && data && reportType === 'finance' && (
        <div>
          {/* Summary */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--sp-5)' }}>
            <div className="card card-padded" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--color-success)' }}>
                KES {Number(data.total_revenue || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>Total Revenue</div>
            </div>
            <div className="card card-padded" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--color-primary)' }}>
                {(data.by_method || []).reduce((s, m) => s + m.count, 0)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>Total Transactions</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            {/* By Method Chart */}
            {data.by_method?.length > 0 && (
              <div className="card card-padded">
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--sp-4)' }}>Revenue by Payment Method</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.by_method.map((m) => ({ name: m.payment_method, total: Number(m.total || 0), count: m.count }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => [`KES ${Number(v).toLocaleString()}`, 'Amount']} />
                    <Bar dataKey="total" radius={[4,4,0,0]}>
                      {data.by_method.map((m, i) => (
                        <Cell key={i} fill={METHOD_COLORS[m.payment_method] || '#003087'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By Semester */}
            {data.by_semester?.length > 0 && (
              <div className="card card-padded">
                <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--sp-4)' }}>Revenue by Semester</h4>
                <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="table">
                    <thead><tr><th>Semester</th><th>Transactions</th><th>Total (KES)</th></tr></thead>
                    <tbody>
                      {data.by_semester.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>{s.semester__name || 'Unspecified'}</td>
                          <td><span className="badge badge-accent">{s.count}</span></td>
                          <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>{Number(s.total || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && data && reportType === 'defaulters' && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Student</th><th>Reg. Number</th><th>Academic Year</th><th>Billed</th><th>Paid</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {(Array.isArray(data) ? data : []).length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><DollarSign size={28} /></div>
                    <div className="empty-state-title">No defaulters — all accounts are cleared!</div>
                  </div>
                </td></tr>
              ) : (Array.isArray(data) ? data : []).map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.student_name}</td>
                  <td><span className="table-mono">{a.reg_number}</span></td>
                  <td style={{ fontSize: 12 }}>{a.academic_year_label}</td>
                  <td>KES {Number(a.total_billed).toLocaleString()}</td>
                  <td>KES {Number(a.total_paid).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>KES {Number(a.balance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}