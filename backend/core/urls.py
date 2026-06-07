"""
UON College ERP System — Core App URL Configuration
core/urls.py

All API routes under /api/
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # Auth
    LoginView, LogoutView, MeView,
    # Users
    UserViewSet,
    # Institutional
    FacultyViewSet, DepartmentViewSet, ProgrammeViewSet,
    # Calendar
    AcademicYearViewSet, IntakeViewSet, SemesterViewSet,
    # People
    StudentViewSet, LecturerViewSet,
    # Units
    UnitViewSet, UnitOfferingViewSet,
    # Enrollments
    EnrollmentViewSet,
    # Assessments & Marks
    AssessmentTypeViewSet, UnitAssessmentViewSet, StudentMarkViewSet,
    # Results
    UnitResultViewSet, SemesterResultViewSet,
    # Promotions
    PromotionViewSet,
    # Finance
    FeeStructureViewSet, StudentFeeAccountViewSet, PaymentViewSet, InvoiceViewSet,
    # Timetable
    TimetableViewSet,
    # Dashboard & Reports
    DashboardView, ReportsView,
)

# ─────────────────────────────────────────────────────────
# ROUTER — ModelViewSets automatically get list/detail routes
# ─────────────────────────────────────────────────────────
router = DefaultRouter()

# Users
router.register(r'users',               UserViewSet,              basename='user')

# Institutional
router.register(r'faculties',           FacultyViewSet,           basename='faculty')
router.register(r'departments',         DepartmentViewSet,        basename='department')
router.register(r'programmes',          ProgrammeViewSet,         basename='programme')

# Academic Calendar
router.register(r'academic-years',      AcademicYearViewSet,      basename='academic-year')
router.register(r'intakes',             IntakeViewSet,            basename='intake')
router.register(r'semesters',           SemesterViewSet,          basename='semester')

# People
router.register(r'students',            StudentViewSet,           basename='student')
router.register(r'lecturers',           LecturerViewSet,          basename='lecturer')

# Units
router.register(r'units',               UnitViewSet,              basename='unit')
router.register(r'unit-offerings',      UnitOfferingViewSet,      basename='unit-offering')

# Enrollments
router.register(r'enrollments',         EnrollmentViewSet,        basename='enrollment')

# Assessments & Marks
router.register(r'assessment-types',    AssessmentTypeViewSet,    basename='assessment-type')
router.register(r'unit-assessments',    UnitAssessmentViewSet,    basename='unit-assessment')
router.register(r'marks',               StudentMarkViewSet,       basename='mark')

# Results
router.register(r'unit-results',        UnitResultViewSet,        basename='unit-result')
router.register(r'semester-results',    SemesterResultViewSet,    basename='semester-result')

# Promotions
router.register(r'promotions',          PromotionViewSet,         basename='promotion')

# Finance
router.register(r'fee-structures',      FeeStructureViewSet,      basename='fee-structure')
router.register(r'fee-accounts',        StudentFeeAccountViewSet, basename='fee-account')
router.register(r'payments',            PaymentViewSet,           basename='payment')
router.register(r'invoices',            InvoiceViewSet,           basename='invoice')

# Timetable
router.register(r'timetable',           TimetableViewSet,         basename='timetable')


# ─────────────────────────────────────────────────────────
# URL PATTERNS
# ─────────────────────────────────────────────────────────
urlpatterns = [

    # ── AUTH ────────────────────────────────────────────
    path('auth/login/',          LoginView.as_view(),    name='auth-login'),
    path('auth/logout/',         LogoutView.as_view(),   name='auth-logout'),
    path('auth/me/',             MeView.as_view(),       name='auth-me'),

    # ── DASHBOARD ───────────────────────────────────────
    path('dashboard/',           DashboardView.as_view(),        name='dashboard'),

    # ── REPORTS ─────────────────────────────────────────
    path('reports/<str:report_type>/', ReportsView.as_view(),    name='reports'),

    # ── ALL VIEWSET ROUTES ───────────────────────────────
    path('', include(router.urls)),
]


"""
─────────────────────────────────────────────────────────
COMPLETE ENDPOINT REFERENCE
─────────────────────────────────────────────────────────

