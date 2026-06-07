/**
 * UON College ERP System — Root Router
 * Protected routes with role-based access + layout shell.
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

// ─── Eager-loaded pages (small, always needed) ───────────
import Login from './pages/Login'

// ─── Lazy-loaded pages ───────────────────────────────────
const Dashboard = lazy(() => import('./pages/Dashboard'))

// Admin
const AdminDashboard       = lazy(() => import('./pages/admin/AdminDashboard'))
const UserManagement       = lazy(() => import('./pages/admin/UserManagement'))
const ProgrammeManagement  = lazy(() => import('./pages/admin/ProgrammeManagement'))
const DepartmentManagement = lazy(() => import('./pages/admin/DepartmentManagement'))
const FacultyManagement    = lazy(() => import('./pages/admin/FacultyManagement'))
const IntakeManagement     = lazy(() => import('./pages/admin/IntakeManagement'))
const AcademicYearManagement = lazy(() => import('./pages/admin/AcademicYearManagement'))
const SystemSettings       = lazy(() => import('./pages/admin/SystemSettings'))

// Student
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const MyProfile        = lazy(() => import('./pages/student/MyProfile'))
const MyUnits          = lazy(() => import('./pages/student/MyUnits'))
const MyResults        = lazy(() => import('./pages/student/MyResults'))
const MyFees           = lazy(() => import('./pages/student/MyFees'))
const MyTimetable      = lazy(() => import('./pages/student/MyTimetable'))
const MyDocuments      = lazy(() => import('./pages/student/MyDocuments'))

// Lecturer
const LecturerDashboard = lazy(() => import('./pages/lecturer/LecturerDashboard'))
const LecturerUnits     = lazy(() => import('./pages/lecturer/LecturerUnits'))
const ClassList         = lazy(() => import('./pages/lecturer/ClassList'))
const EnterMarks        = lazy(() => import('./pages/lecturer/EnterMarks'))
const MarksSummary      = lazy(() => import('./pages/lecturer/MarksSummary'))

// COD
const CodDashboard        = lazy(() => import('./pages/cod/CodDashboard'))
const DepartmentStudents  = lazy(() => import('./pages/cod/DepartmentStudents'))
const DepartmentProgrammes = lazy(() => import('./pages/cod/DepartmentProgrammes'))
const ApproveMarks        = lazy(() => import('./pages/cod/ApproveMarks'))
const StaffManagement     = lazy(() => import('./pages/cod/StaffManagement'))

// Dean
const DeanDashboard      = lazy(() => import('./pages/dean/DeanDashboard'))
const FacultyOverview    = lazy(() => import('./pages/dean/FacultyOverview'))
const ApprovePromotions  = lazy(() => import('./pages/dean/ApprovePromotions'))
const FacultyReports     = lazy(() => import('./pages/dean/FacultyReports'))

// Finance
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'))
const FeeStructures    = lazy(() => import('./pages/finance/FeeStructures'))
const StudentPayments  = lazy(() => import('./pages/finance/StudentPayments'))
const Invoices         = lazy(() => import('./pages/finance/Invoices'))
const FinanceReports   = lazy(() => import('./pages/finance/FinanceReports'))

// ─────────────────────────────────────────────────────────
// LOADERS
// ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="page-loader">
    <div className="spinner spinner-lg" />
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
      Loading…
    </span>
  </div>
)

const FullscreenLoader = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--color-bg)',
    flexDirection: 'column', gap: '16px',
  }}>
    <div style={{
      width: 52, height: 52, background: 'linear-gradient(135deg, #C8A951, #a8893a)',
      borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: 20,
      color: '#001d52',
    }}>UON</div>
    <div className="spinner" />
  </div>
)

// ─────────────────────────────────────────────────────────
// PROTECTED ROUTE
// ─────────────────────────────────────────────────────────
const ProtectedRoute = ({ roles }) => {
  const { isAuth, user, loading } = useAuth()

  if (loading) return <FullscreenLoader />
  if (!isAuth) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }
  return <Outlet />
}

// ─────────────────────────────────────────────────────────
// LAYOUT SHELL
// ─────────────────────────────────────────────────────────
const AppLayout = () => (
  <div className="app-layout">
    <Sidebar />
    <div className="app-main">
      <Navbar />
      <main className="app-content">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────
// PUBLIC ROUTE (redirect authenticated users)
// ─────────────────────────────────────────────────────────
const PublicRoute = ({ children }) => {
  const { isAuth, user, loading } = useAuth()
  if (loading) return <FullscreenLoader />
  if (isAuth && user) {
    const dest = {
      admin: '/admin/dashboard', student: '/student/dashboard',
      lecturer: '/lecturer/dashboard', cod: '/cod/dashboard',
      dean: '/dean/dashboard', finance: '/finance/dashboard',
    }[user.role] || '/'
    return <Navigate to={dest} replace />
  }
  return children
}

// ─────────────────────────────────────────────────────────
// UNAUTHORIZED
// ─────────────────────────────────────────────────────────
const Unauthorized = () => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', minHeight:'60vh', gap:16 }}>
    <div style={{ fontSize:64 }}>🚫</div>
    <h2 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-2xl)' }}>
      Access Denied
    </h2>
    <p style={{ color:'var(--color-text-muted)' }}>
      You don't have permission to access this page.
    </p>
    <a href="/" className="btn btn-primary">Go to Dashboard</a>
  </div>
)

const NotFound = () => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', minHeight:'60vh', gap:16 }}>
    <div style={{ fontSize:64 }}>🔍</div>
    <h2 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-2xl)' }}>
      Page Not Found
    </h2>
    <p style={{ color:'var(--color-text-muted)' }}>
      The page you're looking for doesn't exist.
    </p>
    <a href="/" className="btn btn-primary">Go Home</a>
  </div>
)

// ─────────────────────────────────────────────────────────
// APP ROUTER
// ─────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />

      {/* Root redirect */}
      <Route path="/" element={
        <ProtectedRoute />
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Dashboard — role-aware redirect */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={
            <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
          } />
        </Route>
      </Route>

      {/* ── ADMIN ROUTES ─────────────────────────── */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard"          element={<AdminDashboard />} />
          <Route path="/admin/users"              element={<UserManagement />} />
          <Route path="/admin/programmes"         element={<ProgrammeManagement />} />
          <Route path="/admin/departments"        element={<DepartmentManagement />} />
          <Route path="/admin/faculties"          element={<FacultyManagement />} />
          <Route path="/admin/intakes"            element={<IntakeManagement />} />
          <Route path="/admin/academic-years"     element={<AcademicYearManagement />} />
          <Route path="/admin/settings"           element={<SystemSettings />} />
        </Route>
      </Route>

      {/* ── STUDENT ROUTES ───────────────────────── */}
      <Route element={<ProtectedRoute roles={['student']} />}>
        <Route element={<AppLayout />}>
          <Route path="/student/dashboard"   element={<StudentDashboard />} />
          <Route path="/student/profile"     element={<MyProfile />} />
          <Route path="/student/units"       element={<MyUnits />} />
          <Route path="/student/results"     element={<MyResults />} />
          <Route path="/student/fees"        element={<MyFees />} />
          <Route path="/student/timetable"   element={<MyTimetable />} />
          <Route path="/student/documents"   element={<MyDocuments />} />
        </Route>
      </Route>

      {/* ── LECTURER ROUTES ──────────────────────── */}
      <Route element={<ProtectedRoute roles={['lecturer']} />}>
        <Route element={<AppLayout />}>
          <Route path="/lecturer/dashboard"  element={<LecturerDashboard />} />
          <Route path="/lecturer/units"      element={<LecturerUnits />} />
          <Route path="/lecturer/classlist"  element={<ClassList />} />
          <Route path="/lecturer/marks"      element={<EnterMarks />} />
          <Route path="/lecturer/summary"    element={<MarksSummary />} />
        </Route>
      </Route>

      {/* ── COD ROUTES ───────────────────────────── */}
      <Route element={<ProtectedRoute roles={['cod']} />}>
        <Route element={<AppLayout />}>
          <Route path="/cod/dashboard"       element={<CodDashboard />} />
          <Route path="/cod/students"        element={<DepartmentStudents />} />
          <Route path="/cod/programmes"      element={<DepartmentProgrammes />} />
          <Route path="/cod/approve-marks"   element={<ApproveMarks />} />
          <Route path="/cod/staff"           element={<StaffManagement />} />
        </Route>
      </Route>

      {/* ── DEAN ROUTES ──────────────────────────── */}
      <Route element={<ProtectedRoute roles={['dean']} />}>
        <Route element={<AppLayout />}>
          <Route path="/dean/dashboard"      element={<DeanDashboard />} />
          <Route path="/dean/overview"       element={<FacultyOverview />} />
          <Route path="/dean/promotions"     element={<ApprovePromotions />} />
          <Route path="/dean/reports"        element={<FacultyReports />} />
        </Route>
      </Route>

      {/* ── FINANCE ROUTES ───────────────────────── */}
      <Route element={<ProtectedRoute roles={['finance']} />}>
        <Route element={<AppLayout />}>
          <Route path="/finance/dashboard"   element={<FinanceDashboard />} />
          <Route path="/finance/fees"        element={<FeeStructures />} />
          <Route path="/finance/payments"    element={<StudentPayments />} />
          <Route path="/finance/invoices"    element={<Invoices />} />
          <Route path="/finance/reports"     element={<FinanceReports />} />
        </Route>
      </Route>

      {/* Fallbacks */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}