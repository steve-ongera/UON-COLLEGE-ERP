import { useState, useEffect } from 'react'
import { dashboardAPI } from '../../services/api'
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, CreditCard, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

const METHOD_COLORS = { mpesa: '#16a34a', bank: '#0284c7', cash: '#d97706', scholarship: '#7c3aed' }

export default function FinanceDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  const breakdown = data?.payment_breakdown || {}
  const chartData = Object.entries(breakdown).map(([method, amount]) => ({
    method: method.charAt(0).toUpperCase() + method.slice(1),
    amount,
    color: METHOD_COLORS[method] || '#003087',
  }))

  const collectionRate = data?.total_billed > 0
    ? ((data.revenue_collected / data.total_billed) * 100).toFixed(1)
    : 0

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Finance Dashboard</h1>
        <p className="page-subtitle">Fee collection and financial overview for the current academic year.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          { label: 'Revenue Collected', value: `KES ${Number(data?.revenue_collected || 0).toLocaleString()}`, icon: DollarSign,    color: '#16a34a', bg: 'var(--color-success-light)' },
          { label: 'Total Billed',      value: `KES ${Number(data?.total_billed      || 0).toLocaleString()}`, icon: TrendingUp,    color: 'var(--color-primary)', bg: 'var(--color-primary-10)' },
          { label: 'Outstanding',       value: `KES ${Number(data?.outstanding_balance || 0).toLocaleString()}`, icon: AlertCircle, color: '#dc2626', bg: 'var(--color-danger-light)' },
          { label: 'Total Payments',    value: data?.total_payments   || 0,                                      icon: CreditCard,   color: '#0284c7', bg: 'var(--color-info-light)' },
          { label: 'Cleared Accounts',  value: data?.cleared_accounts || 0,                                      icon: CheckCircle,  color: '#16a34a', bg: 'var(--color-success-light)' },
          { label: 'Defaulters',        value: data?.defaulters       || 0,                                      icon: Users,        color: '#d97706', bg: 'var(--color-warning-light)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card" style={{ '--stat-color': color, '--stat-icon-bg': bg }}>
            <div className="stat-card-top"><div className="stat-icon-wrap"><Icon size={22} /></div></div>
            <div className="stat-value" style={{ fontSize: typeof value === 'string' && value.length > 10 ? 'var(--text-xl)' : 'var(--text-3xl)' }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
        {/* Collection Rate */}
        <div className="card card-padded">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-4)' }}>Collection Rate</h3>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              KES {Number(data?.revenue_collected || 0).toLocaleString()} of KES {Number(data?.total_billed || 0).toLocaleString()}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-success)' }}>{collectionRate}%</span>
          </div>
          <div className="progress" style={{ height: 12 }}>
            <div className="progress-bar success" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
          </div>
          <div className="info-divider" />
          <div className="info-grid">
            {[
              { label: 'Collected',    value: `KES ${Number(data?.revenue_collected || 0).toLocaleString()}` },
              { label: 'Outstanding',  value: `KES ${Number(data?.outstanding_balance || 0).toLocaleString()}` },
              { label: 'Cleared',      value: `${data?.cleared_accounts || 0} accounts` },
              { label: 'Defaulters',   value: `${data?.defaulters || 0} students` },
            ].map(({ label, value }) => (
              <div key={label} className="info-item">
                <div className="info-label">{label}</div>
                <div className="info-value">{value}</div>
              </div>
            ))}
          </div>
          <div className="info-divider" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <a href="/finance/payments"  className="btn btn-primary">Record Payment</a>
            <a href="/finance/invoices"  className="btn btn-outline">View Invoices</a>
            <a href="/finance/reports"   className="btn btn-ghost">Reports</a>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="card card-padded">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-4)' }}>By Payment Method</h3>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="method" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v) => [`KES ${Number(v).toLocaleString()}`, 'Amount']} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)' }}>
                {chartData.map((d) => (
                  <div key={d.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>{d.method}</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>KES {Number(d.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><div className="empty-state-title">No payment data yet</div></div>
          )}
        </div>
      </div>
    </div>
  )
}