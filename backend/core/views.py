"""
UON College ERP System — Views
All DRF ViewSets and APIViews for the core application.
"""

import logging
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Sum, Q, Avg
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    User, Faculty, Department, Programme, ProgrammeUnit,
    AcademicYear, Intake, Semester,
    StudentProfile, LecturerProfile,
    Unit, UnitOffering, Enrollment,
    AssessmentType, UnitAssessment, StudentMark,
    UnitResult, SemesterResult, AcademicPromotion,
    FeeStructure, StudentFeeAccount, Payment, Invoice,
    Timetable,
)
from .serializers import (
    CustomTokenObtainPairSerializer, LogoutSerializer,
    UserSerializer, UserCreateSerializer, ChangePasswordSerializer,
    FacultySerializer, DepartmentSerializer, ProgrammeSerializer, ProgrammeUnitSerializer,
    AcademicYearSerializer, IntakeSerializer, SemesterSerializer,
    StudentProfileSerializer, StudentListSerializer, LecturerProfileSerializer,
    UnitSerializer, UnitOfferingSerializer,
    EnrollmentSerializer,
    AssessmentTypeSerializer, UnitAssessmentSerializer, StudentMarkSerializer, BulkMarkSerializer,
    UnitResultSerializer, SemesterResultSerializer,
    AcademicPromotionSerializer, AcademicTranscriptSerializer,
    FeeStructureSerializer, StudentFeeAccountSerializer, PaymentSerializer, InvoiceSerializer,
    TimetableSerializer,
)
from .permissions import (
    IsAdmin, IsAdminOrReadOnly, IsStudent, IsLecturer, IsCOD, IsDean, IsFinance,
    IsAdminOrCOD, IsAdminOrDean, IsAdminOrFinance, IsLecturerOrCOD,
    IsAcademicStaff, IsStudentOwner, IsLecturerOwner,
)
from .utils import (
    compute_unit_result, compute_semester_result,
    promote_student, bulk_promote_cohort,
)

logger = logging.getLogger('core')

# ─────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────

def success_response(data=None, message='Success', status_code=status.HTTP_200_OK):
    return Response({'success': True, 'message': message, 'data': data}, status=status_code)


def error_response(message='Error', errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({'success': False, 'message': message, 'errors': errors}, status=status_code)


# ═══════════════════════════════════════════════════════════════
# AUTH VIEWS
# ═══════════════════════════════════════════════════════════════

class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Returns { access, refresh, user }
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message='Invalid credentials.',
                errors=serializer.errors,
                status_code=status.HTTP_401_UNAUTHORIZED
            )
        return success_response(data=serializer.validated_data, message='Login successful.')


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return success_response(message='Logged out successfully.')
        return error_response(errors=serializer.errors)


class MeView(APIView):
    """
    GET  /api/auth/me/      — current user profile
    PUT  /api/auth/me/      — update own profile
    POST /api/auth/me/change-password/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        data = serializer.data
        # Attach profile data based on role
        user = request.user
        if user.role == 'student' and hasattr(user, 'student_profile'):
            data['profile'] = StudentProfileSerializer(user.student_profile).data
        elif user.role == 'lecturer' and hasattr(user, 'lecturer_profile'):
            data['profile'] = LecturerProfileSerializer(user.lecturer_profile).data
        return success_response(data=data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(data=serializer.data, message='Profile updated.')
        return error_response(errors=serializer.errors)

    @action(detail=False, methods=['post'], url_path='change-password')
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return success_response(message='Password changed successfully.')
        return error_response(errors=serializer.errors)


# ═══════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════

class UserViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for user accounts.
    GET    /api/users/
    POST   /api/users/
    GET    /api/users/{id}/
    PUT    /api/users/{id}/
    DELETE /api/users/{id}/
    POST   /api/users/{id}/deactivate/
    POST   /api/users/{id}/reset-password/
    """
    queryset           = User.objects.all().order_by('last_name', 'first_name')
    permission_classes = [IsAdmin]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['role', 'is_active']
    search_fields      = ['email', 'first_name', 'last_name', 'username']
    ordering_fields    = ['last_name', 'date_joined', 'role']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return success_response(
                data=UserSerializer(user).data,
                message=f'User {user.email} created successfully.',
                status_code=status.HTTP_201_CREATED
            )
        return error_response(errors=serializer.errors)

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return success_response(message=f'User {user.email} deactivated.')

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return success_response(message=f'User {user.email} activated.')

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        user     = self.get_object()
        password = request.data.get('new_password')
        if not password or len(password) < 8:
            return error_response(message='Password must be at least 8 characters.')
        user.set_password(password)
        user.save()
        return success_response(message=f'Password reset for {user.email}.')


# ═══════════════════════════════════════════════════════════════
# INSTITUTIONAL VIEWS
# ═══════════════════════════════════════════════════════════════

