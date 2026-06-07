/**
 * Dashboard — role-aware redirect hub.
 * Redirects authenticated users to their role-specific dashboard.
 */

import { Navigate } from 'react-router-dom'
import { useAuth, ROLE_DASHBOARDS } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const dest = ROLE_DASHBOARDS[user?.role] || '/login'
  return <Navigate to={dest} replace />
}