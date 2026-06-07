/**
 * UON College ERP System — Sidebar Component
 * Role-based navigation with UON navy/gold branding.
 */

import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, BookOpen, Building2, GraduationCap,
  Calendar, Settings, UserCheck, ClipboardList, FileText,
  TrendingUp, DollarSign, Receipt, BarChart3, Award,
  School, ChevronRight, LogOut, Bell, BookMarked,
  ClipboardCheck, UserCog, Layers, CalendarDays,
  Wallet, FileBarChart2, CreditCard, Building,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ─────────────────────────────────────────────────────────
// NAV CONFIG PER ROLE
// ─────────────────────────────────────────────────────────
const NAV_CONFIG = {
  admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard',      to: '/admin/dashboard',      icon: LayoutDashboard },
      ],
    },
    {
      section: 'Academic Setup',
      items: [
        { label: 'Faculties',      to: '/admin/faculties',       icon: Building },
        { label: 'Departments',    to: '/admin/departments',     icon: Building2 },
        { label: 'Programmes',     to: '/admin/programmes',      icon: BookOpen },
        { label: 'Academic Years', to: '/admin/academic-years',  icon: CalendarDays },
        { label: 'Intakes',        to: '/admin/intakes',         icon: Calendar },
      ],
    },
    {
      section: 'Users',
      items: [
        { label: 'User Management', to: '/admin/users',          icon: Users },
      ],
    },
    {
      section: 'System',
      items: [
        { label: 'Settings',       to: '/admin/settings',        icon: Settings },
      ],
    },
  ],

  student: [
    {
      section: 'My Academic',
      items: [
        { label: 'Dashboard',    to: '/student/dashboard',   icon: LayoutDashboard },
        { label: 'My Units',     to: '/student/units',       icon: BookOpen },
        { label: 'My Results',   to: '/student/results',     icon: Award },
        { label: 'My Timetable', to: '/student/timetable',   icon: Calendar },
      ],
    },
    {
      section: 'Personal',
      items: [
        { label: 'My Profile',   to: '/student/profile',     icon: UserCheck },
        { label: 'My Fees',      to: '/student/fees',        icon: Wallet },
        { label: 'Documents',    to: '/student/documents',   icon: FileText },
      ],
    },
  ],

  lecturer: [
    {
      section: 'Teaching',
      items: [
        { label: 'Dashboard',     to: '/lecturer/dashboard',  icon: LayoutDashboard },
        { label: 'My Units',      to: '/lecturer/units',      icon: BookOpen },
        { label: 'Class Lists',   to: '/lecturer/classlist',  icon: ClipboardList },
      ],
    },
    {
      section: 'Assessment',
      items: [
        { label: 'Enter Marks',   to: '/lecturer/marks',      icon: ClipboardCheck },
        { label: 'Marks Summary', to: '/lecturer/summary',    icon: BarChart3 },
      ],
    },
  ],

  cod: [
    {
      section: 'Department',
      items: [
        { label: 'Dashboard',     to: '/cod/dashboard',        icon: LayoutDashboard },
        { label: 'Students',      to: '/cod/students',         icon: GraduationCap },
        { label: 'Programmes',    to: '/cod/programmes',       icon: BookOpen },
        { label: 'Staff',         to: '/cod/staff',            icon: UserCog },
      ],
    },
    {
      section: 'Academic',
      items: [
        { label: 'Approve Marks', to: '/cod/approve-marks',   icon: ClipboardCheck },
      ],
    },
  ],

  dean: [
    {
      section: 'Faculty',
      items: [
        { label: 'Dashboard',     to: '/dean/dashboard',       icon: LayoutDashboard },
        { label: 'Overview',      to: '/dean/overview',        icon: Layers },
        { label: 'Promotions',    to: '/dean/promotions',      icon: TrendingUp },
        { label: 'Reports',       to: '/dean/reports',         icon: FileBarChart2 },
      ],
    },
  ],

  finance: [
    {
      section: 'Finance',
      items: [
        { label: 'Dashboard',     to: '/finance/dashboard',    icon: LayoutDashboard },
        { label: 'Fee Structures', to: '/finance/fees',        icon: DollarSign },
        { label: 'Payments',      to: '/finance/payments',     icon: CreditCard },
        { label: 'Invoices',      to: '/finance/invoices',     icon: Receipt },
        { label: 'Reports',       to: '/finance/reports',      icon: BarChart3 },
      ],
    },
  ],
}

const ROLE_DISPLAY = {
  admin:    'Administrator',
  student:  'Student',
  lecturer: 'Lecturer',
  cod:      'Chair of Dept.',
  dean:     'Faculty Dean',
  finance:  'Finance Officer',
}

// ─────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, logout, getInitials } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(true)   // desktop collapsed state

  // Close on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 769) setOpen(false)
  }, [location.pathname])

  const navGroups = NAV_CONFIG[user?.role] || []

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="drawer-overlay"
          style={{ zIndex: 99 }}
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`app-sidebar ${open ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">UON</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">UON ERP</div>
            <div className="sidebar-brand-sub">University of Nairobi</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `sidebar-nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <Icon className="sidebar-nav-icon" size={18} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-nav-badge">{item.badge}</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer user card */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {user?.profile_picture
                ? <img src={user.profile_picture} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                : getInitials(`${user?.first_name} ${user?.last_name}`)
              }
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="sidebar-user-role">
                {ROLE_DISPLAY[user?.role]}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.45)', padding: '4px',
                borderRadius: '6px', display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
                flexShrink: 0,
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
              onMouseOut={(e)  => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}