class FacultyViewSet(viewsets.ModelViewSet):
    """
    GET    /api/faculties/
    POST   /api/faculties/
    GET    /api/faculties/{id}/
    PUT    /api/faculties/{id}/
    DELETE /api/faculties/{id}/
    GET    /api/faculties/{id}/departments/
    """
    queryset           = Faculty.objects.all().prefetch_related('departments')
    serializer_class   = FacultySerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['name', 'code']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def departments(self, request, pk=None):
        faculty = self.get_object()
        depts   = faculty.departments.filter(is_active=True)
        return success_response(data=DepartmentSerializer(depts, many=True).data)

    @action(detail=True, methods=['get'])
    def programmes(self, request, pk=None):
        faculty    = self.get_object()
        programmes = Programme.objects.filter(department__faculty=faculty, is_active=True)
        return success_response(data=ProgrammeSerializer(programmes, many=True).data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        faculty   = self.get_object()
        dept_ids  = faculty.departments.values_list('id', flat=True)
        prog_ids  = Programme.objects.filter(department__in=dept_ids).values_list('id', flat=True)
        data = {
            'departments': faculty.departments.filter(is_active=True).count(),
            'programmes':  Programme.objects.filter(department__in=dept_ids, is_active=True).count(),
            'students':    StudentProfile.objects.filter(programme__in=prog_ids, status='active').count(),
            'lecturers':   LecturerProfile.objects.filter(department__in=dept_ids, is_active=True).count(),
        }
        return success_response(data=data)


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    GET /api/departments/?faculty={id}
    Full CRUD + nested lecturers, programmes, units actions.
    """
    queryset           = Department.objects.select_related('faculty', 'hod').all()
    serializer_class   = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['faculty', 'is_active']
    search_fields      = ['name', 'code']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def lecturers(self, request, pk=None):
        dept      = self.get_object()
        lecturers = dept.lecturers.filter(is_active=True).select_related('user')
        return success_response(data=LecturerProfileSerializer(lecturers, many=True).data)

    @action(detail=True, methods=['get'])
    def programmes(self, request, pk=None):
        dept  = self.get_object()
        progs = dept.programmes.filter(is_active=True)
        return success_response(data=ProgrammeSerializer(progs, many=True).data)

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        dept      = self.get_object()
        prog_ids  = dept.programmes.values_list('id', flat=True)
        students  = StudentProfile.objects.filter(programme__in=prog_ids, status='active')
        return success_response(data=StudentListSerializer(students, many=True).data)


class ProgrammeViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for academic programmes.
    GET /api/programmes/?department={id}&programme_type=undergraduate
    """
    queryset           = Programme.objects.select_related('department', 'department__faculty').all()
    serializer_class   = ProgrammeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['department', 'programme_type', 'duration_years', 'is_active']
    search_fields      = ['name', 'code']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrCOD()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def units(self, request, pk=None):
        programme = self.get_object()
        year      = request.query_params.get('year')
        semester  = request.query_params.get('semester')
        qs = ProgrammeUnit.objects.filter(programme=programme).select_related('unit')
        if year:
            qs = qs.filter(year_of_study=year)
        if semester:
            qs = qs.filter(semester_number=semester)
        return success_response(data=ProgrammeUnitSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def add_unit(self, request, pk=None):
        programme = self.get_object()
        data = {**request.data, 'programme': str(programme.id)}
        serializer = ProgrammeUnitSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return success_response(data=serializer.data, status_code=status.HTTP_201_CREATED)
        return error_response(errors=serializer.errors)

    @action(detail=True, methods=['get'])
    def students(self, request, pk=None):
        programme = self.get_object()
        status_filter = request.query_params.get('status', 'active')
        students = programme.students.filter(status=status_filter).select_related('user', 'intake')
        return success_response(data=StudentListSerializer(students, many=True).data)

    @action(detail=True, methods=['get'])
    def fee_structures(self, request, pk=None):
        programme   = self.get_object()
        acad_year   = request.query_params.get('academic_year')
        qs = programme.fee_structures.filter(is_active=True)
        if acad_year:
            qs = qs.filter(academic_year_id=acad_year)
        return success_response(data=FeeStructureSerializer(qs, many=True).data)


# ═══════════════════════════════════════════════════════════════
# ACADEMIC CALENDAR VIEWS
# ═══════════════════════════════════════════════════════════════

class AcademicYearViewSet(viewsets.ModelViewSet):
    """
    GET/POST/PUT/DELETE /api/academic-years/
    POST /api/academic-years/{id}/set_current/
    """
    queryset           = AcademicYear.objects.all()
    serializer_class   = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'set_current'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='set-current')
    def set_current(self, request, pk=None):
        year = self.get_object()
        AcademicYear.objects.exclude(pk=year.pk).update(is_current=False)
        year.is_current = True
        year.save()
        return success_response(message=f'{year.year_label} set as current academic year.')

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        try:
            year = AcademicYear.objects.get(is_current=True)
            return success_response(data=AcademicYearSerializer(year).data)
        except AcademicYear.DoesNotExist:
            return error_response(message='No current academic year set.', status_code=status.HTTP_404_NOT_FOUND)


class IntakeViewSet(viewsets.ModelViewSet):
    """
    GET /api/intakes/?academic_year={id}&intake_month=january
    """
    queryset           = Intake.objects.select_related('academic_year').all()
    serializer_class   = IntakeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['academic_year', 'intake_month', 'is_active']
    search_fields      = ['name']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdmin()]
        return [IsAuthenticated()]


class SemesterViewSet(viewsets.ModelViewSet):
    """
    GET /api/semesters/?academic_year={id}&is_current=true
    POST /api/semesters/{id}/set-current/
    """
    queryset           = Semester.objects.select_related('academic_year', 'intake').all()
    serializer_class   = SemesterSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['academic_year', 'intake', 'semester_number', 'is_current', 'is_active']
    search_fields      = ['name']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'set_current'):
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='set-current')
    def set_current(self, request, pk=None):
        semester = self.get_object()
        Semester.objects.exclude(pk=semester.pk).update(is_current=False)
        semester.is_current = True
        semester.save()
        return success_response(message=f'{semester.name} set as current semester.')

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        try:
            semester = Semester.objects.get(is_current=True)
            return success_response(data=SemesterSerializer(semester).data)
        except Semester.DoesNotExist:
            return error_response(message='No current semester set.', status_code=status.HTTP_404_NOT_FOUND)


# ═══════════════════════════════════════════════════════════════
# STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════

