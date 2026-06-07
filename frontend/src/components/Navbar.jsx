/**
 * UON College ERP System — Navbar Component
 * Top navigation bar with semester badge, notifications, user dropdown.
 */

import { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Bell, ChevronDown, User, Lock, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { semestersAPI } from '../services/api'

// Map route segments → human-readable page titles
const PAGE_TITLES = {
  dashboard:      'Dashboard',
  // Admin
  users:          'User Management',
  programmes:     'Programme Management',
  departments:    'Departments',
  faculties:      'Faculties',
  intakes:        'Intake Management',
  'academic-years': 'Academic Years',
  settings:       'System Settings',
  // Student
  profile:        'My Profile',
  units:          'My Units',
  results:        'My Results',
  fees:           'My Fees',
  timetable:      'My Timetable',
  documents:      'My Documents',
  // Lecturer
  classlist:      'Class Lists',
  marks:          'Enter Marks',
  summary:        'Marks Summary',
  // COD
  students:       'Students',
  'approve-marks': 'Approve Marks',
  staff:          'Staff Management',
  // Dean
  overview:       'Faculty Overview',
  promotions:     'Approve Promotions',
  reports:        'Reports',
  // Finance
  payments:       'Student Payments',
  invoices:       'Invoices',
}

export default function Navbar() {
  const { user, logout, getInitials } = useAuth()
  const location = useLocation()

  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [currentSemester, setCurrentSemester] = useState(null)
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const dropdownRef = useRef(null)

  // Derive page title from pathname
  const segments  = location.pathname.split('/').filter(Boolean)
  const lastSeg   = segments[segments.length - 1]
  const pageTitle = PAGE_TITLES[lastSeg] || 'ERP System'

  // Fetch current semester once
  useEffect(() => {
    semestersAPI.current()
      .then((data) => setCurrentSemester(data))
      .catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Toggle mobile sidebar
  const toggleSidebar = () => {
    const sidebar = document.querySelector('.app-sidebar')
    if (sidebar) sidebar.classList.toggle('open')
  }

  return (
    <header className="app-navbar">
      <div className="navbar-inner">
        {/* Left */}
        <div className="navbar-left">
          {/* Mobile hamburger */}
          <button
            className="navbar-btn"
            onClick={toggleSidebar}
            style={{ display: 'none' }}
            id="sidebar-toggle"
          >
            <Menu size={18} />
          </button>

          <h1 className="navbar-page-title">{pageTitle}</h1>

          {currentSemester && (
            <span className="navbar-semester-badge">
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--color-primary)', display: 'inline-block',
              }} />
              {currentSemester.name}
            </span>
          )}
        </div>

        {/* Right */}
        <div className="navbar-right">
          {/* Notifications */}
          <button className="navbar-btn" title="Notifications">
            <Bell size={17} />
            <span className="navbar-notif-dot" />
          </button>

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="navbar-avatar-btn"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <div className="navbar-avatar">
                {user?.profile_picture
                  ? <img src={user.profile_picture} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                  : getInitials(`${user?.first_name} ${user?.last_name}`)
                }
              </div>
              <span className="navbar-user-name">
                {user?.first_name} {user?.last_name}
              </span>
              <ChevronDown
                size={14}
                style={{
                  color: 'var(--color-text-muted)',
                  transition: 'transform 0.15s',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                {/* User info header */}
                <div style={{
                  padding: '12px 16px 10px',
                  borderBottom: '1px solid var(--color-border)',
                  marginBottom: 4,
                }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {user?.email}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge badge-role-${user?.role}`} style={{ fontSize: 10 }}>
                      {user?.role?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false)
                    const profilePaths = {
                      student:  '/student/profile',
                      admin:    '/admin/settings',
                      lecturer: '/lecturer/dashboard',
                      cod:      '/cod/dashboard',
                      dean:     '/dean/dashboard',
                      finance:  '/finance/dashboard',
                    }
                    window.location.href = profilePaths[user?.role] || '/'
                  }}
                >
                  <User size={14} /> My Profile
                </button>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-item danger"
                  onClick={() => { setDropdownOpen(false); logout() }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar toggle (CSS shows this on small screens) */}
      <style>{`
        @media (max-width: 768px) {
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </header>
  )
}