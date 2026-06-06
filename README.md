# UON College ERP System

> **University of Nairobi — Enterprise Resource Planning System**
> A full-stack academic management platform supporting multi-programme, multi-intake, role-based academic operations.

---

##  Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Roles & Access](#roles--access)
- [Programme Support](#programme-support)
- [Project Structure](#project-structure)
  - [Backend Structure](#backend-structure)
  - [Frontend Structure](#frontend-structure)
- [Backend Architecture](#backend-architecture)
  - [models.py](#modelspy)
  - [serializers.py](#serializerspy)
  - [views.py](#viewspy)
  - [urls.py (app)](#urlspy-app)
  - [urls.py (main)](#urlspy-main)
- [Frontend Architecture](#frontend-architecture)
  - [index.html](#indexhtml)
  - [main.jsx](#mainjsx)
  - [App.jsx](#appjsx)
  - [AuthContext.jsx](#authcontextjsx)
  - [services/api.js](#servicesapijs)
  - [Pages](#pages)
  - [Components](#components)
  - [styles/general.css](#stylesgeneralcss)
- [API Endpoints Reference](#api-endpoints-reference)
- [Authentication Flow](#authentication-flow)
- [Academic Workflow](#academic-workflow)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Database Schema Overview](#database-schema-overview)

---

## Overview

The UON ERP System is a comprehensive academic management platform for the University of Nairobi. It handles:

- **Multi-programme management** — Certificate, Diploma, Undergraduate, Postgraduate, PhD
- **Multi-intake enrollment** — January, May, September intakes per academic year
- **Flexible programme duration** — 2, 3, 4, 5-year programmes with 2 or 3 semesters per year
- **Role-based access control** — 6 distinct roles with separate dashboards and permissions
- **Full academic lifecycle** — Enrollment → Units → CATs → Exams → Grades → Promotion → Graduation
- **Financial management** — Fee structures, payments, balances, invoicing
- **Student promotion engine** — Automatic/manual semester and year promotion with GPA tracking

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | Django 4.2+ |
| API | Django REST Framework (DRF) |
| Auth | JWT via `djangorestframework-simplejwt` |
| Database | PostgreSQL 15+ |
| File Storage | Django media (local) / S3 (prod) |
| CORS | `django-cors-headers` |
| Filtering | `django-filter` |
| Environment | `python-decouple` |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| HTTP Client | Axios |
| State | React Context API (single context) |
| Styling | Plain CSS (styles/general.css) |
| Icons | Lucide React |
| Charts | Recharts |
| Notifications | React Hot Toast |

---

## Roles & Access

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `admin` | System Administrator | Full CRUD on all entities, user management, system config |
| `student` | Enrolled Student | View own profile, results, timetable, fee balance, units |
| `lecturer` | Teaching Staff | Enter CAT/Exam marks, view assigned units & class lists |
| `cod` | Chair of Department | Approve marks, manage department programmes & staff |
| `dean` | Faculty Dean | Faculty-wide oversight, approve promotions, reports |
| `finance` | Finance Officer | Manage fee structures, process payments, generate invoices |

---

## Programme Support

| Programme Type | Example Durations | Semesters/Year |
|---------------|------------------|----------------|
| Certificate | 1 year, 2 years | 2 or 3 |
| Diploma | 2 years, 3 years | 2 or 3 |
| Undergraduate Degree | 3 years, 4 years | 2 or 3 |
| Postgraduate Diploma | 1 year, 2 years | 2 |
| Masters | 2 years | 2 |
| PhD | 3 years, 4 years, 5 years | 2 |

---

## Project Structure

```
uon-erp/
├── backend/                          # Django Backend
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env
│   ├── uon_erp/                      # Django Project Root
│   │   ├── __init__.py
│   │   ├── settings.py               # All settings (DB, JWT, CORS, etc.)
│   │   ├── urls.py                   # Main URL configuration
│   │   └── wsgi.py
│   └── core/                         # Single Core Application
│       ├── __init__.py
│       ├── admin.py                  # Django admin registrations
│       ├── apps.py
│       ├── models.py                 # ALL models (see breakdown below)
│       ├── serializers.py            # ALL serializers
│       ├── views.py                  # ALL viewsets & API views
│       ├── urls.py                   # App-level URL patterns
│       ├── permissions.py            # Custom DRF permission classes
│       ├── filters.py                # django-filter FilterSets
│       ├── signals.py                # Django signals (auto-actions)
│       └── utils.py                  # Helpers: GPA calc, promotion logic
│
└── frontend/                         # React + Vite Frontend
    ├── index.html                    # HTML shell (Vite entry point)
    ├── vite.config.js
    ├── package.json
    ├── .env
    └── src/
        ├── main.jsx                  # React DOM entry — mounts <App />
        ├── App.jsx                   # Router, protected routes, layout shell
        ├── context/
        │   └── AuthContext.jsx       # SINGLE context: auth state + helpers
        ├── services/
        │   └── api.js                # Axios instance + ALL API call functions
        ├── components/
        │   ├── Navbar.jsx            # Top navigation bar (role-aware)
        │   └── Sidebar.jsx           # Left sidebar (role-based nav links)
        ├── pages/
        │   ├── Login.jsx             # Login page (role-based redirect)
        │   ├── Dashboard.jsx         # Role-aware dashboard hub
        │   │
        │   ├── admin/
        │   │   ├── AdminDashboard.jsx
        │   │   ├── UserManagement.jsx
        │   │   ├── ProgrammeManagement.jsx
        │   │   ├── DepartmentManagement.jsx
        │   │   ├── FacultyManagement.jsx
        │   │   ├── IntakeManagement.jsx
        │   │   ├── AcademicYearManagement.jsx
        │   │   └── SystemSettings.jsx
        │   │
        │   ├── student/
        │   │   ├── StudentDashboard.jsx
        │   │   ├── MyProfile.jsx
        │   │   ├── MyUnits.jsx
        │   │   ├── MyResults.jsx
        │   │   ├── MyFees.jsx
        │   │   ├── MyTimetable.jsx
        │   │   └── MyDocuments.jsx
        │   │
        │   ├── lecturer/
        │   │   ├── LecturerDashboard.jsx
        │   │   ├── MyUnits.jsx
        │   │   ├── ClassList.jsx
        │   │   ├── EnterMarks.jsx
        │   │   └── MarksSummary.jsx
        │   │
        │   ├── cod/
        │   │   ├── CodDashboard.jsx
        │   │   ├── DepartmentStudents.jsx
        │   │   ├── DepartmentProgrammes.jsx
        │   │   ├── ApproveMarks.jsx
        │   │   └── StaffManagement.jsx
        │   │
        │   ├── dean/
        │   │   ├── DeanDashboard.jsx
        │   │   ├── FacultyOverview.jsx
        │   │   ├── ApprovePromotions.jsx
        │   │   └── FacultyReports.jsx
        │   │
        │   └── finance/
        │       ├── FinanceDashboard.jsx
        │       ├── FeeStructures.jsx
        │       ├── StudentPayments.jsx
        │       ├── Invoices.jsx
        │       └── FinanceReports.jsx
        │
        └── styles/
            └── general.css           # Global styles, CSS variables, utilities
```

---

## Backend Architecture

### `models.py`

All models live in `core/models.py`. Below is the complete model inventory with relationships:

####  Institutional Models
```python
Faculty
├── id, name, code, dean (FK→User), created_at

Department
├── id, name, code, faculty (FK→Faculty), hod (FK→User), created_at

Programme
├── id, name, code, department (FK→Department)
├── programme_type: CHOICES ['certificate','diploma','undergraduate',
│                             'postgraduate_diploma','masters','phd']
├── duration_years: IntegerField (1–5)
├── semesters_per_year: IntegerField (2 or 3)
├── total_semesters: (computed: duration_years × semesters_per_year)
├── min_credits_to_pass, is_active
```

####  Academic Calendar Models
```python
AcademicYear
├── id, year_label (e.g. "2024/2025"), start_date, end_date, is_current

Intake
├── id, academic_year (FK→AcademicYear)
├── intake_month: CHOICES ['january','may','september']
├── name (e.g. "January 2024"), is_active

Semester
├── id, academic_year (FK→AcademicYear), intake (FK→Intake)
├── semester_number (1, 2, or 3)
├── start_date, end_date, is_current
├── registration_deadline, results_release_date
```

####  User & Profile Models
```python
User  (extends AbstractUser)
├── email, first_name, last_name
├── role: CHOICES ['admin','student','lecturer','cod','dean','finance']
├── phone, profile_picture, is_active

StudentProfile
├── user (OneToOne→User)
├── reg_number (unique, auto-generated)
├── programme (FK→Programme)
├── intake (FK→Intake)
├── current_semester_number: IntegerField
├── current_year_of_study: IntegerField
├── status: CHOICES ['active','deferred','discontinued','graduated','suspended']
├── sponsor: CHOICES ['self','government','bursary','scholarship']
├── date_of_birth, national_id, gender
├── guardian_name, guardian_phone
├── admission_date

LecturerProfile
├── user (OneToOne→User)
├── staff_number (unique)
├── department (FK→Department)
├── designation, specialization
├── date_joined
```

####  Academic Content Models
```python
Unit
├── id, code (unique), name, credit_hours
├── department (FK→Department)
├── unit_type: CHOICES ['core','elective','common']
├── year_of_study, semester_number
├── description

ProgrammeUnit  (M2M pivot)
├── programme (FK→Programme)
├── unit (FK→Unit)
├── is_compulsory

UnitOffering   (a unit offered in a specific semester)
├── unit (FK→Unit)
├── semester (FK→Semester)
├── lecturer (FK→User)
├── room, capacity, enrolled_count

Enrollment     (student registered to a unit offering)
├── student (FK→StudentProfile)
├── unit_offering (FK→UnitOffering)
├── enrolled_at, is_active
├── status: CHOICES ['registered','dropped','completed']
```

####  Assessment & Marks Models
```python
AssessmentType
├── name: CHOICES ['cat1','cat2','cat3','assignment','project','exam']
├── max_score, weight_percentage

UnitAssessment
├── unit_offering (FK→UnitOffering)
├── assessment_type (FK→AssessmentType)
├── due_date, is_released

StudentMark
├── enrollment (FK→Enrollment)
├── unit_assessment (FK→UnitAssessment)
├── score, submitted_at, marked_by (FK→User)
├── remarks

UnitResult     (aggregated per student per unit per semester)
├── enrollment (FK→Enrollment)
├── cat_total (CATs avg/sum)
├── exam_score
├── total_score (computed)
├── grade: CHOICES ['A','B+','B','C+','C','D+','D','E']
├── grade_points (GPA points)
├── status: CHOICES ['pass','fail','incomplete','absent']
├── is_approved (COD approved)
├── is_supplementary

SemesterResult (aggregated per student per semester)
├── student (FK→StudentProfile)
├── semester (FK→Semester)
├── gpa, cumulative_gpa
├── credits_attempted, credits_earned
├── status: CHOICES ['pass','fail','probation','repeat']
├── approved_by (FK→User), approved_at

AcademicPromotion
├── student (FK→StudentProfile)
├── from_semester, to_semester
├── from_year, to_year
├── promotion_type: CHOICES ['normal','supplementary','repeat','graduate']
├── promoted_by (FK→User), promoted_at
├── remarks
```

####  Finance Models
```python
FeeStructure
├── programme (FK→Programme)
├── academic_year (FK→AcademicYear)
├── semester_number
├── tuition_fee, registration_fee
├── examination_fee, library_fee
├── caution_money, other_fees
├── total_fee (computed)

StudentFeeAccount
├── student (FK→StudentProfile)
├── academic_year (FK→AcademicYear)
├── total_billed, total_paid, balance
├── is_cleared

Payment
├── student (FK→StudentProfile)
├── academic_year (FK→AcademicYear)
├── semester (FK→Semester)
├── amount, payment_date
├── payment_method: CHOICES ['mpesa','bank','cash','scholarship']
├── reference_number (unique)
├── received_by (FK→User), notes

Invoice
├── student (FK→StudentProfile)
├── semester (FK→Semester)
├── fee_structure (FK→FeeStructure)
├── amount_due, amount_paid, balance
├── due_date, is_paid, generated_at
```

####  Timetable Models
```python
Timetable
├── unit_offering (FK→UnitOffering)
├── day_of_week: CHOICES ['mon','tue','wed','thu','fri','sat']
├── start_time, end_time
├── venue, week_type: CHOICES ['all','odd','even']
```

---

### `serializers.py`

All serializers in `core/serializers.py`:

```
AuthTokenSerializer          — email + password → JWT tokens
UserSerializer               — full user with role
StudentProfileSerializer     — nested user + academic info
LecturerProfileSerializer    — nested user + department
FacultySerializer
DepartmentSerializer
ProgrammeSerializer          — nested department, computed fields
AcademicYearSerializer
IntakeSerializer
SemesterSerializer
UnitSerializer
UnitOfferingSerializer       — nested unit, lecturer, semester
EnrollmentSerializer
UnitAssessmentSerializer
StudentMarkSerializer        — write marks; read with student name
UnitResultSerializer         — computed grade display
SemesterResultSerializer     — GPA, status
AcademicPromotionSerializer
FeeStructureSerializer
StudentFeeAccountSerializer
PaymentSerializer
InvoiceSerializer
TimetableSerializer
DashboardStatsSerializer     — role-specific summary stats
```

---

### `views.py`

All views in `core/views.py` using DRF `ModelViewSet` with custom actions:

```
AuthViewSet
├── POST /auth/login/          — obtain JWT pair
├── POST /auth/refresh/        — refresh token
├── POST /auth/logout/         — blacklist token
└── GET  /auth/me/             — current user profile

UserViewSet                    — admin only: CRUD users, assign roles

StudentViewSet
├── list, retrieve, create, update, destroy
├── GET  .../students/{id}/results/       — full academic transcript
├── GET  .../students/{id}/fees/          — fee account + payments
├── POST .../students/{id}/promote/       — trigger promotion
└── GET  .../students/{id}/timetable/     — current timetable

LecturerViewSet
├── list, retrieve, create, update, destroy
└── GET .../lecturers/{id}/units/         — assigned units

ProgrammeViewSet              — CRUD programmes + nested units
DepartmentViewSet             — CRUD departments
FacultyViewSet                — CRUD faculties
AcademicYearViewSet           — CRUD academic years; set current
IntakeViewSet                 — CRUD intakes per academic year
SemesterViewSet               — CRUD semesters; set current

UnitViewSet                   — CRUD units
UnitOfferingViewSet
├── list, retrieve, create, update, destroy
└── GET .../offerings/{id}/classlist/     — enrolled students

EnrollmentViewSet             — enroll/drop students from units

AssessmentViewSet             — manage assessment types per unit
StudentMarkViewSet
├── list, create, update      — lecturers enter marks
└── POST .../marks/bulk/      — bulk mark entry

UnitResultViewSet
├── list, retrieve
└── POST .../results/approve/ — COD approves results

SemesterResultViewSet
├── list, retrieve
└── POST .../semester-results/compute/  — compute from unit results

PromotionViewSet
├── list, retrieve
└── POST .../promotions/bulk/           — bulk promote cohort

FeeStructureViewSet           — finance: CRUD fee structures
PaymentViewSet                — record & list payments
InvoiceViewSet                — generate & list invoices
StudentFeeAccountViewSet      — view/update student accounts

TimetableViewSet              — CRUD timetable entries

DashboardView                 — GET /dashboard/ → role-based stats
ReportsView                   — GET /reports/{type}/ → various exports
```

---

### `urls.py` (app — `core/urls.py`)

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users',             views.UserViewSet)
router.register(r'students',          views.StudentViewSet)
router.register(r'lecturers',         views.LecturerViewSet)
router.register(r'faculties',         views.FacultyViewSet)
router.register(r'departments',       views.DepartmentViewSet)
router.register(r'programmes',        views.ProgrammeViewSet)
router.register(r'academic-years',    views.AcademicYearViewSet)
router.register(r'intakes',           views.IntakeViewSet)
router.register(r'semesters',         views.SemesterViewSet)
router.register(r'units',             views.UnitViewSet)
router.register(r'unit-offerings',    views.UnitOfferingViewSet)
router.register(r'enrollments',       views.EnrollmentViewSet)
router.register(r'assessments',       views.AssessmentViewSet)
router.register(r'marks',             views.StudentMarkViewSet)
router.register(r'unit-results',      views.UnitResultViewSet)
router.register(r'semester-results',  views.SemesterResultViewSet)
router.register(r'promotions',        views.PromotionViewSet)
router.register(r'fee-structures',    views.FeeStructureViewSet)
router.register(r'payments',          views.PaymentViewSet)
router.register(r'invoices',          views.InvoiceViewSet)
router.register(r'fee-accounts',      views.StudentFeeAccountViewSet)
router.register(r'timetable',         views.TimetableViewSet)

urlpatterns = [
    path('auth/login/',   views.AuthViewSet.as_view({'post': 'login'})),
    path('auth/refresh/', views.AuthViewSet.as_view({'post': 'refresh'})),
    path('auth/logout/',  views.AuthViewSet.as_view({'post': 'logout'})),
    path('auth/me/',      views.AuthViewSet.as_view({'get': 'me'})),
    path('dashboard/',    views.DashboardView.as_view()),
    path('reports/<str:report_type>/', views.ReportsView.as_view()),
    path('', include(router.urls)),
]
```

---

### `urls.py` (main — `uon_erp/urls.py`)

```python
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/',   admin.site.urls),
    path('api/',     include('core.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## Frontend Architecture

### `index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UON ERP System</title>
    <link rel="icon" type="image/svg+xml" href="/uon-logo.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

### `main.jsx`

```jsx
// Entry point — wraps app in AuthProvider, mounts to #root
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './styles/general.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

---

### `App.jsx`

```jsx
// Root router — handles public routes, protected routes, and layout shell
// Layout shell = <Navbar /> + <Sidebar /> + <Outlet /> (role-based)
// ProtectedRoute component checks auth token + role from AuthContext
// Role-to-dashboard mapping:
//   admin    → /admin/dashboard
//   student  → /student/dashboard
//   lecturer → /lecturer/dashboard
//   cod      → /cod/dashboard
//   dean     → /dean/dashboard
//   finance  → /finance/dashboard

Routes:
  /login                         → <Login />             (public)
  /                              → <Dashboard />         (protected, role redirect)
  /admin/*                       → admin pages           (role: admin)
  /student/*                     → student pages         (role: student)
  /lecturer/*                    → lecturer pages        (role: lecturer)
  /cod/*                         → cod pages             (role: cod)
  /dean/*                        → dean pages            (role: dean)
  /finance/*                     → finance pages         (role: finance)
  *                              → 404 / redirect
```

---

### `AuthContext.jsx`

```jsx
// src/context/AuthContext.jsx
// THE SINGLE CONTEXT for the entire app

State managed:
  user        — { id, email, full_name, role, profile_picture }
  token       — JWT access token (stored in localStorage)
  loading     — boolean (initial auth check)
  isAuth      — boolean

Functions exported:
  login(email, password)  → calls api.login(), stores tokens, sets user
  logout()                → clears tokens, resets state, redirects /login
  refreshToken()          → calls api.refresh(), updates access token
  hasRole(...roles)       → boolean: checks if user.role is in roles[]
  updateUser(data)        → partial update of user state

Usage:
  const { user, login, logout, hasRole } = useAuth()
```

---

### `services/api.js`

```javascript
// src/services/api.js
// Axios instance with interceptors + ALL API functions

// BASE: axios instance → baseURL: import.meta.env.VITE_API_URL
// Request interceptor: attach Bearer token from localStorage
// Response interceptor: on 401 → attempt refresh → retry → logout

// ─── AUTH ───────────────────────────────────────────────
export const login(email, password)
export const logout()
export const refreshToken(refresh)
export const getMe()

// ─── USERS ──────────────────────────────────────────────
export const getUsers(params)
export const createUser(data)
export const updateUser(id, data)
export const deleteUser(id)

// ─── STUDENTS ────────────────────────────────────────────
export const getStudents(params)
export const getStudent(id)
export const createStudent(data)
export const updateStudent(id, data)
export const deleteStudent(id)
export const getStudentResults(id)
export const getStudentFees(id)
export const getStudentTimetable(id)
export const promoteStudent(id, data)

// ─── LECTURERS ───────────────────────────────────────────
export const getLecturers(params)
export const getLecturer(id)
export const createLecturer(data)
export const updateLecturer(id, data)
export const getLecturerUnits(id)

// ─── PROGRAMMES ──────────────────────────────────────────
export const getProgrammes(params)
export const getProgramme(id)
export const createProgramme(data)
export const updateProgramme(id, data)
export const deleteProgramme(id)

// ─── FACULTIES & DEPARTMENTS ─────────────────────────────
export const getFaculties()
export const createFaculty(data)
export const updateFaculty(id, data)
export const getDepartments(params)
export const createDepartment(data)
export const updateDepartment(id, data)

// ─── ACADEMIC CALENDAR ───────────────────────────────────
export const getAcademicYears()
export const createAcademicYear(data)
export const setCurrentAcademicYear(id)
export const getIntakes(params)
export const createIntake(data)
export const getSemesters(params)
export const createSemester(data)
export const setCurrentSemester(id)

// ─── UNITS ───────────────────────────────────────────────
export const getUnits(params)
export const getUnit(id)
export const createUnit(data)
export const updateUnit(id, data)
export const deleteUnit(id)
export const getUnitOfferings(params)
export const createUnitOffering(data)
export const getClassList(offeringId)

// ─── ENROLLMENTS ─────────────────────────────────────────
export const getEnrollments(params)
export const enrollStudent(data)
export const dropEnrollment(id)

// ─── MARKS ───────────────────────────────────────────────
export const getMarks(params)
export const enterMark(data)
export const updateMark(id, data)
export const bulkEnterMarks(data)

// ─── RESULTS ─────────────────────────────────────────────
export const getUnitResults(params)
export const approveResult(id)
export const getSemesterResults(params)
export const computeSemesterResults(data)

// ─── PROMOTIONS ──────────────────────────────────────────
export const getPromotions(params)
export const promoteStudents(data)

// ─── FINANCE ─────────────────────────────────────────────
export const getFeeStructures(params)
export const createFeeStructure(data)
export const updateFeeStructure(id, data)
export const getPayments(params)
export const recordPayment(data)
export const getInvoices(params)
export const generateInvoice(data)
export const getStudentFeeAccount(studentId)

// ─── TIMETABLE ───────────────────────────────────────────
export const getTimetable(params)
export const createTimetableEntry(data)
export const updateTimetableEntry(id, data)
export const deleteTimetableEntry(id)

// ─── DASHBOARD & REPORTS ─────────────────────────────────
export const getDashboardStats()
export const getReport(type, params)
```

---

### Pages

#### `pages/Login.jsx`
- Email + password form
- Calls `api.login()` via `AuthContext.login()`
- On success: redirects to role-appropriate dashboard
- Shows error toast on failure
- UON branding header

#### `pages/Dashboard.jsx`
- Wrapper that reads `user.role` and renders the right dashboard component
- Lazy-loads role-specific dashboard via dynamic import

#### Admin Pages (`pages/admin/`)
| Page | Purpose |
|------|---------|
| `AdminDashboard.jsx` | KPI cards: total students, lecturers, programmes, revenue; recent activity feed |
| `UserManagement.jsx` | Create/edit/deactivate user accounts; assign roles |
| `ProgrammeManagement.jsx` | CRUD programmes with type, duration, semesters config |
| `DepartmentManagement.jsx` | CRUD departments under faculties |
| `FacultyManagement.jsx` | CRUD faculties; assign deans |
| `IntakeManagement.jsx` | Create intakes per academic year; manage enrollment windows |
| `AcademicYearManagement.jsx` | Create academic years; set current year and semester |
| `SystemSettings.jsx` | GPA scales, grading config, institution details |

#### Student Pages (`pages/student/`)
| Page | Purpose |
|------|---------|
| `StudentDashboard.jsx` | Current semester units, GPA, fee balance, quick links |
| `MyProfile.jsx` | Personal info, programme, intake, academic status |
| `MyUnits.jsx` | Registered units this semester; registration window |
| `MyResults.jsx` | Full academic transcript: all years, semesters, grades |
| `MyFees.jsx` | Fee account, invoices, payment history, M-Pesa reference |
| `MyTimetable.jsx` | Weekly timetable grid for current semester |
| `MyDocuments.jsx` | Download: admission letter, transcripts, clearance forms |

#### Lecturer Pages (`pages/lecturer/`)
| Page | Purpose |
|------|---------|
| `LecturerDashboard.jsx` | Assigned units, pending mark entry, class sizes |
| `MyUnits.jsx` | Units assigned this semester |
| `ClassList.jsx` | Students enrolled per unit; attendance-ready list |
| `EnterMarks.jsx` | Mark entry form: CAT1, CAT2, Exam per student |
| `MarksSummary.jsx` | Grade distribution, pass/fail rates per unit |

#### COD Pages (`pages/cod/`)
| Page | Purpose |
|------|---------|
| `CodDashboard.jsx` | Department stats: students, lecturers, units, pending approvals |
| `DepartmentStudents.jsx` | All students in department; filter by programme/year |
| `DepartmentProgrammes.jsx` | Manage department programmes, units, allocations |
| `ApproveMarks.jsx` | Review and approve unit results before release |
| `StaffManagement.jsx` | View department lecturers; assign to units |

#### Dean Pages (`pages/dean/`)
| Page | Purpose |
|------|---------|
| `DeanDashboard.jsx` | Faculty-wide overview: departments, enrolment trends, GPA |
| `FacultyOverview.jsx` | Per-department breakdown of programmes, students, results |
| `ApprovePromotions.jsx` | Review and approve semester/year promotions |
| `FacultyReports.jsx` | Generate: enrolment, academic performance, graduation reports |

#### Finance Pages (`pages/finance/`)
| Page | Purpose |
|------|---------|
| `FinanceDashboard.jsx` | Revenue collected, outstanding fees, payment trends chart |
| `FeeStructures.jsx` | Set fee structure per programme per semester |
| `StudentPayments.jsx` | Search student, record payment, view history |
| `Invoices.jsx` | Generate and view invoices per student per semester |
| `FinanceReports.jsx` | Revenue reports, defaulters list, collection summary |

---

### Components

#### `components/Navbar.jsx`
```
Props: none (reads from AuthContext)
Renders:
  - UON logo + "ERP System" wordmark (left)
  - Current semester/year badge (center)
  - Notification bell with count (right)
  - User avatar + name + role chip (right)
  - Logout button (right)
Behaviour:
  - Hamburger toggle for sidebar on mobile
  - Dropdown on avatar: My Profile, Settings, Logout
```

#### `components/Sidebar.jsx`
```
Props: none (reads from AuthContext)
Renders:
  - Nav links filtered by user.role
  - Active link highlighting via useLocation()
  - Collapsible on mobile

Nav links per role:
  admin:    Dashboard | Users | Programmes | Departments | Faculties |
            Academic Years | Intakes | Settings
  student:  Dashboard | My Units | My Results | My Fees |
            My Timetable | My Documents
  lecturer: Dashboard | My Units | Class Lists | Enter Marks | Marks Summary
  cod:      Dashboard | Students | Programmes | Approve Marks | Staff
  dean:     Dashboard | Faculty Overview | Approve Promotions | Reports
  finance:  Dashboard | Fee Structures | Payments | Invoices | Reports
```

---

### `styles/general.css`

```css
/* CSS Custom Properties (variables) */
:root {
  /* UON Brand Colors */
  --color-primary: #003087;       /* UON deep navy */
  --color-primary-light: #1a4db5;
  --color-accent: #C8A951;        /* UON gold */
  --color-accent-dark: #a8893a;
  --color-danger: #dc2626;
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-info: #0284c7;

  /* Neutrals */
  --color-bg: #f4f6fb;
  --color-surface: #ffffff;
  --color-surface-alt: #f0f2f8;
  --color-border: #dde1ec;
  --color-text: #1a1f36;
  --color-text-muted: #6b7280;
  --color-text-inverse: #ffffff;

  /* Sidebar */
  --sidebar-width: 260px;
  --sidebar-collapsed-width: 68px;
  --navbar-height: 64px;

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-xs: 4px;  --space-sm: 8px;  --space-md: 16px;
  --space-lg: 24px; --space-xl: 32px; --space-2xl: 48px;

  /* Radius */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 16px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,.10);
  --shadow-lg: 0 8px 24px rgba(0,0,0,.12);

  /* Transitions */
  --transition: 200ms ease;
}

/* Global reset, base styles, layout classes */
/* .layout, .sidebar, .main-content, .navbar */
/* .card, .btn, .btn-primary, .btn-secondary, .btn-danger */
/* .table, .badge, .badge-role-{admin|student|lecturer|...} */
/* .form-group, .form-label, .form-input, .form-select */
/* .stat-card, .page-header, .page-title */
/* .spinner, .empty-state, .error-state */
/* Responsive breakpoints: @media (max-width: 768px) */
```

---

## API Endpoints Reference

```
POST   /api/auth/login/
POST   /api/auth/refresh/
POST   /api/auth/logout/
GET    /api/auth/me/

GET    /api/dashboard/

GET    /api/users/
POST   /api/users/
GET    /api/users/{id}/
PUT    /api/users/{id}/
DELETE /api/users/{id}/

GET    /api/students/
POST   /api/students/
GET    /api/students/{id}/
PUT    /api/students/{id}/
GET    /api/students/{id}/results/
GET    /api/students/{id}/fees/
GET    /api/students/{id}/timetable/
POST   /api/students/{id}/promote/

GET    /api/lecturers/
POST   /api/lecturers/
GET    /api/lecturers/{id}/
GET    /api/lecturers/{id}/units/

GET    /api/faculties/
POST   /api/faculties/
GET    /api/departments/
POST   /api/departments/

GET    /api/programmes/
POST   /api/programmes/
GET    /api/programmes/{id}/
PUT    /api/programmes/{id}/

GET    /api/academic-years/
POST   /api/academic-years/
POST   /api/academic-years/{id}/set_current/
GET    /api/intakes/
POST   /api/intakes/
GET    /api/semesters/
POST   /api/semesters/
POST   /api/semesters/{id}/set_current/

GET    /api/units/
POST   /api/units/
GET    /api/unit-offerings/
POST   /api/unit-offerings/
GET    /api/unit-offerings/{id}/classlist/

GET    /api/enrollments/
POST   /api/enrollments/
DELETE /api/enrollments/{id}/

GET    /api/marks/
POST   /api/marks/
POST   /api/marks/bulk/
PUT    /api/marks/{id}/

GET    /api/unit-results/
POST   /api/unit-results/approve/
GET    /api/semester-results/
POST   /api/semester-results/compute/

GET    /api/promotions/
POST   /api/promotions/bulk/

GET    /api/fee-structures/
POST   /api/fee-structures/
GET    /api/payments/
POST   /api/payments/
GET    /api/invoices/
POST   /api/invoices/
GET    /api/fee-accounts/{student_id}/

GET    /api/timetable/
POST   /api/timetable/

GET    /api/reports/{type}/
         types: enrollment | results | finance | graduates | defaulters
```

---

## Authentication Flow

```
1. User visits /login
2. Submits email + password
3. POST /api/auth/login/ → { access, refresh, user }
4. Store access in memory (axios header) + refresh in localStorage
5. AuthContext.user is populated
6. Redirect to /{role}/dashboard
7. On each request: attach Authorization: Bearer {access}
8. On 401: POST /api/auth/refresh/ → new access token → retry
9. If refresh fails: logout() → clear storage → /login
```

---

## Academic Workflow

```
SETUP (admin)
  Create Academic Year → Create Intake → Create Semesters
  Create Faculty → Department → Programme (type, duration, sems/year)
  Create Units → Assign to Programme

ENROLLMENT (admin/student)
  Student admitted to Programme + Intake
  Registration Number auto-generated (e.g. UON/2024/01/0001)
  Student registers for units in current semester

TEACHING (lecturer)
  Lecturer assigned to Unit Offerings
  Enters CAT1, CAT2, Exam marks per student
  Marks submitted for COD approval

APPROVAL (cod)
  COD reviews unit results
  Approves marks → system computes grades, GPA

RESULTS & PROMOTION (dean/admin)
  Semester results computed from unit results
  GPA calculated per student
  Promotion logic:
    GPA ≥ 2.0 → promote to next semester/year
    GPA < 2.0 → probation / supplementary exam
    Supplementary pass → promote with remark
    Fail after supplementary → repeat semester
  Dean approves bulk promotions

FINANCE (finance)
  Fee structure set per programme per semester
  Invoice generated per student on registration
  Payments recorded (M-Pesa, bank, scholarship)
  Clearance checked before results release
```

---

## Setup & Installation

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # configure environment variables
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_data        # optional: load demo data
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env              # set VITE_API_URL
npm run dev
```

---

## Environment Variables

### Backend (`.env`)
```
SECRET_KEY=your-django-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:pass@localhost:5432/uon_erp
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
MEDIA_ROOT=media/
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=UON ERP System
```

---

## Database Schema Overview

```
User (1)──────────────────────── StudentProfile (1)
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                   │
               Programme          Enrollment         FeeAccount
                    │                  │                   │
             ProgrammeUnit        UnitOffering         Payment
                    │                  │
                 Unit              StudentMark
                                       │
                                  UnitResult
                                       │
                                 SemesterResult
                                       │
                              AcademicPromotion

Intake ──── Semester ──── UnitOffering ──── Timetable
   │
AcademicYear ──── FeeStructure ──── Invoice
```

---

## Key Design Decisions

1. **Single `core` app** — all models, serializers, views in one place for simplicity; can be split into sub-apps later (academic, finance, auth)
2. **Single `AuthContext`** — one context holds all auth + user state; avoids context hell
3. **Two components only** — `Navbar` and `Sidebar` are the only shared components; all other UI is page-level to maximize clarity
4. **Role-based routing** — `App.jsx` guards every route by role; wrong-role access auto-redirects
5. **Computed fields** — GPA, total fees, grade points are computed in serializers or DB signals, not stored raw
6. **JWT with refresh** — stateless auth; refresh token in localStorage, access token in memory
7. **Promotion engine** — `utils.py` contains the promotion logic, callable from views and management commands

---

*University of Nairobi ERP System — Academic Management Platform*
*Built with Django REST Framework + React*