class StudentViewSet(viewsets.ModelViewSet):
    """
    GET    /api/students/                       — list (admin, cod, dean, finance, lecturer)
    POST   /api/students/                       — create (admin)
    GET    /api/students/{id}/                  — retrieve
    PUT    /api/students/{id}/                  — update (admin, cod)
    GET    /api/students/{id}/results/          — full transcript
    GET    /api/students/{id}/fees/             — fee account + payments
    GET    /api/students/{id}/timetable/        — current timetable
    GET    /api/students/{id}/enrollments/      — current unit enrollments
    POST   /api/students/{id}/promote/          — trigger promotion
    """
    queryset = StudentProfile.objects.select_related(
        'user', 'programme', 'intake', 'programme__department'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = [
        'programme', 'intake', 'status', 'sponsor',
        'current_year_of_study', 'current_semester_number',
        'programme__department', 'programme__programme_type',
    ]
    search_fields  = ['reg_number', 'user__first_name', 'user__last_name', 'user__email', 'national_id']
    ordering_fields = ['reg_number', 'cumulative_gpa', 'admission_date']

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        return StudentProfileSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAdmin()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAdminOrCOD()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            # Students see only themselves
            return qs.filter(user=user)
        if user.role == 'lecturer':
            # Lecturers see students enrolled in their units
            student_ids = Enrollment.objects.filter(
                unit_offering__lecturer=user, is_active=True
            ).values_list('student_id', flat=True)
            return qs.filter(id__in=student_ids)
        if user.role == 'cod':
            # COD sees students in their department
            try:
                dept = user.department_led
                prog_ids = dept.programmes.values_list('id', flat=True)
                return qs.filter(programme__in=prog_ids)
            except Exception:
                return qs.none()
        if user.role == 'dean':
            # Dean sees all students in their faculty
            try:
                faculty  = user.faculty_led
                dept_ids = faculty.departments.values_list('id', flat=True)
                prog_ids = Programme.objects.filter(department__in=dept_ids).values_list('id', flat=True)
                return qs.filter(programme__in=prog_ids)
            except Exception:
                return qs.none()
        return qs  # admin and finance see all

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Full academic transcript."""
        student = self.get_object()
        serializer = AcademicTranscriptSerializer(student, context={'request': request})
        return success_response(data=serializer.data)

    @action(detail=True, methods=['get'])
    def fees(self, request, pk=None):
        """Fee account and payment history."""
        student  = self.get_object()
        accounts = student.fee_accounts.select_related('academic_year').all()
        payments = student.payments.select_related('academic_year', 'semester').order_by('-payment_date')
        invoices = student.invoices.select_related('semester').order_by('-generated_at')
        return success_response(data={
            'accounts': StudentFeeAccountSerializer(accounts, many=True).data,
            'payments': PaymentSerializer(payments, many=True).data,
            'invoices': InvoiceSerializer(invoices, many=True).data,
        })

    @action(detail=True, methods=['get'])
    def timetable(self, request, pk=None):
        """Current semester timetable for the student."""
        student = self.get_object()
        try:
            current_sem = Semester.objects.get(is_current=True)
        except Semester.DoesNotExist:
            return error_response(message='No current semester set.', status_code=status.HTTP_404_NOT_FOUND)

        enrollment_ids = student.enrollments.filter(
            unit_offering__semester=current_sem, is_active=True
        ).values_list('unit_offering_id', flat=True)

        timetable = Timetable.objects.filter(
            unit_offering__in=enrollment_ids, is_active=True
        ).select_related('unit_offering__unit', 'unit_offering__lecturer')

        return success_response(data=TimetableSerializer(timetable, many=True).data)

    @action(detail=True, methods=['get'])
    def enrollments(self, request, pk=None):
        """Student's enrollments, optionally filtered by semester."""
        student    = self.get_object()
        semester   = request.query_params.get('semester')
        qs = student.enrollments.filter(is_active=True).select_related(
            'unit_offering__unit', 'unit_offering__semester', 'unit_offering__lecturer'
        )
        if semester:
            qs = qs.filter(unit_offering__semester_id=semester)
        return success_response(data=EnrollmentSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def promote(self, request, pk=None):
        """Manually promote a student."""
        student        = self.get_object()
        to_semester_id = request.data.get('to_semester')
        promotion_type = request.data.get('promotion_type')
        remarks        = request.data.get('remarks', '')

        if not to_semester_id:
            return error_response(message='to_semester is required.')

        result = promote_student(
            student_id=str(student.id),
            to_semester_id=to_semester_id,
            promoted_by_id=str(request.user.id),
            promotion_type=promotion_type,
            remarks=remarks,
        )
        if result.get('error'):
            return error_response(message=result['error'])
        return success_response(data=result, message='Student promoted successfully.')


# ═══════════════════════════════════════════════════════════════
# LECTURER VIEWS
# ═══════════════════════════════════════════════════════════════

class LecturerViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for lecturer profiles.
    GET /api/lecturers/{id}/units/   — assigned unit offerings
    """
    queryset           = LecturerProfile.objects.select_related('user', 'department').all()
    serializer_class   = LecturerProfileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['department', 'designation', 'is_active']
    search_fields      = ['user__first_name', 'user__last_name', 'staff_number', 'specialization']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrCOD()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['get'])
    def units(self, request, pk=None):
        lecturer = self.get_object()
        semester = request.query_params.get('semester')
        qs = UnitOffering.objects.filter(lecturer=lecturer.user).select_related(
            'unit', 'semester'
        )
        if semester:
            qs = qs.filter(semester_id=semester)
        return success_response(data=UnitOfferingSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def schedule(self, request, pk=None):
        """Lecturer's timetable."""
        lecturer = self.get_object()
        timetable = Timetable.objects.filter(
            unit_offering__lecturer=lecturer.user, is_active=True
        ).select_related('unit_offering__unit', 'unit_offering__semester')
        return success_response(data=TimetableSerializer(timetable, many=True).data)


# ═══════════════════════════════════════════════════════════════
# UNIT VIEWS
# ═══════════════════════════════════════════════════════════════

class UnitViewSet(viewsets.ModelViewSet):
    """
    CRUD for academic units.
    GET /api/units/?department={id}&year_of_study=1&semester_number=1
    """
    queryset           = Unit.objects.select_related('department').all()
    serializer_class   = UnitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['department', 'unit_type', 'year_of_study', 'semester_number', 'is_active']
    search_fields      = ['code', 'name']
    ordering_fields    = ['code', 'name']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrCOD()]
        return [IsAuthenticated()]


class UnitOfferingViewSet(viewsets.ModelViewSet):
    """
    Unit offerings (a unit scheduled for a specific semester by a lecturer).
    GET /api/unit-offerings/?semester={id}&lecturer={id}
    GET /api/unit-offerings/{id}/classlist/   — enrolled students
    GET /api/unit-offerings/{id}/marks/       — all marks for the offering
    """
    queryset           = UnitOffering.objects.select_related('unit', 'semester', 'lecturer').all()
    serializer_class   = UnitOfferingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['semester', 'lecturer', 'unit', 'is_active']
    search_fields      = ['unit__code', 'unit__name']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrCOD()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'lecturer':
            return qs.filter(lecturer=user)
        if user.role == 'student':
            enrolled_ids = Enrollment.objects.filter(
                student__user=user, is_active=True
            ).values_list('unit_offering_id', flat=True)
            return qs.filter(id__in=enrolled_ids)
        return qs

    @action(detail=True, methods=['get'], url_path='classlist')
    def classlist(self, request, pk=None):
        """All students enrolled in this unit offering."""
        offering    = self.get_object()
        enrollments = offering.enrollments.filter(is_active=True).select_related(
            'student__user', 'student__programme', 'student__intake'
        )
        data = [{
            'enrollment_id': str(e.id),
            'reg_number':    e.student.reg_number,
            'full_name':     e.student.user.full_name,
            'programme':     e.student.programme.code,
            'year':          e.student.current_year_of_study,
            'status':        e.status,
        } for e in enrollments]
        return success_response(data=data)

    @action(detail=True, methods=['get'])
    def marks(self, request, pk=None):
        """All marks entered for this unit offering."""
        offering = self.get_object()
        marks = StudentMark.objects.filter(
            enrollment__unit_offering=offering
        ).select_related(
            'enrollment__student__user',
            'unit_assessment__assessment_type',
            'marked_by'
        )
        return success_response(data=StudentMarkSerializer(marks, many=True).data)

    @action(detail=True, methods=['get'])
    def assessments(self, request, pk=None):
        """Assessments configured for this unit offering."""
        offering    = self.get_object()
        assessments = offering.assessments.select_related('assessment_type')
        return success_response(data=UnitAssessmentSerializer(assessments, many=True).data)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Unit results for all students in this offering."""
        offering = self.get_object()
        results  = UnitResult.objects.filter(
            enrollment__unit_offering=offering
        ).select_related('enrollment__student__user')
        return success_response(data=UnitResultSerializer(results, many=True).data)


# ═══════════════════════════════════════════════════════════════
# ENROLLMENT VIEWS
# ═══════════════════════════════════════════════════════════════

class EnrollmentViewSet(viewsets.ModelViewSet):
    """
    POST   /api/enrollments/           — enroll student
    DELETE /api/enrollments/{id}/      — drop enrollment
    GET    /api/enrollments/?student={id}&semester={id}
    """
    queryset           = Enrollment.objects.select_related(
        'student__user', 'unit_offering__unit', 'unit_offering__semester'
    ).all()
    serializer_class   = EnrollmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['student', 'unit_offering', 'status', 'is_active']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]  # students can self-enroll
        if self.action == 'destroy':
            return [IsAdminOrCOD()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(student__user=user)
        return qs

    @action(detail=True, methods=['post'], url_path='drop')
    def drop(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status    = 'dropped'
        enrollment.is_active = False
        enrollment.save()
        # Update enrolled_count
        offering = enrollment.unit_offering
        offering.enrolled_count = offering.enrollments.filter(is_active=True).count()
        offering.save()
        return success_response(message='Enrollment dropped successfully.')


# ═══════════════════════════════════════════════════════════════
# ASSESSMENT VIEWS
# ═══════════════════════════════════════════════════════════════

class AssessmentTypeViewSet(viewsets.ModelViewSet):
    """
    CRUD for global assessment types (CAT1, Exam, etc.)
    """
    queryset           = AssessmentType.objects.all()
    serializer_class   = AssessmentTypeSerializer
    permission_classes = [IsAdmin]


class UnitAssessmentViewSet(viewsets.ModelViewSet):
    """
    Manage assessments per unit offering.
    GET /api/unit-assessments/?unit_offering={id}
    """
    queryset           = UnitAssessment.objects.select_related(
        'unit_offering__unit', 'assessment_type'
    ).all()
    serializer_class   = UnitAssessmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['unit_offering', 'assessment_type', 'is_released']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsLecturerOrCOD()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='release')
    def release(self, request, pk=None):
        assessment = self.get_object()
        assessment.is_released = True
        assessment.save()
        return success_response(message='Assessment released to students.')


# ═══════════════════════════════════════════════════════════════
# MARKS VIEWS
# ═══════════════════════════════════════════════════════════════

class StudentMarkViewSet(viewsets.ModelViewSet):
    """
    Lecturers enter / update student marks.
    GET    /api/marks/?unit_assessment={id}&enrollment={id}
    POST   /api/marks/
    PUT    /api/marks/{id}/
    POST   /api/marks/bulk/         — bulk mark entry
    POST   /api/marks/compute/      — trigger UnitResult computation
    """
    queryset           = StudentMark.objects.select_related(
        'enrollment__student__user',
        'unit_assessment__assessment_type',
        'unit_assessment__unit_offering__unit',
        'marked_by',
    ).all()
    serializer_class   = StudentMarkSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['enrollment', 'unit_assessment', 'is_absent']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'bulk', 'compute'):
            return [IsLecturerOrCOD()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(enrollment__student__user=user)
        if user.role == 'lecturer':
            return qs.filter(unit_assessment__unit_offering__lecturer=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(marked_by=self.request.user)

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        """
        Bulk mark entry for one assessment across all students.
        Body: { unit_assessment: uuid, marks: [{enrollment_id, score, is_absent, remarks}] }
        """
        serializer = BulkMarkSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(errors=serializer.errors)

        assessment_id = serializer.validated_data['unit_assessment']
        marks_data    = serializer.validated_data['marks']

        try:
            assessment = UnitAssessment.objects.get(id=assessment_id)
        except UnitAssessment.DoesNotExist:
            return error_response(message='Unit assessment not found.', status_code=status.HTTP_404_NOT_FOUND)

        created = 0
        updated = 0
        errors  = []

        with transaction.atomic():
            for item in marks_data:
                try:
                    enrollment = Enrollment.objects.get(id=item['enrollment_id'])
                    score      = Decimal(str(item.get('score', 0)))
                    is_absent  = item.get('is_absent', 'false').lower() == 'true'
                    remarks    = item.get('remarks', '')

                    mark, was_created = StudentMark.objects.update_or_create(
                        enrollment=enrollment,
                        unit_assessment=assessment,
                        defaults={
                            'score':     0 if is_absent else score,
                            'is_absent': is_absent,
                            'remarks':   remarks,
                            'marked_by': request.user,
                        }
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1
                except Enrollment.DoesNotExist:
                    errors.append(f'Enrollment {item["enrollment_id"]} not found')
                except Exception as e:
                    errors.append(str(e))

        return success_response(data={
            'created': created,
            'updated': updated,
            'errors':  errors,
        }, message=f'Bulk marks saved: {created} created, {updated} updated.')

    @action(detail=False, methods=['post'])
    def compute(self, request):
        """
        Trigger UnitResult computation for one or many enrollments.
        Body: { enrollment_ids: [uuid, ...] }
        """
        enrollment_ids = request.data.get('enrollment_ids', [])
        if not enrollment_ids:
            return error_response(message='enrollment_ids is required.')

        results = []
        for eid in enrollment_ids:
            result = compute_unit_result(eid)
            results.append(result)

        return success_response(data=results, message='Unit results computed.')


# ═══════════════════════════════════════════════════════════════
# UNIT RESULT VIEWS
# ═══════════════════════════════════════════════════════════════

class UnitResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only unit results. Approve via custom action.
    GET    /api/unit-results/?enrollment={id}&semester={id}
    POST   /api/unit-results/{id}/approve/
    POST   /api/unit-results/bulk-approve/
    """
    queryset           = UnitResult.objects.select_related(
        'enrollment__student__user',
        'enrollment__unit_offering__unit',
        'enrollment__unit_offering__semester',
        'approved_by',
    ).all()
    serializer_class   = UnitResultSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = [
        'enrollment__student', 'enrollment__unit_offering__semester',
        'enrollment__unit_offering', 'is_approved', 'status', 'grade',
    ]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(enrollment__student__user=user, is_approved=True)
        if user.role == 'lecturer':
            return qs.filter(enrollment__unit_offering__lecturer=user)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """COD approves a unit result."""
        result = self.get_object()
        if result.is_approved:
            return error_response(message='Result already approved.')
        result.is_approved  = True
        result.approved_by  = request.user
        result.approved_at  = timezone.now()
        result.save()
        return success_response(message='Result approved.', data=UnitResultSerializer(result).data)

    @action(detail=False, methods=['post'], url_path='bulk-approve')
    def bulk_approve(self, request):
        """Approve all results for a unit offering."""
        offering_id = request.data.get('unit_offering')
        if not offering_id:
            return error_response(message='unit_offering is required.')

        count = UnitResult.objects.filter(
            enrollment__unit_offering_id=offering_id, is_approved=False
        ).update(is_approved=True, approved_by=request.user, approved_at=timezone.now())

        return success_response(message=f'{count} results approved.')


# ═══════════════════════════════════════════════════════════════
# SEMESTER RESULT VIEWS
# ═══════════════════════════════════════════════════════════════

class SemesterResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET    /api/semester-results/?student={id}&semester={id}
    POST   /api/semester-results/compute/
    POST   /api/semester-results/{id}/release/
    POST   /api/semester-results/{id}/approve/
    """
    queryset           = SemesterResult.objects.select_related(
        'student__user', 'semester', 'approved_by'
    ).all()
    serializer_class   = SemesterResultSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['student', 'semester', 'status', 'is_released']

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(student__user=user, is_released=True)
        return qs

    @action(detail=False, methods=['post'])
    def compute(self, request):
        """
        Compute semester results for one or many students.
        Body: { student_ids: [...], semester_id: uuid }
        """
        student_ids = request.data.get('student_ids', [])
        semester_id = request.data.get('semester_id')

        if not semester_id:
            return error_response(message='semester_id is required.')

        if not student_ids:
            # Compute for ALL active students in the semester
            semester = get_object_or_404(Semester, id=semester_id)
            student_ids = list(
                StudentProfile.objects.filter(status='active').values_list('id', flat=True)
            )

        results = []
        for sid in student_ids:
            result = compute_semester_result(str(sid), str(semester_id))
            results.append(result)

        return success_response(data=results, message=f'Computed {len(results)} semester results.')

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        result = self.get_object()
        result.approved_by = request.user
        result.approved_at = timezone.now()
        result.save()
        return success_response(message='Semester result approved.')

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release results to student."""
        result = self.get_object()
        result.is_released = True
        result.save()
        return success_response(message='Results released to student.')

    @action(detail=False, methods=['post'], url_path='bulk-release')
    def bulk_release(self, request):
        """Release all results for a semester."""
        semester_id = request.data.get('semester_id')
        if not semester_id:
            return error_response(message='semester_id is required.')
        count = SemesterResult.objects.filter(
            semester_id=semester_id, is_released=False
        ).update(is_released=True)
        return success_response(message=f'{count} results released.')


# ═══════════════════════════════════════════════════════════════
# PROMOTION VIEWS
# ═══════════════════════════════════════════════════════════════

class PromotionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET    /api/promotions/?student={id}
    POST   /api/promotions/bulk/          — bulk promote a cohort
    """
    queryset           = AcademicPromotion.objects.select_related(
        'student__user', 'from_semester', 'to_semester', 'promoted_by'
    ).all()
    serializer_class   = AcademicPromotionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['student', 'promotion_type', 'to_semester']

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(student__user=user)
        return qs

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        """
        Bulk promote all eligible students in an intake.
        Body: { intake_id, from_semester_id, to_semester_id }
        """
        intake_id       = request.data.get('intake_id')
        from_semester   = request.data.get('from_semester_id')
        to_semester     = request.data.get('to_semester_id')

        if not all([intake_id, to_semester]):
            return error_response(message='intake_id and to_semester_id are required.')

        result = bulk_promote_cohort(
            intake_id=intake_id,
            from_semester_id=from_semester,
            to_semester_id=to_semester,
            promoted_by_id=str(request.user.id),
        )
        return success_response(data=result, message='Bulk promotion complete.')


# ═══════════════════════════════════════════════════════════════
# FINANCE VIEWS
# ═══════════════════════════════════════════════════════════════

class FeeStructureViewSet(viewsets.ModelViewSet):
    """
    CRUD for fee structures per programme per semester.
    GET /api/fee-structures/?programme={id}&academic_year={id}
    """
    queryset           = FeeStructure.objects.select_related('programme', 'academic_year').all()
    serializer_class   = FeeStructureSerializer
    permission_classes = [IsAdminOrFinance]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['programme', 'academic_year', 'year_of_study', 'semester_number', 'is_active']

    def get_permissions(self):
        if self.action in SAFE_METHODS if hasattr(self.request, 'method') else []:
            return [IsAuthenticated()]
        return [IsAdminOrFinance()]


class StudentFeeAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/fee-accounts/?student={id}&academic_year={id}
    POST /api/fee-accounts/{id}/update-balance/
    """
    queryset           = StudentFeeAccount.objects.select_related('student__user', 'academic_year').all()
    serializer_class   = StudentFeeAccountSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['student', 'academic_year', 'is_cleared']

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(student__user=user)
        return qs

    @action(detail=True, methods=['post'], url_path='update-balance')
    def update_balance(self, request, pk=None):
        account = self.get_object()
        account.update_balance()
        return success_response(
            data=StudentFeeAccountSerializer(account).data,
            message='Balance updated.'
        )


class PaymentViewSet(viewsets.ModelViewSet):
    """
    POST   /api/payments/               — record a payment
    GET    /api/payments/?student={id}
    POST   /api/payments/{id}/reverse/  — reverse a payment
    """
    queryset           = Payment.objects.select_related(
        'student__user', 'academic_year', 'semester', 'received_by'
    ).all()
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['student', 'academic_year', 'semester', 'payment_method', 'is_reversed']
    search_fields      = ['reference_number', 'student__reg_number', 'student__user__first_name']
    ordering_fields    = ['payment_date', 'amount']

    def get_permissions(self):
        if self.action in ('create', 'reverse'):
            return [IsAdminOrFinance()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(student__user=user)
        return qs

    def perform_create(self, serializer):
        payment = serializer.save(received_by=self.request.user)
        # Update fee account
        account, _ = StudentFeeAccount.objects.get_or_create(
            student=payment.student,
            academic_year=payment.academic_year,
        )
        account.total_paid += payment.amount
        account.update_balance()

    @action(detail=True, methods=['post'])
    def reverse(self, request, pk=None):
        payment = self.get_object()
        if payment.is_reversed:
            return error_response(message='Payment already reversed.')
        payment.is_reversed = True
        payment.save()
        # Update account balance
        account = StudentFeeAccount.objects.filter(
            student=payment.student, academic_year=payment.academic_year
        ).first()
        if account:
            account.total_paid -= payment.amount
            account.update_balance()
        return success_response(message='Payment reversed.')


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    POST   /api/invoices/              — generate invoice
    GET    /api/invoices/?student={id}
    GET    /api/invoices/{id}/
    """
    queryset           = Invoice.objects.select_related(
        'student__user', 'semester', 'fee_structure'
    ).all()
    serializer_class   = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['student', 'semester', 'is_paid']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrFinance()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs   = super().get_queryset()
        if user.role == 'student':
            return qs.filter(student__user=user)
        return qs

    def perform_create(self, serializer):
        invoice = serializer.save()
        # Update fee account total_billed
        account, _ = StudentFeeAccount.objects.get_or_create(
            student=invoice.student,
            academic_year=invoice.semester.academic_year,
        )
        account.total_billed += invoice.amount_due
        account.update_balance()


# ═══════════════════════════════════════════════════════════════
# TIMETABLE VIEWS
# ═══════════════════════════════════════════════════════════════

class TimetableViewSet(viewsets.ModelViewSet):
    """
    CRUD for timetable entries.
    GET /api/timetable/?unit_offering={id}&day_of_week=mon
    """
    queryset           = Timetable.objects.select_related(
        'unit_offering__unit', 'unit_offering__lecturer', 'unit_offering__semester'
    ).all()
    serializer_class   = TimetableSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['unit_offering', 'day_of_week', 'session_type', 'is_active']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrCOD()]
        return [IsAuthenticated()]


# ═══════════════════════════════════════════════════════════════
# DASHBOARD VIEW
# ═══════════════════════════════════════════════════════════════

class DashboardView(APIView):
    """
    GET /api/dashboard/
    Returns role-specific dashboard statistics.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role

        if role == 'admin':
            return self._admin_dashboard()
        elif role == 'student':
            return self._student_dashboard(user)
        elif role == 'lecturer':
            return self._lecturer_dashboard(user)
        elif role == 'cod':
            return self._cod_dashboard(user)
        elif role == 'dean':
            return self._dean_dashboard(user)
        elif role == 'finance':
            return self._finance_dashboard()
        return error_response(message='Unknown role.', status_code=status.HTTP_403_FORBIDDEN)

    def _admin_dashboard(self):
        try:
            current_year = AcademicYear.objects.get(is_current=True)
        except AcademicYear.DoesNotExist:
            current_year = None

        try:
            current_sem = Semester.objects.get(is_current=True)
        except Semester.DoesNotExist:
            current_sem = None

        revenue = Payment.objects.filter(
            academic_year=current_year, is_reversed=False
        ).aggregate(total=Sum('amount'))['total'] or 0

        data = {
            'total_students':    StudentProfile.objects.count(),
            'active_students':   StudentProfile.objects.filter(status='active').count(),
            'graduated_students': StudentProfile.objects.filter(status='graduated').count(),
            'total_lecturers':   LecturerProfile.objects.filter(is_active=True).count(),
            'total_programmes':  Programme.objects.filter(is_active=True).count(),
            'total_departments': Department.objects.filter(is_active=True).count(),
            'total_faculties':   Faculty.objects.filter(is_active=True).count(),
            'current_semester':  current_sem.name if current_sem else 'Not set',
            'current_year':      current_year.year_label if current_year else 'Not set',
            'total_units':       Unit.objects.filter(is_active=True).count(),
            'revenue_this_year': float(revenue),
            'pending_unit_results': UnitResult.objects.filter(is_approved=False).count(),
            'pending_semester_results': SemesterResult.objects.filter(is_released=False).count(),
            'enrollments_total': Enrollment.objects.filter(is_active=True).count(),
        }
        return success_response(data=data)

    def _student_dashboard(self, user):
        try:
            student = user.student_profile
        except StudentProfile.DoesNotExist:
            return error_response(message='Student profile not found.', status_code=status.HTTP_404_NOT_FOUND)

        try:
            current_sem = Semester.objects.get(is_current=True)
        except Semester.DoesNotExist:
            current_sem = None

        current_units = []
        if current_sem:
            enrollments = student.enrollments.filter(
                unit_offering__semester=current_sem, is_active=True
            ).select_related('unit_offering__unit', 'unit_offering__lecturer')
            current_units = UnitOfferingSerializer(
                [e.unit_offering for e in enrollments], many=True
            ).data

        # Latest semester result
        latest_result = student.semester_results.order_by('-semester__start_date').first()
        latest_gpa    = float(latest_result.gpa) if latest_result else 0.0

        # Fee balance for current year
        fee_balance  = 0.0
        is_cleared   = False
        try:
            current_year = AcademicYear.objects.get(is_current=True)
            account = StudentFeeAccount.objects.get(student=student, academic_year=current_year)
            fee_balance = float(account.balance)
            is_cleared  = account.is_cleared
        except (AcademicYear.DoesNotExist, StudentFeeAccount.DoesNotExist):
            pass

        data = {
            'student':        StudentListSerializer(student).data,
            'current_units':  current_units,
            'latest_gpa':     latest_gpa,
            'cumulative_gpa': float(student.cumulative_gpa),
            'fee_balance':    fee_balance,
            'is_fee_cleared': is_cleared,
            'current_year':   student.current_year_of_study,
            'current_semester': student.current_semester_number,
            'programme':      student.programme.name,
        }
        return success_response(data=data)

    def _lecturer_dashboard(self, user):
        try:
            profile = user.lecturer_profile
        except LecturerProfile.DoesNotExist:
            return error_response(message='Lecturer profile not found.', status_code=status.HTTP_404_NOT_FOUND)

        try:
            current_sem = Semester.objects.get(is_current=True)
        except Semester.DoesNotExist:
            current_sem = None

        current_offerings = UnitOffering.objects.filter(
            lecturer=user, semester=current_sem
        ) if current_sem else UnitOffering.objects.none()

        total_students = Enrollment.objects.filter(
            unit_offering__in=current_offerings, is_active=True
        ).values('student').distinct().count()

        pending_marks = current_offerings.filter(
            assessments__student_marks__isnull=True
        ).count()

        data = {
            'lecturer':       LecturerProfileSerializer(profile).data,
            'units_this_sem': current_offerings.count(),
            'total_students': total_students,
            'pending_marks':  pending_marks,
            'current_units':  UnitOfferingSerializer(current_offerings, many=True).data,
        }
        return success_response(data=data)

    def _cod_dashboard(self, user):
        try:
            dept     = user.department_led
            prog_ids = dept.programmes.values_list('id', flat=True)
            data = {
                'department':      dept.name,
                'total_students':  StudentProfile.objects.filter(programme__in=prog_ids, status='active').count(),
                'total_lecturers': dept.lecturers.filter(is_active=True).count(),
                'total_programmes': dept.programmes.filter(is_active=True).count(),
                'pending_approvals': UnitResult.objects.filter(
                    enrollment__unit_offering__unit__department=dept, is_approved=False
                ).count(),
            }
        except AttributeError:
            data = {'error': 'No department assigned to this COD.'}
        return success_response(data=data)

    def _dean_dashboard(self, user):
        try:
            faculty  = user.faculty_led
            dept_ids = faculty.departments.values_list('id', flat=True)
            prog_ids = Programme.objects.filter(department__in=dept_ids).values_list('id', flat=True)
            data = {
                'faculty':         faculty.name,
                'departments':     faculty.departments.filter(is_active=True).count(),
                'programmes':      Programme.objects.filter(department__in=dept_ids, is_active=True).count(),
                'active_students': StudentProfile.objects.filter(programme__in=prog_ids, status='active').count(),
                'lecturers':       LecturerProfile.objects.filter(department__in=dept_ids, is_active=True).count(),
                'avg_gpa':         StudentProfile.objects.filter(
                    programme__in=prog_ids, status='active'
                ).aggregate(avg=Avg('cumulative_gpa'))['avg'] or 0,
                'pending_promotions': SemesterResult.objects.filter(
                    student__programme__in=prog_ids, is_released=True,
                    student__status='active'
                ).count(),
            }
        except AttributeError:
            data = {'error': 'No faculty assigned to this Dean.'}
        return success_response(data=data)

    def _finance_dashboard(self):
        try:
            current_year = AcademicYear.objects.get(is_current=True)
        except AcademicYear.DoesNotExist:
            current_year = None

        payments = Payment.objects.filter(
            academic_year=current_year, is_reversed=False
        ) if current_year else Payment.objects.none()

        revenue      = payments.aggregate(total=Sum('amount'))['total'] or 0
        total_billed = StudentFeeAccount.objects.filter(
            academic_year=current_year
        ).aggregate(total=Sum('total_billed'))['total'] or 0

        data = {
            'revenue_collected': float(revenue),
            'total_billed':      float(total_billed),
            'outstanding_balance': float(total_billed) - float(revenue),
            'total_payments':    payments.count(),
            'cleared_accounts':  StudentFeeAccount.objects.filter(
                academic_year=current_year, is_cleared=True
            ).count(),
            'defaulters':        StudentFeeAccount.objects.filter(
                academic_year=current_year, is_cleared=False, balance__gt=0
            ).count(),
            'payment_breakdown': {
                method: float(payments.filter(payment_method=method).aggregate(
                    t=Sum('amount')
                )['t'] or 0)
                for method in ('mpesa', 'bank', 'cash', 'scholarship')
            },
        }
        return success_response(data=data)


# ═══════════════════════════════════════════════════════════════
# REPORTS VIEW
# ═══════════════════════════════════════════════════════════════

class ReportsView(APIView):
    """
    GET /api/reports/{type}/
    Supported types: enrollment | results | finance | graduates | defaulters | transcript
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, report_type):
        params = request.query_params

        if report_type == 'enrollment':
            return self._enrollment_report(params)
        elif report_type == 'results':
            return self._results_report(params)
        elif report_type == 'finance':
            return self._finance_report(params)
        elif report_type == 'graduates':
            return self._graduates_report(params)
        elif report_type == 'defaulters':
            return self._defaulters_report(params)
        elif report_type == 'transcript':
            student_id = params.get('student_id')
            if not student_id:
                return error_response(message='student_id is required for transcript.')
            student = get_object_or_404(StudentProfile, id=student_id)
            serializer = AcademicTranscriptSerializer(student, context={'request': request})
            return success_response(data=serializer.data)
        else:
            return error_response(
                message=f'Unknown report type: {report_type}',
                status_code=status.HTTP_404_NOT_FOUND
            )

    def _enrollment_report(self, params):
        qs = StudentProfile.objects.select_related('programme', 'intake', 'user')
        if params.get('programme'):
            qs = qs.filter(programme_id=params['programme'])
        if params.get('intake'):
            qs = qs.filter(intake_id=params['intake'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        summary = {
            'total':         qs.count(),
            'by_programme':  list(
                qs.values('programme__name', 'programme__code')
                  .annotate(count=Count('id'))
                  .order_by('programme__name')
            ),
            'by_status':     list(
                qs.values('status').annotate(count=Count('id'))
            ),
            'by_year':       list(
                qs.values('current_year_of_study').annotate(count=Count('id')).order_by('current_year_of_study')
            ),
        }
        return success_response(data=summary)

    def _results_report(self, params):
        qs = SemesterResult.objects.select_related('student__user', 'semester')
        if params.get('semester'):
            qs = qs.filter(semester_id=params['semester'])
        if params.get('programme'):
            qs = qs.filter(student__programme_id=params['programme'])
        summary = {
            'total':     qs.count(),
            'avg_gpa':   float(qs.aggregate(avg=Avg('gpa'))['avg'] or 0),
            'by_status': list(qs.values('status').annotate(count=Count('id'))),
            'top_students': StudentListSerializer(
                StudentProfile.objects.filter(status='active').order_by('-cumulative_gpa')[:10],
                many=True
            ).data,
        }
        return success_response(data=summary)

    def _finance_report(self, params):
        qs = Payment.objects.filter(is_reversed=False)
        if params.get('academic_year'):
            qs = qs.filter(academic_year_id=params['academic_year'])
        data = {
            'total_revenue': float(qs.aggregate(total=Sum('amount'))['total'] or 0),
            'by_method':     list(
                qs.values('payment_method').annotate(total=Sum('amount'), count=Count('id'))
            ),
            'by_semester':   list(
                qs.values('semester__name').annotate(total=Sum('amount'), count=Count('id'))
            ),
        }
        return success_response(data=data)

    def _graduates_report(self, params):
        qs = StudentProfile.objects.filter(status='graduated').select_related('user', 'programme', 'intake')
        if params.get('programme'):
            qs = qs.filter(programme_id=params['programme'])
        return success_response(data=StudentListSerializer(qs, many=True).data)

    def _defaulters_report(self, params):
        acad_year = params.get('academic_year')
        accounts  = StudentFeeAccount.objects.filter(is_cleared=False, balance__gt=0)
        if acad_year:
            accounts = accounts.filter(academic_year_id=acad_year)
        return success_response(data=StudentFeeAccountSerializer(accounts, many=True).data)