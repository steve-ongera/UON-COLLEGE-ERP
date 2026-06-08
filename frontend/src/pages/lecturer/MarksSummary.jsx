import { useState, useEffect } from 'react'
import { offeringsAPI, unitResultsAPI } from '../../services/api'
import { BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const GRADE_COLORS = { A:'#16a34a', 'B+':'#0284c7', B:'#0284c7', 'C+':'#d97706', C:'#d97706', 'D+':'#dc2626', D:'#dc2626', E:'#991b1b' }

export default function MarksSummary() {
  const [offerings, setOfferings] = useState([])
  const [results,   setResults]   = useState([])
  const [selected,  setSelected]  = useState('')
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    offeringsAPI.list().then((d) => setOfferings(Array.isArray(d) ? d : d?.results || []))
  }, [])

  useEffect(() => {
    if (!selected) { setResults([]); return }
    setLoading(true)
    offeringsAPI.results(selected)
      .then((d) => setResults(Array.isArray(d) ? d : []))
      .catch(() => toast.error('Failed to load results'))
      .finally(() => setLoading(false))
  }, [selected])

  // Grade distribution
  const gradeDist = results.reduce((acc, r) => {
    const g = r.grade || 'E'
    acc[g] = (acc[g] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(gradeDist).map(([grade, count]) => ({ grade, count }))
  const passCount = results.filter((r) => r.status === 'pass').length
  const failCount = results.filter((r) => r.status === 'fail').length
  const passRate  = results.length ? ((passCount / results.length) * 100).toFixed(1) : 0
  const avgScore  = results.length
    ? (results.reduce((s, r) => s + Number(r.total_score || 0), 0) / results.length).toFixed(1)
    : 0

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Marks Summary</h1>
        <p className="page-subtitle">Grade distribution and performance analysis per unit.</p>
      </div>

      <div className="form-group" style={{ maxWidth: 420, marginBottom: 'var(--sp-6)' }}>
        <label className="form-label">Select Unit Offering</label>
        <select className="form-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Choose a unit…</option>
          {offerings.map((o) => <option key={o.id} value={o.id}>{o.unit_code} — {o.unit_name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : selected && results.length > 0 ? (
        <>
          {/* Stats */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 'var(--sp-6)' }}>
            {[
              { label:'Total Students', value: results.length,  color:'var(--color-primary)' },
              { label:'Average Score',  value: `${avgScore}%`,  color:'#7c3aed' },
              { label:'Pass Rate',      value: `${passRate}%`,  color:'var(--color-success)' },
              { label:'Failed',         value: failCount,        color:'var(--color-danger)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card card-padded" style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Chart + Table */}
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 'var(--sp-4)' }}>
            <div className="card card-padded">
              <h4 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--sp-4)' }}>Grade Distribution</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {chartData.map((d) => <Cell key={d.grade} fill={GRADE_COLORS[d.grade] || '#003087'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="table-wrapper" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
              <table className="table">
                <thead><tr><th>Reg. Number</th><th>Student</th><th>CAT</th><th>Exam</th><th>Total</th><th>Grade</th><th>Status</th></tr></thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td><span className="table-mono">{r.reg_number}</span></td>
                      <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                      <td>{Number(r.cat_total  || 0).toFixed(1)}</td>
                      <td>{Number(r.exam_score || 0).toFixed(1)}</td>
                      <td><strong>{Number(r.total_score || 0).toFixed(1)}</strong></td>
                      <td>
                        <span style={{ color: GRADE_COLORS[r.grade] || '#666', fontWeight: 700 }}>{r.grade || '—'}</span>
                      </td>
                      <td>
                        <span className={`badge ${r.status === 'pass' ? 'badge-active' : 'badge-danger'}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : selected ? (
        <div className="card card-padded"><div className="empty-state"><div className="empty-state-title">No results computed yet</div></div></div>
      ) : null}
    </div>
  )
}