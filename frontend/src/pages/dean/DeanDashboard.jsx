import { useState, useEffect } from 'react'
import { dashboardAPI } from '../../services/api'
import { Building, Users, TrendingUp, BookOpen, BarChart3, Award } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DeanDashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.get().then(setData).catch(() => toast.error('Failed to load')).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dean's Dashboard</h1>
        <p className="page-subtitle">{data?.faculty || 'Faculty overview'}</p>
      </div>
      <div className="stats-grid">
        {[
          { label:'Departments',      value: data?.departments       || 0, icon: Building,   color:'#003087', bg:'var(--color-primary-10)' },
          { label:'Programmes',       value: data?.programmes        || 0, icon: BookOpen,   color:'#7c3aed', bg:'#f5f3ff' },
          { label:'Active Students',  value: data?.active_students   || 0, icon: Users,      color:'#16a34a', bg:'var(--color-success-light)' },
          { label:'Lecturers',        value: data?.lecturers         || 0, icon: Award,      color:'#0284c7', bg:'var(--color-info-light)' },
          { label:'Faculty Avg GPA',  value: Number(data?.avg_gpa||0).toFixed(2), icon: TrendingUp, color:'#d97706', bg:'var(--color-warning-light)' },
          { label:'Pending Promotions',value: data?.pending_promotions||0, icon: BarChart3,  color:'#dc2626', bg:'var(--color-danger-light)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card" style={{ '--stat-color': color, '--stat-icon-bg': bg }}>
            <div className="stat-card-top"><div className="stat-icon-wrap"><Icon size={22} /></div></div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      <div className="card card-padded" style={{ marginTop: 'var(--sp-4)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', marginBottom: 'var(--sp-4)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          {[
            { label:'Faculty Overview',    href:'/dean/overview' },
            { label:'Approve Promotions',  href:'/dean/promotions' },
            { label:'Generate Reports',    href:'/dean/reports' },
          ].map(({ label, href }) => (
            <a key={href} href={href} className="btn btn-outline">{label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}