AUTH
  POST   /api/auth/login/                           Login (email + password → JWT)
  POST   /api/auth/logout/                          Logout (blacklist refresh token)
  GET    /api/auth/me/                              Current user profile
  PUT    /api/auth/me/                              Update own profile

DASHBOARD
  GET    /api/dashboard/                            Role-based dashboard stats

REPORTS
  GET    /api/reports/enrollment/
  GET    /api/reports/results/
  GET    /api/reports/finance/
  GET    /api/reports/graduates/
  GET    /api/reports/defaulters/
  GET    /api/reports/transcript/?student_id={id}

USERS (admin only)
  GET    /api/users/
  POST   /api/users/
  GET    /api/users/{id}/
  PUT    /api/users/{id}/
  DELETE /api/users/{id}/
  POST   /api/users/{id}/activate/
  POST   /api/users/{id}/deactivate/
  POST   /api/users/{id}/reset-password/

FACULTIES
  GET    /api/faculties/
  POST   /api/faculties/
  GET    /api/faculties/{id}/
  PUT    /api/faculties/{id}/
  DELETE /api/faculties/{id}/
  GET    /api/faculties/{id}/departments/
  GET    /api/faculties/{id}/programmes/
  GET    /api/faculties/{id}/stats/

DEPARTMENTS
  GET    /api/departments/                          ?faculty={id}
  POST   /api/departments/
  GET    /api/departments/{id}/
  PUT    /api/departments/{id}/
  DELETE /api/departments/{id}/
  GET    /api/departments/{id}/lecturers/
  GET    /api/departments/{id}/programmes/
  GET    /api/departments/{id}/students/

PROGRAMMES
  GET    /api/programmes/                           ?department={id}&programme_type=undergraduate
  POST   /api/programmes/
  GET    /api/programmes/{id}/
  PUT    /api/programmes/{id}/
  DELETE /api/programmes/{id}/
  GET    /api/programmes/{id}/units/                ?year=1&semester=1
  POST   /api/programmes/{id}/add-unit/
  GET    /api/programmes/{id}/students/             ?status=active
  GET    /api/programmes/{id}/fee-structures/

ACADEMIC YEARS
  GET    /api/academic-years/
  POST   /api/academic-years/
  GET    /api/academic-years/{id}/
  PUT    /api/academic-years/{id}/
  DELETE /api/academic-years/{id}/
  POST   /api/academic-years/{id}/set-current/
  GET    /api/academic-years/current/

INTAKES
  GET    /api/intakes/                              ?academic_year={id}&intake_month=january
  POST   /api/intakes/
  GET    /api/intakes/{id}/
  PUT    /api/intakes/{id}/
  DELETE /api/intakes/{id}/

SEMESTERS
  GET    /api/semesters/                            ?academic_year={id}&is_current=true
  POST   /api/semesters/
  GET    /api/semesters/{id}/
  PUT    /api/semesters/{id}/
  DELETE /api/semesters/{id}/
  POST   /api/semesters/{id}/set-current/
  GET    /api/semesters/current/

STUDENTS
  GET    /api/students/                             ?programme={id}&intake={id}&status=active
  POST   /api/students/
  GET    /api/students/{id}/
  PUT    /api/students/{id}/
  DELETE /api/students/{id}/
  GET    /api/students/{id}/results/               Full academic transcript
  GET    /api/students/{id}/fees/                  Fee account + payments + invoices
  GET    /api/students/{id}/timetable/             Current semester timetable
  GET    /api/students/{id}/enrollments/           ?semester={id}
  POST   /api/students/{id}/promote/               Manual promotion

LECTURERS
  GET    /api/lecturers/                            ?department={id}&designation=lecturer
  POST   /api/lecturers/
  GET    /api/lecturers/{id}/
  PUT    /api/lecturers/{id}/
  DELETE /api/lecturers/{id}/
  GET    /api/lecturers/{id}/units/                ?semester={id}
  GET    /api/lecturers/{id}/schedule/             Timetable

