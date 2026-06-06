"""
UON College ERP System — Serializers
All DRF serializers for the core application.
"""

from django.contrib.auth import authenticate
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    User, Faculty, Department, Programme, ProgrammeUnit,
    AcademicYear, Intake, Semester,
    StudentProfile, LecturerProfile,
    Unit, UnitOffering,
    Enrollment,
    AssessmentType, UnitAssessment, StudentMark,
    UnitResult, SemesterResult, AcademicPromotion,
    FeeStructure, StudentFeeAccount, Payment, Invoice,
    Timetable,
)
from .utils import compute_grade


# ═══════════════════════════════════════════════════════════════
# AUTH SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends JWT token with user data so the frontend gets
    user info on login without a second API call.
    """
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['role']  = user.role
        token['name']  = user.full_name
        return token

    def validate(self, attrs):
        # Allow login with email
        email    = attrs.get('email', attrs.get('username', ''))
        password = attrs.get('password', '')

        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})

        user = authenticate(username=username, password=password)

        if not user:
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account has been deactivated.'})

        refresh = self.get_token(user)
        return {
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user':    UserSerializer(user).data,
        }


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=True)

    def validate(self, attrs):
        self.token = attrs['refresh']
        return attrs

    def save(self):
        try:
            RefreshToken(self.token).blacklist()
        except Exception:
            raise serializers.ValidationError({'detail': 'Token is invalid or expired.'})


# ═══════════════════════════════════════════════════════════════
# USER SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class UserSerializer(serializers.ModelSerializer):
    full_name       = serializers.SerializerMethodField()
    role_display    = serializers.CharField(source='get_role_display', read_only=True)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'full_name', 'role', 'role_display', 'phone',
            'profile_picture', 'is_active', 'date_joined', 'date_updated',
        ]
        read_only_fields = ['id', 'date_joined', 'date_updated']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email


class UserCreateSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'role', 'phone', 'password', 'confirm_password',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


# ═══════════════════════════════════════════════════════════════
# INSTITUTIONAL SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class FacultySerializer(serializers.ModelSerializer):
    dean_name         = serializers.SerializerMethodField()
    department_count  = serializers.SerializerMethodField()

    class Meta:
        model  = Faculty
        fields = [
            'id', 'name', 'code', 'dean', 'dean_name',
            'description', 'is_active', 'department_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_dean_name(self, obj):
        return obj.dean.full_name if obj.dean else None

    def get_department_count(self, obj):
        return obj.departments.filter(is_active=True).count()


class DepartmentSerializer(serializers.ModelSerializer):
    faculty_name     = serializers.CharField(source='faculty.name', read_only=True)
    hod_name         = serializers.SerializerMethodField()
    programme_count  = serializers.SerializerMethodField()
    lecturer_count   = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = [
            'id', 'name', 'code', 'faculty', 'faculty_name',
            'hod', 'hod_name', 'description', 'is_active',
            'programme_count', 'lecturer_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_hod_name(self, obj):
        return obj.hod.full_name if obj.hod else None

    def get_programme_count(self, obj):
        return obj.programmes.filter(is_active=True).count()

    def get_lecturer_count(self, obj):
        return obj.lecturers.filter(is_active=True).count()


class ProgrammeSerializer(serializers.ModelSerializer):
    department_name    = serializers.CharField(source='department.name', read_only=True)
    faculty_name       = serializers.CharField(source='department.faculty.name', read_only=True)
    programme_type_display = serializers.CharField(source='get_programme_type_display', read_only=True)
    total_semesters    = serializers.ReadOnlyField()
    student_count      = serializers.SerializerMethodField()

    class Meta:
        model  = Programme
        fields = [
            'id', 'name', 'code', 'department', 'department_name', 'faculty_name',
            'programme_type', 'programme_type_display',
            'duration_years', 'semesters_per_year', 'total_semesters',
            'min_credits_to_pass', 'description', 'is_active',
            'student_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_student_count(self, obj):
        return obj.students.filter(status='active').count()


class ProgrammeUnitSerializer(serializers.ModelSerializer):
    unit_code  = serializers.CharField(source='unit.code', read_only=True)
    unit_name  = serializers.CharField(source='unit.name', read_only=True)

    class Meta:
        model  = ProgrammeUnit
        fields = [
            'id', 'programme', 'unit', 'unit_code', 'unit_name',
            'is_compulsory', 'year_of_study', 'semester_number', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ═══════════════════════════════════════════════════════════════
# ACADEMIC CALENDAR SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class AcademicYearSerializer(serializers.ModelSerializer):
    intake_count   = serializers.SerializerMethodField()
    semester_count = serializers.SerializerMethodField()

    class Meta:
        model  = AcademicYear
        fields = [
            'id', 'year_label', 'start_date', 'end_date',
            'is_current', 'intake_count', 'semester_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_intake_count(self, obj):
        return obj.intakes.count()

    def get_semester_count(self, obj):
        return obj.semesters.count()


class IntakeSerializer(serializers.ModelSerializer):
    academic_year_label  = serializers.CharField(source='academic_year.year_label', read_only=True)
    intake_month_display = serializers.CharField(source='get_intake_month_display', read_only=True)
    student_count        = serializers.SerializerMethodField()

    class Meta:
        model  = Intake
        fields = [
            'id', 'academic_year', 'academic_year_label',
            'intake_month', 'intake_month_display', 'name',
            'start_date', 'end_date',
            'registration_open', 'registration_close',
            'is_active', 'student_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_student_count(self, obj):
        return obj.students.filter(status='active').count()


class SemesterSerializer(serializers.ModelSerializer):
    academic_year_label = serializers.CharField(source='academic_year.year_label', read_only=True)
    intake_name         = serializers.CharField(source='intake.name', read_only=True)

    class Meta:
        model  = Semester
        fields = [
            'id', 'academic_year', 'academic_year_label',
            'intake', 'intake_name', 'semester_number', 'name',
            'start_date', 'end_date',
            'registration_deadline', 'results_release_date',
            'is_current', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ═══════════════════════════════════════════════════════════════
# PROFILE SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class StudentProfileSerializer(serializers.ModelSerializer):
    user             = UserSerializer(read_only=True)
    user_id          = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='student'), source='user', write_only=True
    )
    programme_name   = serializers.CharField(source='programme.name', read_only=True)
    programme_code   = serializers.CharField(source='programme.code', read_only=True)
    intake_name      = serializers.CharField(source='intake.name', read_only=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    sponsor_display  = serializers.CharField(source='get_sponsor_display', read_only=True)
    gender_display   = serializers.CharField(source='get_gender_display', read_only=True)
    total_semesters  = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model  = StudentProfile
        fields = [
            'id', 'user', 'user_id', 'reg_number',
            'programme', 'programme_name', 'programme_code',
            'intake', 'intake_name',
            'current_semester_number', 'current_year_of_study',
            'status', 'status_display', 'sponsor', 'sponsor_display',
            'gender', 'gender_display',
            'date_of_birth', 'national_id', 'county',
            'guardian_name', 'guardian_phone', 'guardian_relationship',
            'admission_date', 'graduation_date',
            'cumulative_gpa', 'total_semesters', 'progress_percent',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reg_number', 'cumulative_gpa', 'created_at', 'updated_at']

    def get_total_semesters(self, obj):
        return obj.programme.total_semesters

    def get_progress_percent(self, obj):
        total = obj.programme.total_semesters
        if total == 0:
            return 0
        return round((obj.current_semester_number / total) * 100, 1)


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lists/tables"""
    full_name      = serializers.CharField(source='user.full_name', read_only=True)
    email          = serializers.CharField(source='user.email', read_only=True)
    programme_code = serializers.CharField(source='programme.code', read_only=True)
    intake_name    = serializers.CharField(source='intake.name', read_only=True)

    class Meta:
        model  = StudentProfile
        fields = [
            'id', 'reg_number', 'full_name', 'email',
            'programme_code', 'intake_name',
            'current_year_of_study', 'current_semester_number',
            'status', 'cumulative_gpa',
        ]


