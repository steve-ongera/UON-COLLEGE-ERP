/**
 * UON College ERP System — Auth Context
 * Single context for all authentication state and helpers.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

// Role → default dashboard route
export const ROLE_DASHBOARDS = {
  admin:    '/admin/dashboard',
  student:  '/student/dashboard',
  lecturer: '/lecturer/dashboard',
  cod:      '/cod/dashboard',
  dean:     '/dean/dashboard',
  finance:  '/finance/dashboard',
}

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()

  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)   // initial auth check
  const [isAuth,  setIsAuth]  = useState(false)

  // ── Rehydrate from localStorage on mount ──────────────
  useEffect(() => {
    const init = async () => {
      const token    = localStorage.getItem('access_token')
      const saved    = localStorage.getItem('uon_user')

      if (!token || !saved) {
        setLoading(false)
        return
      }

      try {
        setUser(JSON.parse(saved))
        setIsAuth(true)
        // Verify token is still valid by fetching /me
        const fresh = await authAPI.me()
        setUser(fresh)
        localStorage.setItem('uon_user', JSON.stringify(fresh))
      } catch {
        // Token expired — try to refresh
        const refresh = localStorage.getItem('refresh_token')
        if (refresh) {
          try {
            const res = await authAPI.refresh(refresh)
            localStorage.setItem('access_token', res.access)
            const me = await authAPI.me()
            setUser(me)
            setIsAuth(true)
            localStorage.setItem('uon_user', JSON.stringify(me))
          } catch {
            _clearSession()
          }
        } else {
          _clearSession()
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // ── Login ──────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const data = await authAPI.login(email, password)
    // data = { access, refresh, user }
    localStorage.setItem('access_token',  data.access)
    localStorage.setItem('refresh_token', data.refresh)
    localStorage.setItem('uon_user',      JSON.stringify(data.user))

    setUser(data.user)
    setIsAuth(true)

    const destination = ROLE_DASHBOARDS[data.user.role] || '/'
    navigate(destination, { replace: true })
    toast.success(`Welcome back, ${data.user.first_name || data.user.email}!`)
    return data
  }, [navigate])

  // ── Logout ─────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh_token')
    try {
      if (refresh) await authAPI.logout(refresh)
    } catch { /* ignore */ }
    _clearSession()
    navigate('/login', { replace: true })
    toast.success('Logged out successfully.')
  }, [navigate])

  // ── Update user in state (partial) ────────────────────
  const updateUser = useCallback((data) => {
    setUser((prev) => {
      const updated = { ...prev, ...data }
      localStorage.setItem('uon_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  // ── Role helpers ───────────────────────────────────────
  const hasRole = useCallback((...roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const isAdmin    = () => hasRole('admin')
  const isStudent  = () => hasRole('student')
  const isLecturer = () => hasRole('lecturer')
  const isCOD      = () => hasRole('cod')
  const isDean     = () => hasRole('dean')
  const isFinance  = () => hasRole('finance')
  const isStaff    = () => hasRole('admin', 'lecturer', 'cod', 'dean')

  // ── Helpers ────────────────────────────────────────────
  const getDashboardPath = () => ROLE_DASHBOARDS[user?.role] || '/'

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  }

  // ── Internal ───────────────────────────────────────────
  const _clearSession = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('uon_user')
    setUser(null)
    setIsAuth(false)
  }

  const value = {
    user,
    loading,
    isAuth,
    login,
    logout,
    updateUser,
    hasRole,
    isAdmin,
    isStudent,
    isLecturer,
    isCOD,
    isDean,
    isFinance,
    isStaff,
    getDashboardPath,
    getInitials,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default AuthContext