UNITS
  GET    /api/units/                               ?department={id}&year_of_study=1
  POST   /api/units/
  GET    /api/units/{id}/
  PUT    /api/units/{id}/
  DELETE /api/units/{id}/

UNIT OFFERINGS
  GET    /api/unit-offerings/                      ?semester={id}&lecturer={id}
  POST   /api/unit-offerings/
  GET    /api/unit-offerings/{id}/
  PUT    /api/unit-offerings/{id}/
  DELETE /api/unit-offerings/{id}/
  GET    /api/unit-offerings/{id}/classlist/       Enrolled students
  GET    /api/unit-offerings/{id}/marks/           All marks for this offering
  GET    /api/unit-offerings/{id}/assessments/     Configured assessments
  GET    /api/unit-offerings/{id}/results/         Unit results

ENROLLMENTS
  GET    /api/enrollments/                         ?student={id}&semester={id}
  POST   /api/enrollments/                         Enroll student
  GET    /api/enrollments/{id}/
  DELETE /api/enrollments/{id}/                    Drop enrollment
  POST   /api/enrollments/{id}/drop/

ASSESSMENT TYPES
  GET    /api/assessment-types/
  POST   /api/assessment-types/
  GET    /api/assessment-types/{id}/
  PUT    /api/assessment-types/{id}/
  DELETE /api/assessment-types/{id}/

UNIT ASSESSMENTS
  GET    /api/unit-assessments/                    ?unit_offering={id}
  POST   /api/unit-assessments/
  GET    /api/unit-assessments/{id}/
  PUT    /api/unit-assessments/{id}/
  DELETE /api/unit-assessments/{id}/
  POST   /api/unit-assessments/{id}/release/

MARKS
  GET    /api/marks/                               ?unit_assessment={id}&enrollment={id}
  POST   /api/marks/                               Single mark entry
  GET    /api/marks/{id}/
  PUT    /api/marks/{id}/
  POST   /api/marks/bulk/                          Bulk mark entry
  POST   /api/marks/compute/                       Compute unit results

UNIT RESULTS
  GET    /api/unit-results/                        ?semester={id}&student={id}
  GET    /api/unit-results/{id}/
  POST   /api/unit-results/{id}/approve/           COD approves result
  POST   /api/unit-results/bulk-approve/           Approve all for a unit offering

SEMESTER RESULTS
  GET    /api/semester-results/                    ?student={id}&semester={id}
  GET    /api/semester-results/{id}/
  POST   /api/semester-results/compute/            Compute GPA for student(s)
  POST   /api/semester-results/{id}/approve/
  POST   /api/semester-results/{id}/release/
  POST   /api/semester-results/bulk-release/

PROMOTIONS
  GET    /api/promotions/                          ?student={id}
  GET    /api/promotions/{id}/
  POST   /api/promotions/bulk/                     Bulk promote cohort

FEE STRUCTURES
  GET    /api/fee-structures/                      ?programme={id}&academic_year={id}
  POST   /api/fee-structures/
  GET    /api/fee-structures/{id}/
  PUT    /api/fee-structures/{id}/
  DELETE /api/fee-structures/{id}/

FEE ACCOUNTS
  GET    /api/fee-accounts/                        ?student={id}&academic_year={id}
  GET    /api/fee-accounts/{id}/
  POST   /api/fee-accounts/{id}/update-balance/

PAYMENTS
  GET    /api/payments/                            ?student={id}&academic_year={id}
  POST   /api/payments/                            Record payment
  GET    /api/payments/{id}/
  POST   /api/payments/{id}/reverse/

INVOICES
  GET    /api/invoices/                            ?student={id}&semester={id}
  POST   /api/invoices/                            Generate invoice
  GET    /api/invoices/{id}/
  PUT    /api/invoices/{id}/

TIMETABLE
  GET    /api/timetable/                           ?unit_offering={id}&day_of_week=mon
  POST   /api/timetable/
  GET    /api/timetable/{id}/
  PUT    /api/timetable/{id}/
  DELETE /api/timetable/{id}/
"""