class LecturerProfileSerializer(serializers.ModelSerializer):
    user                = UserSerializer(read_only=True)
    user_id             = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='lecturer'), source='user', write_only=True
    )
    department_name     = serializers.CharField(source='department.name', read_only=True)
    designation_display = serializers.CharField(source='get_designation_display', read_only=True)
    unit_count          = serializers.SerializerMethodField()

    class Meta:
        model  = LecturerProfile
        fields = [
            'id', 'user', 'user_id', 'staff_number',
            'department', 'department_name',
            'designation', 'designation_display',
            'specialization', 'qualification',
            'date_joined', 'is_active', 'unit_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_unit_count(self, obj):
        return obj.user.taught_offerings.count()


# ═══════════════════════════════════════════════════════════════
# UNIT SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class UnitSerializer(serializers.ModelSerializer):
    department_name  = serializers.CharField(source='department.name', read_only=True)
    unit_type_display = serializers.CharField(source='get_unit_type_display', read_only=True)

    class Meta:
        model  = Unit
        fields = [
            'id', 'code', 'name', 'department', 'department_name',
            'unit_type', 'unit_type_display', 'credit_hours',
            'year_of_study', 'semester_number',
            'description', 'prerequisites', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class UnitOfferingSerializer(serializers.ModelSerializer):
    unit_code       = serializers.CharField(source='unit.code', read_only=True)
    unit_name       = serializers.CharField(source='unit.name', read_only=True)
    semester_name   = serializers.CharField(source='semester.name', read_only=True)
    lecturer_name   = serializers.SerializerMethodField()
    is_full         = serializers.ReadOnlyField()
    credit_hours    = serializers.IntegerField(source='unit.credit_hours', read_only=True)

    class Meta:
        model  = UnitOffering
        fields = [
            'id', 'unit', 'unit_code', 'unit_name',
            'semester', 'semester_name',
            'lecturer', 'lecturer_name',
            'room', 'capacity', 'enrolled_count', 'is_full',
            'credit_hours', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'enrolled_count', 'created_at']

    def get_lecturer_name(self, obj):
        return obj.lecturer.full_name if obj.lecturer else 'TBA'


# ═══════════════════════════════════════════════════════════════
# ENROLLMENT SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class EnrollmentSerializer(serializers.ModelSerializer):
    student_name      = serializers.CharField(source='student.user.full_name', read_only=True)
    reg_number        = serializers.CharField(source='student.reg_number', read_only=True)
    unit_code         = serializers.CharField(source='unit_offering.unit.code', read_only=True)
    unit_name         = serializers.CharField(source='unit_offering.unit.name', read_only=True)
    semester_name     = serializers.CharField(source='unit_offering.semester.name', read_only=True)
    status_display    = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Enrollment
        fields = [
            'id', 'student', 'student_name', 'reg_number',
            'unit_offering', 'unit_code', 'unit_name', 'semester_name',
            'status', 'status_display', 'is_active', 'enrolled_at',
        ]
        read_only_fields = ['id', 'enrolled_at']

    def validate(self, attrs):
        offering = attrs.get('unit_offering')
        student  = attrs.get('student')
        if offering and offering.is_full:
            raise serializers.ValidationError({'unit_offering': 'This unit offering is full.'})
        if Enrollment.objects.filter(student=student, unit_offering=offering, is_active=True).exists():
            raise serializers.ValidationError({'detail': 'Student is already enrolled in this unit.'})
        return attrs

    def create(self, validated_data):
        enrollment = super().create(validated_data)
        # Update enrolled_count
        offering = enrollment.unit_offering
        offering.enrolled_count = offering.enrollments.filter(is_active=True).count()
        offering.save()
        return enrollment


# ═══════════════════════════════════════════════════════════════
# ASSESSMENT & MARKS SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class AssessmentTypeSerializer(serializers.ModelSerializer):
    name_display = serializers.CharField(source='get_name_display', read_only=True)

    class Meta:
        model  = AssessmentType
        fields = [
            'id', 'name', 'name_display', 'label',
            'max_score', 'weight_percentage', 'description',
        ]
        read_only_fields = ['id']


class UnitAssessmentSerializer(serializers.ModelSerializer):
    assessment_label  = serializers.CharField(source='assessment_type.label', read_only=True)
    max_score         = serializers.DecimalField(
        source='assessment_type.max_score', max_digits=5, decimal_places=2, read_only=True
    )
    weight_percentage = serializers.DecimalField(
        source='assessment_type.weight_percentage', max_digits=5, decimal_places=2, read_only=True
    )
    unit_code         = serializers.CharField(source='unit_offering.unit.code', read_only=True)

    class Meta:
        model  = UnitAssessment
        fields = [
            'id', 'unit_offering', 'unit_code',
            'assessment_type', 'assessment_label',
            'max_score', 'weight_percentage',
            'due_date', 'is_released', 'instructions', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class StudentMarkSerializer(serializers.ModelSerializer):
    student_name     = serializers.CharField(source='enrollment.student.user.full_name', read_only=True)
    reg_number       = serializers.CharField(source='enrollment.student.reg_number', read_only=True)
    assessment_label = serializers.CharField(source='unit_assessment.assessment_type.label', read_only=True)
    max_score        = serializers.DecimalField(
        source='unit_assessment.assessment_type.max_score',
        max_digits=5, decimal_places=2, read_only=True
    )
    marked_by_name   = serializers.SerializerMethodField()

    class Meta:
        model  = StudentMark
        fields = [
            'id', 'enrollment', 'unit_assessment',
            'student_name', 'reg_number',
            'assessment_label', 'max_score',
            'score', 'is_absent', 'remarks',
            'marked_by', 'marked_by_name',
            'submitted_at', 'updated_at',
        ]
        read_only_fields = ['id', 'submitted_at', 'updated_at']

    def get_marked_by_name(self, obj):
        return obj.marked_by.full_name if obj.marked_by else None

    def validate(self, attrs):
        score      = attrs.get('score', 0)
        assessment = attrs.get('unit_assessment')
        if assessment and score > assessment.assessment_type.max_score:
            raise serializers.ValidationError(
                {'score': f'Score cannot exceed {assessment.assessment_type.max_score}'}
            )
        return attrs


class BulkMarkSerializer(serializers.Serializer):
    """Bulk mark entry: one assessment, many students"""
    unit_assessment = serializers.UUIDField(required=True)
    marks = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        allow_empty=False
    )

    def validate_marks(self, value):
        required_keys = {'enrollment_id', 'score'}
        for item in value:
            missing = required_keys - set(item.keys())
            if missing:
                raise serializers.ValidationError(f'Each mark entry must have: {required_keys}')
        return value


# ═══════════════════════════════════════════════════════════════
# RESULTS SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class UnitResultSerializer(serializers.ModelSerializer):
    student_name    = serializers.CharField(source='enrollment.student.user.full_name', read_only=True)
    reg_number      = serializers.CharField(source='enrollment.student.reg_number', read_only=True)
    unit_code       = serializers.CharField(source='enrollment.unit_offering.unit.code', read_only=True)
    unit_name       = serializers.CharField(source='enrollment.unit_offering.unit.name', read_only=True)
    semester_name   = serializers.CharField(source='enrollment.unit_offering.semester.name', read_only=True)
    credit_hours    = serializers.IntegerField(
        source='enrollment.unit_offering.unit.credit_hours', read_only=True
    )
    approved_by_name = serializers.SerializerMethodField()
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = UnitResult
        fields = [
            'id', 'enrollment',
            'student_name', 'reg_number',
            'unit_code', 'unit_name', 'semester_name', 'credit_hours',
            'cat_total', 'exam_score', 'total_score',
            'grade', 'grade_points', 'status', 'status_display',
            'is_approved', 'approved_by', 'approved_by_name', 'approved_at',
            'is_supplementary', 'supplementary_score',
            'computed_at',
        ]
        read_only_fields = [
            'id', 'grade', 'grade_points', 'total_score',
            'approved_at', 'computed_at',
        ]

    def get_approved_by_name(self, obj):
        return obj.approved_by.full_name if obj.approved_by else None


class SemesterResultSerializer(serializers.ModelSerializer):
    student_name     = serializers.CharField(source='student.user.full_name', read_only=True)
    reg_number       = serializers.CharField(source='student.reg_number', read_only=True)
    programme_name   = serializers.CharField(source='student.programme.name', read_only=True)
    semester_name    = serializers.CharField(source='semester.name', read_only=True)
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    unit_results     = serializers.SerializerMethodField()

    class Meta:
        model  = SemesterResult
        fields = [
            'id', 'student', 'student_name', 'reg_number', 'programme_name',
            'semester', 'semester_name',
            'gpa', 'cumulative_gpa',
            'credits_attempted', 'credits_earned',
            'units_passed', 'units_failed',
            'status', 'status_display', 'remarks',
            'is_released', 'approved_by', 'approved_by_name', 'approved_at',
            'unit_results', 'computed_at',
        ]
        read_only_fields = [
            'id', 'gpa', 'cumulative_gpa', 'credits_attempted', 'credits_earned',
            'units_passed', 'units_failed', 'approved_at', 'computed_at',
        ]

    def get_approved_by_name(self, obj):
        return obj.approved_by.full_name if obj.approved_by else None

    def get_unit_results(self, obj):
        results = UnitResult.objects.filter(
            enrollment__student=obj.student,
            enrollment__unit_offering__semester=obj.semester,
        ).select_related(
            'enrollment__unit_offering__unit'
        )
        return UnitResultSerializer(results, many=True).data


class AcademicTranscriptSerializer(serializers.ModelSerializer):
    """Full academic transcript for a student — grouped by semester"""
    student         = StudentListSerializer(read_only=True)
    semester_results = serializers.SerializerMethodField()

    class Meta:
        model  = StudentProfile
        fields = ['student', 'cumulative_gpa', 'semester_results']

    def get_semester_results(self, obj):
        results = obj.semester_results.select_related('semester').order_by('semester__start_date')
        return SemesterResultSerializer(results, many=True, context=self.context).data


class AcademicPromotionSerializer(serializers.ModelSerializer):
    student_name          = serializers.CharField(source='student.user.full_name', read_only=True)
    reg_number            = serializers.CharField(source='student.reg_number', read_only=True)
    from_semester_name    = serializers.CharField(source='from_semester.name', read_only=True)
    to_semester_name      = serializers.CharField(source='to_semester.name', read_only=True)
    promotion_type_display = serializers.CharField(source='get_promotion_type_display', read_only=True)
    promoted_by_name      = serializers.SerializerMethodField()

    class Meta:
        model  = AcademicPromotion
        fields = [
            'id', 'student', 'student_name', 'reg_number',
            'from_semester', 'from_semester_name',
            'to_semester', 'to_semester_name',
            'from_year', 'to_year', 'from_sem_number', 'to_sem_number',
            'promotion_type', 'promotion_type_display',
            'promoted_by', 'promoted_by_name', 'promoted_at',
            'remarks', 'gpa_at_promotion',
        ]
        read_only_fields = ['id', 'promoted_at']

    def get_promoted_by_name(self, obj):
        return obj.promoted_by.full_name if obj.promoted_by else None


# ═══════════════════════════════════════════════════════════════
# FINANCE SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class FeeStructureSerializer(serializers.ModelSerializer):
    programme_name      = serializers.CharField(source='programme.name', read_only=True)
    programme_code      = serializers.CharField(source='programme.code', read_only=True)
    academic_year_label = serializers.CharField(source='academic_year.year_label', read_only=True)
    total_fee           = serializers.ReadOnlyField()

    class Meta:
        model  = FeeStructure
        fields = [
            'id', 'programme', 'programme_name', 'programme_code',
            'academic_year', 'academic_year_label',
            'year_of_study', 'semester_number',
            'tuition_fee', 'registration_fee', 'examination_fee',
            'library_fee', 'caution_money', 'medical_fee',
            'activity_fee', 'other_fees', 'total_fee',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentFeeAccountSerializer(serializers.ModelSerializer):
    student_name        = serializers.CharField(source='student.user.full_name', read_only=True)
    reg_number          = serializers.CharField(source='student.reg_number', read_only=True)
    academic_year_label = serializers.CharField(source='academic_year.year_label', read_only=True)

    class Meta:
        model  = StudentFeeAccount
        fields = [
            'id', 'student', 'student_name', 'reg_number',
            'academic_year', 'academic_year_label',
            'total_billed', 'total_paid', 'balance', 'is_cleared',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'balance', 'is_cleared', 'created_at', 'updated_at']


class PaymentSerializer(serializers.ModelSerializer):
    student_name          = serializers.CharField(source='student.user.full_name', read_only=True)
    reg_number            = serializers.CharField(source='student.reg_number', read_only=True)
    academic_year_label   = serializers.CharField(source='academic_year.year_label', read_only=True)
    semester_name         = serializers.CharField(source='semester.name', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    received_by_name      = serializers.SerializerMethodField()

    class Meta:
        model  = Payment
        fields = [
            'id', 'student', 'student_name', 'reg_number',
            'academic_year', 'academic_year_label',
            'semester', 'semester_name',
            'amount', 'payment_date',
            'payment_method', 'payment_method_display',
            'reference_number', 'received_by', 'received_by_name',
            'notes', 'is_reversed', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_received_by_name(self, obj):
        return obj.received_by.full_name if obj.received_by else None

    def validate_reference_number(self, value):
        if Payment.objects.filter(reference_number=value).exists():
            raise serializers.ValidationError('A payment with this reference number already exists.')
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    student_name    = serializers.CharField(source='student.user.full_name', read_only=True)
    reg_number      = serializers.CharField(source='student.reg_number', read_only=True)
    semester_name   = serializers.CharField(source='semester.name', read_only=True)
    balance         = serializers.ReadOnlyField()

    class Meta:
        model  = Invoice
        fields = [
            'id', 'invoice_number', 'student', 'student_name', 'reg_number',
            'semester', 'semester_name', 'fee_structure',
            'amount_due', 'amount_paid', 'balance',
            'due_date', 'is_paid', 'notes', 'generated_at',
        ]
        read_only_fields = ['id', 'invoice_number', 'balance', 'is_paid', 'generated_at']


# ═══════════════════════════════════════════════════════════════
# TIMETABLE SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class TimetableSerializer(serializers.ModelSerializer):
    unit_code           = serializers.CharField(source='unit_offering.unit.code', read_only=True)
    unit_name           = serializers.CharField(source='unit_offering.unit.name', read_only=True)
    lecturer_name       = serializers.SerializerMethodField()
    day_display         = serializers.CharField(source='get_day_of_week_display', read_only=True)
    session_type_display = serializers.CharField(source='get_session_type_display', read_only=True)
    week_type_display   = serializers.CharField(source='get_week_type_display', read_only=True)

    class Meta:
        model  = Timetable
        fields = [
            'id', 'unit_offering', 'unit_code', 'unit_name', 'lecturer_name',
            'day_of_week', 'day_display', 'start_time', 'end_time',
            'venue', 'session_type', 'session_type_display',
            'week_type', 'week_type_display', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_lecturer_name(self, obj):
        lecturer = obj.unit_offering.lecturer
        return lecturer.full_name if lecturer else 'TBA'


# ═══════════════════════════════════════════════════════════════
# DASHBOARD SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class AdminDashboardSerializer(serializers.Serializer):
    total_students     = serializers.IntegerField()
    active_students    = serializers.IntegerField()
    total_lecturers    = serializers.IntegerField()
    total_programmes   = serializers.IntegerField()
    total_departments  = serializers.IntegerField()
    total_faculties    = serializers.IntegerField()
    current_semester   = serializers.CharField()
    current_year       = serializers.CharField()
    enrollments_today  = serializers.IntegerField()
    revenue_this_year  = serializers.DecimalField(max_digits=15, decimal_places=2)
    pending_approvals  = serializers.IntegerField()


class StudentDashboardSerializer(serializers.Serializer):
    student         = StudentListSerializer()
    current_units   = UnitOfferingSerializer(many=True)
    latest_gpa      = serializers.DecimalField(max_digits=4, decimal_places=2)
    cumulative_gpa  = serializers.DecimalField(max_digits=4, decimal_places=2)
    fee_balance     = serializers.DecimalField(max_digits=12, decimal_places=2)
    is_fee_cleared  = serializers.BooleanField()
    announcements   = serializers.ListField(child=serializers.DictField())


class LecturerDashboardSerializer(serializers.Serializer):
    lecturer        = LecturerProfileSerializer()
    current_units   = UnitOfferingSerializer(many=True)
    pending_marks   = serializers.IntegerField()
    total_students  = serializers.IntegerField()
    units_this_sem  = serializers.IntegerField()