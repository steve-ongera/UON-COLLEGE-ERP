import { useState, useEffect } from 'react'
import { studentsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { DollarSign, CheckCircle, AlertCircle, Receipt, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

const METHOD_COLORS = {
  mpesa: '#16a34a', bank: '#0284c7', cash: '#d97706',
  scholarship: '#7c3aed', waiver: '#64748b', cheque: '#0f172a',
}

export default function MyFees() {
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('accounts')
  const [studentId, setStudentId] = useState(null)

  useEffect(() => {
    if (!user) return
    studentsAPI.list({ search: user.email })
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.results || []
        const me   = list[0]
        if (!me) throw new Error('Not found')
        setStudentId(me.id)
        return studentsAPI.fees(me.id)
      })
      .then(setData)
      .catch(() => toast.error('Failed to load fee data'))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>

  const accounts = data?.accounts || []
  const payments = data?.payments || []
  const invoices = data?.invoices || []

  const totalBilled  = accounts.reduce((s, a) => s + Number(a.total_billed || 0), 0)
  const totalPaid    = accounts.reduce((s, a) => s + Number(a.total_paid   || 0), 0)
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance      || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Fees</h1>
        <p className="page-subtitle">Fee account summary, payments, and invoices.</p>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card" style={{ '--stat-color': 'var(--color-primary)', '--stat-icon-bg': 'var(--color-primary-10)' }}>
          <div className="stat-card-top"><div className="stat-icon-wrap"><DollarSign size={22} /></div></div>
          <div className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>KES {totalBilled.toLocaleString()}</div>
          <div className="stat-label">Total Billed</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': 'var(--color-success)', '--stat-icon-bg': 'var(--color-success-light)' }}>
          <div className="stat-card-top"><div className="stat-icon-wrap"><CheckCircle size={22} /></div></div>
          <div className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>KES {totalPaid.toLocaleString()}</div>
          <div className="stat-label">Total Paid</div>
        </div>
        <div className="stat-card" style={{
          '--stat-color': totalBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)',
          '--stat-icon-bg': totalBalance > 0 ? 'var(--color-danger-light)' : 'var(--color-success-light)',
        }}>
          <div className="stat-card-top">
            <div className="stat-icon-wrap">
              {totalBalance > 0 ? <AlertCircle size={22} /> : <CheckCircle size={22} />}
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: 'var(--text-xl)' }}>KES {totalBalance.toLocaleString()}</div>
          <div className="stat-label">{totalBalance <= 0 ? 'Fully Cleared' : 'Outstanding Balance'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['accounts','Fee Accounts'],['payments','Payment History'],['invoices','Invoices']].map(([k,l]) => (
          <button key={k} className={`tab-item ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* Fee Accounts */}
      {tab === 'accounts' && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Academic Year</th><th>Billed (KES)</th><th>Paid (KES)</th><th>Balance (KES)</th><th>Status</th></tr>
            </thead>
            <tbody>
              {accounts.length === 0
                ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-title">No fee accounts</div></div></td></tr>
                : accounts.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.academic_year_label}</td>
                  <td>{Number(a.total_billed).toLocaleString()}</td>
                  <td>{Number(a.total_paid).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: Number(a.balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {Number(a.balance).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${a.is_cleared ? 'badge-active' : 'badge-danger'}`}>
                      {a.is_cleared ? 'Cleared' : 'Outstanding'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Amount (KES)</th><th>Method</th><th>Reference</th><th>Semester</th><th>Status</th></tr>
            </thead>
            <tbody>
              {payments.length === 0
                ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-title">No payments recorded</div></div></td></tr>
                : payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontSize: 12 }}>{p.payment_date}</td>
                  <td><strong>{Number(p.amount).toLocaleString()}</strong></td>
                  <td>
                    <span className="badge" style={{
                      background: `${METHOD_COLORS[p.payment_method]}18`,
                      color: METHOD_COLORS[p.payment_method],
                    }}>
                      {p.payment_method_display}
                    </span>
                  </td>
                  <td><span className="table-mono">{p.reference_number}</span></td>
                  <td style={{ fontSize: 12 }}>{p.semester_name || '—'}</td>
                  <td>
                    <span className={`badge ${p.is_reversed ? 'badge-danger' : 'badge-active'}`}>
                      {p.is_reversed ? 'Reversed' : 'Confirmed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Invoice #</th><th>Semester</th><th>Amount Due</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {invoices.length === 0
                ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-title">No invoices</div></div></td></tr>
                : invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><span className="table-mono">{inv.invoice_number}</span></td>
                  <td style={{ fontSize: 12 }}>{inv.semester_name}</td>
                  <td>{Number(inv.amount_due).toLocaleString()}</td>
                  <td>{Number(inv.amount_paid).toLocaleString()}</td>
                  <td style={{ color: Number(inv.balance) > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                    {Number(inv.balance).toLocaleString()}
                  </td>
                  <td style={{ fontSize: 12 }}>{inv.due_date}</td>
                  <td><span className={`badge ${inv.is_paid ? 'badge-active' : 'badge-danger'}`}>{inv.is_paid ? 'Paid' : 'Unpaid'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}