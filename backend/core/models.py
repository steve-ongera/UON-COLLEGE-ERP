"""
UON College ERP System — Core Models
University of Nairobi Enterprise Resource Planning

Model Groups:
  1. User & Authentication
  2. Institutional (Faculty, Department, Programme)
  3. Academic Calendar (AcademicYear, Intake, Semester)
  4. Units & Offerings
  5. Enrollment
  6. Assessments & Marks
  7. Results & Promotions
  8. Finance
  9. Timetable
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.conf import settings


# ═══════════════════════════════════════════════════════════════
# 1. USER & AUTHENTICATION
# ═══════════════════════════════════════════════════════════════

class User(AbstractUser):
    """
    Extended User model with role-based access.
    email is the primary identifier (used for login).
    """
    ROLE_CHOICES = [
        ('admin',    'System Administrator'),
        ('student',  'Student'),
        ('lecturer', 'Lecturer'),
        ('cod',      'Chair of Department'),
        ('dean',     'Faculty Dean'),
        ('finance',  'Finance Officer'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email         = models.EmailField(unique=True)
    role          = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    phone         = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    is_active     = models.BooleanField(default=True)
    date_updated  = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'users'
        ordering = ['last_name', 'first_name']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.get_full_name()} ({self.email}) — {self.get_role_display()}'

    @property
    def full_name(self):
        return self.get_full_name() or self.email

    def has_role(self, *roles):
        return self.role in roles


# ═══════════════════════════════════════════════════════════════
# 2. INSTITUTIONAL MODELS
# ═══════════════════════════════════════════════════════════════

class Faculty(models.Model):
    """Top-level academic unit (e.g. Faculty of Engineering)"""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=200, unique=True)
    code        = models.CharField(max_length=20, unique=True)
    dean        = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='faculty_led', limit_choices_to={'role': 'dean'}
    )
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'faculties'
        verbose_name_plural = 'Faculties'
        ordering = ['name']

    def __str__(self):
        return f'{self.code} — {self.name}'


class Department(models.Model):
    """Academic department within a Faculty"""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=200)
    code        = models.CharField(max_length=20, unique=True)
    faculty     = models.ForeignKey(Faculty, on_delete=models.CASCADE, related_name='departments')
    hod         = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='department_led', limit_choices_to={'role': 'cod'}
    )
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'
        unique_together = [['name', 'faculty']]
        ordering = ['faculty', 'name']

    def __str__(self):
        return f'{self.code} — {self.name} ({self.faculty.code})'


class Programme(models.Model):
    """
    Academic programme offered by a Department.
    Supports: Certificate, Diploma, Undergraduate, Postgraduate Diploma,
              Masters, PhD — with flexible duration and semester structure.
    """
    PROGRAMME_TYPE_CHOICES = [
        ('certificate',            'Certificate'),
        ('diploma',                'Diploma'),
        ('undergraduate',          'Undergraduate Degree'),
        ('postgraduate_diploma',   'Postgraduate Diploma'),
        ('masters',                'Masters Degree'),
        ('phd',                    'Doctor of Philosophy (PhD)'),
    ]
    DURATION_CHOICES   = [(i, f'{i} Year{"s" if i > 1 else ""}') for i in range(1, 6)]
    SEMESTERS_CHOICES  = [(2, '2 Semesters/Year'), (3, '3 Semesters/Year')]

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name                = models.CharField(max_length=200)
    code                = models.CharField(max_length=20, unique=True)
    department          = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='programmes')
    programme_type      = models.CharField(max_length=30, choices=PROGRAMME_TYPE_CHOICES)
    duration_years      = models.IntegerField(choices=DURATION_CHOICES)
    semesters_per_year  = models.IntegerField(choices=SEMESTERS_CHOICES, default=2)
    min_credits_to_pass = models.IntegerField(default=120, help_text='Minimum credits required to graduate')
    description         = models.TextField(blank=True)
    is_active           = models.BooleanField(default=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'programmes'
        ordering = ['department', 'name']

    def __str__(self):
        return f'{self.code} — {self.name} ({self.get_programme_type_display()})'

    @property
    def total_semesters(self):
        return self.duration_years * self.semesters_per_year


# ═══════════════════════════════════════════════════════════════
# 3. ACADEMIC CALENDAR
# ═══════════════════════════════════════════════════════════════

class AcademicYear(models.Model):
    """e.g. 2024/2025"""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    year_label  = models.CharField(max_length=20, unique=True, help_text='e.g. 2024/2025')
    start_date  = models.DateField()
    end_date    = models.DateField()
    is_current  = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academic_years'
        ordering = ['-start_date']

    def __str__(self):
        return self.year_label

    def save(self, *args, **kwargs):
        # Only one current academic year at a time
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class Intake(models.Model):
    """
    A cohort intake within an academic year.
    Multiple intakes per year: January, May, September.
    """
    INTAKE_MONTH_CHOICES = [
        ('january',   'January Intake'),
        ('may',       'May Intake'),
        ('september', 'September Intake'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='intakes')
    intake_month  = models.CharField(max_length=20, choices=INTAKE_MONTH_CHOICES)
    name          = models.CharField(max_length=100, help_text='e.g. January 2024')
    start_date    = models.DateField()
    end_date      = models.DateField()
    registration_open  = models.DateField(null=True, blank=True)
    registration_close = models.DateField(null=True, blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'intakes'
        unique_together = [['academic_year', 'intake_month']]
        ordering = ['academic_year', 'start_date']

    def __str__(self):
        return f'{self.name} ({self.academic_year})'


class Semester(models.Model):
    """
    A semester within an intake / academic year.
    Each intake has 2 or 3 semesters depending on the programme.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year    = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='semesters')
    intake           = models.ForeignKey(Intake, on_delete=models.CASCADE, related_name='semesters', null=True, blank=True)
    semester_number  = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text='1, 2, or 3'
    )
    name             = models.CharField(max_length=100, help_text='e.g. Semester 1 — 2024/2025')
    start_date       = models.DateField()
    end_date         = models.DateField()
    registration_deadline = models.DateField(null=True, blank=True)
    results_release_date  = models.DateField(null=True, blank=True)
    is_current       = models.BooleanField(default=False)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'semesters'
        ordering = ['academic_year', 'semester_number']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_current:
            Semester.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════
# 4. STUDENT & LECTURER PROFILES
# ═══════════════════════════════════════════════════════════════

class StudentProfile(models.Model):
    """
    Extended profile for students.
    Registration number is auto-generated on creation.
    """
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    STATUS_CHOICES = [
        ('active',        'Active'),
        ('deferred',      'Deferred'),
        ('discontinued',  'Discontinued'),
        ('graduated',     'Graduated'),
        ('suspended',     'Suspended'),
        ('on_leave',      'On Leave'),
    ]
    SPONSOR_CHOICES = [
        ('self',        'Self-Sponsored'),
        ('government',  'Government Sponsored'),
        ('bursary',     'Bursary'),
        ('scholarship', 'Scholarship'),
        ('employer',    'Employer-Sponsored'),
    ]

    id                   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user                 = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    reg_number           = models.CharField(max_length=30, unique=True, blank=True)
    programme            = models.ForeignKey(Programme, on_delete=models.PROTECT, related_name='students')
    intake               = models.ForeignKey(Intake, on_delete=models.PROTECT, related_name='students')
    current_semester_number = models.IntegerField(default=1)
    current_year_of_study   = models.IntegerField(default=1)
    status               = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    sponsor              = models.CharField(max_length=20, choices=SPONSOR_CHOICES, default='self')
    date_of_birth        = models.DateField(null=True, blank=True)
    national_id          = models.CharField(max_length=20, blank=True, null=True, unique=True)
    gender               = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    county               = models.CharField(max_length=50, blank=True)
    guardian_name        = models.CharField(max_length=100, blank=True)
    guardian_phone       = models.CharField(max_length=20, blank=True)
    guardian_relationship = models.CharField(max_length=50, blank=True)
    admission_date       = models.DateField(default=timezone.now)
    graduation_date      = models.DateField(null=True, blank=True)
    cumulative_gpa       = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_profiles'
        ordering = ['reg_number']

    def __str__(self):
        return f'{self.reg_number} — {self.user.full_name}'

    def save(self, *args, **kwargs):
        if not self.reg_number:
            self.reg_number = self._generate_reg_number()
        super().save(*args, **kwargs)

    def _generate_reg_number(self):
        year = self.intake.start_date.year if self.intake else timezone.now().year
        month = self.intake.intake_month[:3].upper() if self.intake else 'JAN'
        prog_code = self.programme.code if self.programme else 'UON'
        count = StudentProfile.objects.filter(
            intake=self.intake, programme=self.programme
        ).count() + 1
        return f'UON/{year}/{month}/{prog_code}/{count:04d}'


class LecturerProfile(models.Model):
    """Extended profile for teaching staff"""
    DESIGNATION_CHOICES = [
        ('tutorial_fellow',    'Tutorial Fellow'),
        ('assistant_lecturer', 'Assistant Lecturer'),
        ('lecturer',           'Lecturer'),
        ('senior_lecturer',    'Senior Lecturer'),
        ('associate_professor','Associate Professor'),
        ('professor',          'Professor'),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='lecturer_profile')
    staff_number    = models.CharField(max_length=30, unique=True)
    department      = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='lecturers')
    designation     = models.CharField(max_length=30, choices=DESIGNATION_CHOICES, default='lecturer')
    specialization  = models.CharField(max_length=200, blank=True)
    qualification   = models.CharField(max_length=200, blank=True, help_text='e.g. PhD Computer Science')
    date_joined     = models.DateField(default=timezone.now)
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lecturer_profiles'
        ordering = ['staff_number']

    def __str__(self):
        return f'{self.staff_number} — {self.user.full_name} ({self.get_designation_display()})'


# ═══════════════════════════════════════════════════════════════
# 5. UNITS & OFFERINGS
# ═══════════════════════════════════════════════════════════════

class Unit(models.Model):
    """
    An academic unit/course (module).
    Units belong to a department but can be shared across programmes.
    """
    UNIT_TYPE_CHOICES = [
        ('core',     'Core / Compulsory'),
        ('elective', 'Elective'),
        ('common',   'Common Unit'),
        ('project',  'Project / Thesis'),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code             = models.CharField(max_length=20, unique=True)
    name             = models.CharField(max_length=200)
    department       = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='units')
    unit_type        = models.CharField(max_length=20, choices=UNIT_TYPE_CHOICES, default='core')
    credit_hours     = models.IntegerField(default=3, validators=[MinValueValidator(1), MaxValueValidator(10)])
    year_of_study    = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Which year of study this unit is normally taken'
    )
    semester_number  = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text='Which semester this unit is normally offered'
    )
    description      = models.TextField(blank=True)
    prerequisites    = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='required_for')
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'units'
        ordering = ['code']

    def __str__(self):
        return f'{self.code} — {self.name}'


class ProgrammeUnit(models.Model):
    """
    Many-to-many pivot: which units belong to which programmes.
    Tracks whether the unit is compulsory for that programme.
    """
    programme    = models.ForeignKey(Programme, on_delete=models.CASCADE, related_name='programme_units')
    unit         = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='programme_units')
    is_compulsory = models.BooleanField(default=True)
    year_of_study = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    semester_number = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)]
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'programme_units'
        unique_together = [['programme', 'unit']]

    def __str__(self):
        return f'{self.programme.code} → {self.unit.code}'


class UnitOffering(models.Model):
    """
    A unit offered in a specific semester by a specific lecturer.
    This is the entity students actually enroll into.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit            = models.ForeignKey(Unit, on_delete=models.PROTECT, related_name='offerings')
    semester        = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name='unit_offerings')
    lecturer        = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='taught_offerings', limit_choices_to={'role': 'lecturer'}
    )
    room            = models.CharField(max_length=50, blank=True)
    capacity        = models.IntegerField(default=60)
    enrolled_count  = models.IntegerField(default=0)
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'unit_offerings'
        unique_together = [['unit', 'semester']]
        ordering = ['semester', 'unit__code']

    def __str__(self):
        return f'{self.unit.code} — {self.semester.name}'

    @property
    def is_full(self):
        return self.enrolled_count >= self.capacity


# ═══════════════════════════════════════════════════════════════
# 6. ENROLLMENT
# ═══════════════════════════════════════════════════════════════

class Enrollment(models.Model):
    """Student registered to a specific unit offering"""
    STATUS_CHOICES = [
        ('registered',  'Registered'),
        ('dropped',     'Dropped'),
        ('completed',   'Completed'),
        ('incomplete',  'Incomplete'),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student         = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='enrollments')
    unit_offering   = models.ForeignKey(UnitOffering, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at     = models.DateTimeField(auto_now_add=True)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered')
    is_active       = models.BooleanField(default=True)

    class Meta:
        db_table = 'enrollments'
        unique_together = [['student', 'unit_offering']]
        ordering = ['-enrolled_at']

    def __str__(self):
        return f'{self.student.reg_number} → {self.unit_offering.unit.code}'


# ═══════════════════════════════════════════════════════════════
# 7. ASSESSMENTS & MARKS
# ═══════════════════════════════════════════════════════════════

class AssessmentType(models.Model):
    """
    Types of assessment (CAT1, CAT2, Exam, Assignment, etc.)
    weight_percentage must sum to 100 per unit offering.
    """
    ASSESSMENT_CHOICES = [
        ('cat1',       'CAT 1'),
        ('cat2',       'CAT 2'),
        ('cat3',       'CAT 3'),
        ('assignment', 'Assignment'),
        ('project',    'Project'),
        ('practical',  'Practical'),
        ('exam',       'Final Exam'),
    ]

    id                 = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name               = models.CharField(max_length=20, choices=ASSESSMENT_CHOICES, unique=True)
    label              = models.CharField(max_length=50)
    max_score          = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    weight_percentage  = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    description        = models.TextField(blank=True)

    class Meta:
        db_table = 'assessment_types'
        ordering = ['name']

    def __str__(self):
        return f'{self.label} ({self.weight_percentage}%)'


class UnitAssessment(models.Model):
    """A specific assessment attached to a unit offering"""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit_offering   = models.ForeignKey(UnitOffering, on_delete=models.CASCADE, related_name='assessments')
    assessment_type = models.ForeignKey(AssessmentType, on_delete=models.PROTECT, related_name='unit_assessments')
    due_date        = models.DateField(null=True, blank=True)
    is_released     = models.BooleanField(default=False)
    instructions    = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'unit_assessments'
        unique_together = [['unit_offering', 'assessment_type']]
        ordering = ['unit_offering', 'assessment_type__name']

    def __str__(self):
        return f'{self.unit_offering.unit.code} — {self.assessment_type.label}'


class StudentMark(models.Model):
    """Individual mark for a student on a specific assessment"""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment      = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='marks')
    unit_assessment = models.ForeignKey(UnitAssessment, on_delete=models.CASCADE, related_name='student_marks')
    score           = models.DecimalField(
        max_digits=6, decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    submitted_at    = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)
    marked_by       = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='marks_entered'
    )
    remarks         = models.TextField(blank=True)
    is_absent       = models.BooleanField(default=False)

    class Meta:
        db_table = 'student_marks'
        unique_together = [['enrollment', 'unit_assessment']]
        ordering = ['enrollment__student__reg_number']

    def __str__(self):
        return (
            f'{self.enrollment.student.reg_number} — '
            f'{self.unit_assessment.assessment_type.label}: {self.score}'
        )

    def clean(self):
        from django.core.exceptions import ValidationError
        max_score = self.unit_assessment.assessment_type.max_score
        if self.score > max_score:
            raise ValidationError(f'Score cannot exceed {max_score}')


# ═══════════════════════════════════════════════════════════════
# 8. RESULTS & PROMOTIONS
# ═══════════════════════════════════════════════════════════════

class UnitResult(models.Model):
    """
    Aggregated result for a student in a specific unit per semester.
    Grade and grade points are computed from StudentMark records.
    """
    GRADE_CHOICES = [
        ('A',  'A  — Excellent (70–100)'),
        ('B+', 'B+ — Very Good (65–69)'),
        ('B',  'B  — Good (60–64)'),
        ('C+', 'C+ — Above Average (55–59)'),
        ('C',  'C  — Average (50–54)'),
        ('D+', 'D+ — Below Average (45–49)'),
        ('D',  'D  — Pass (40–44)'),
        ('E',  'E  — Fail (0–39)'),
    ]
    STATUS_CHOICES = [
        ('pass',        'Pass'),
        ('fail',        'Fail'),
        ('incomplete',  'Incomplete'),
        ('absent',      'Absent'),
        ('supplementary', 'Supplementary'),
        ('withheld',    'Withheld'),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment      = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name='unit_result')
    cat_total       = models.DecimalField(max_digits=6, decimal_places=2, default=0.00,
                                          help_text='Total CAT score (weighted)')
    exam_score      = models.DecimalField(max_digits=6, decimal_places=2, default=0.00,
                                          help_text='Exam score (weighted)')
    total_score     = models.DecimalField(max_digits=6, decimal_places=2, default=0.00,
                                          help_text='Final score out of 100')
    grade           = models.CharField(max_length=2, choices=GRADE_CHOICES, blank=True)
    grade_points    = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='incomplete')
    is_approved     = models.BooleanField(default=False, help_text='COD approved')
    approved_by     = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_unit_results'
    )
    approved_at     = models.DateTimeField(null=True, blank=True)
    is_supplementary = models.BooleanField(default=False)
    supplementary_score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    computed_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'unit_results'
        ordering = ['enrollment__student__reg_number']

    def __str__(self):
        return (
            f'{self.enrollment.student.reg_number} — '
            f'{self.enrollment.unit_offering.unit.code}: {self.grade} ({self.total_score})'
        )


class SemesterResult(models.Model):
    """
    Aggregated GPA and status for a student for a full semester.
    Computed from all UnitResult records for the semester.
    """
    STATUS_CHOICES = [
        ('pass',        'Pass'),
        ('fail',        'Fail'),
        ('probation',   'Academic Probation'),
        ('repeat',      'Repeat Semester'),
        ('supplementary', 'Supplementary'),
        ('distinction', 'Pass with Distinction'),
    ]

    id                 = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student            = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='semester_results')
    semester           = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name='semester_results')
    gpa                = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    cumulative_gpa     = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    credits_attempted  = models.IntegerField(default=0)
    credits_earned     = models.IntegerField(default=0)
    units_passed       = models.IntegerField(default=0)
    units_failed       = models.IntegerField(default=0)
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pass')
    remarks            = models.TextField(blank=True)
    is_released        = models.BooleanField(default=False)
    approved_by        = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_semester_results'
    )
    approved_at        = models.DateTimeField(null=True, blank=True)
    computed_at        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'semester_results'
        unique_together = [['student', 'semester']]
        ordering = ['-semester__start_date']

    def __str__(self):
        return (
            f'{self.student.reg_number} — '
            f'{self.semester.name}: GPA {self.gpa} ({self.get_status_display()})'
        )


class AcademicPromotion(models.Model):
    """
    Records a student's progression from one semester/year to the next.
    Triggered by the promotion engine in utils.py.
    """
    PROMOTION_TYPE_CHOICES = [
        ('normal',         'Normal Promotion'),
        ('supplementary',  'After Supplementary Exam'),
        ('repeat',         'Repeat Semester'),
        ('graduate',       'Graduation'),
        ('defer',          'Deferral'),
        ('discontinue',    'Discontinuation'),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student        = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='promotions')
    from_semester  = models.ForeignKey(
        Semester, on_delete=models.PROTECT, related_name='promotions_from', null=True, blank=True
    )
    to_semester    = models.ForeignKey(
        Semester, on_delete=models.PROTECT, related_name='promotions_to', null=True, blank=True
    )
    from_year      = models.IntegerField()
    to_year        = models.IntegerField()
    from_sem_number = models.IntegerField()
    to_sem_number   = models.IntegerField()
    promotion_type = models.CharField(max_length=20, choices=PROMOTION_TYPE_CHOICES)
    promoted_by    = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='promotions_made'
    )
    promoted_at    = models.DateTimeField(auto_now_add=True)
    remarks        = models.TextField(blank=True)
    gpa_at_promotion = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'academic_promotions'
        ordering = ['-promoted_at']

    def __str__(self):
        return (
            f'{self.student.reg_number}: Year {self.from_year} Sem {self.from_sem_number} → '
            f'Year {self.to_year} Sem {self.to_sem_number} ({self.get_promotion_type_display()})'
        )


# ═══════════════════════════════════════════════════════════════
# 9. FINANCE
# ═══════════════════════════════════════════════════════════════

class FeeStructure(models.Model):
    """Fee breakdown per programme per semester per academic year"""
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    programme        = models.ForeignKey(Programme, on_delete=models.PROTECT, related_name='fee_structures')
    academic_year    = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name='fee_structures')
    year_of_study    = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    semester_number  = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(3)])
    tuition_fee      = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    registration_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    examination_fee  = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    library_fee      = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    caution_money    = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    medical_fee      = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    activity_fee     = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    other_fees       = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'fee_structures'
        unique_together = [['programme', 'academic_year', 'year_of_study', 'semester_number']]
        ordering = ['programme', 'academic_year', 'year_of_study', 'semester_number']

    def __str__(self):
        return (
            f'{self.programme.code} — {self.academic_year} — '
            f'Yr {self.year_of_study} Sem {self.semester_number}: KES {self.total_fee:,.2f}'
        )

    @property
    def total_fee(self):
        return (
            self.tuition_fee + self.registration_fee + self.examination_fee +
            self.library_fee + self.caution_money + self.medical_fee +
            self.activity_fee + self.other_fees
        )


class StudentFeeAccount(models.Model):
    """Running fee account for a student per academic year"""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student         = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='fee_accounts')
    academic_year   = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name='fee_accounts')
    total_billed    = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_paid      = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    balance         = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_cleared      = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_fee_accounts'
        unique_together = [['student', 'academic_year']]

    def __str__(self):
        return f'{self.student.reg_number} — {self.academic_year}: Balance KES {self.balance:,.2f}'

    def update_balance(self):
        self.balance = self.total_billed - self.total_paid
        self.is_cleared = self.balance <= 0
        self.save()


class Payment(models.Model):
    """Individual payment record"""
    PAYMENT_METHOD_CHOICES = [
        ('mpesa',       'M-Pesa'),
        ('bank',        'Bank Transfer'),
        ('cash',        'Cash'),
        ('scholarship', 'Scholarship/Bursary'),
        ('waiver',      'Fee Waiver'),
        ('cheque',      'Cheque'),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student          = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='payments')
    academic_year    = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name='payments')
    semester         = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name='payments', null=True, blank=True)
    amount           = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date     = models.DateField(default=timezone.now)
    payment_method   = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_number = models.CharField(max_length=100, unique=True)
    received_by      = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='payments_received'
    )
    notes            = models.TextField(blank=True)
    is_reversed      = models.BooleanField(default=False)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date']

    def __str__(self):
        return (
            f'{self.student.reg_number} — KES {self.amount:,.2f} '
            f'via {self.get_payment_method_display()} ({self.reference_number})'
        )


class Invoice(models.Model):
    """Fee invoice generated for a student per semester"""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number  = models.CharField(max_length=50, unique=True)
    student         = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='invoices')
    semester        = models.ForeignKey(Semester, on_delete=models.PROTECT, related_name='invoices')
    fee_structure   = models.ForeignKey(FeeStructure, on_delete=models.PROTECT, related_name='invoices', null=True, blank=True)
    amount_due      = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid     = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    balance         = models.DecimalField(max_digits=12, decimal_places=2)
    due_date        = models.DateField()
    is_paid         = models.BooleanField(default=False)
    generated_at    = models.DateTimeField(auto_now_add=True)
    notes           = models.TextField(blank=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-generated_at']

    def __str__(self):
        return f'INV-{self.invoice_number} — {self.student.reg_number}: KES {self.amount_due:,.2f}'

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            count = Invoice.objects.count() + 1
            self.invoice_number = f'UON-INV-{timezone.now().year}-{count:05d}'
        self.balance = self.amount_due - self.amount_paid
        self.is_paid = self.balance <= 0
        super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════
# 10. TIMETABLE
# ═══════════════════════════════════════════════════════════════

class Timetable(models.Model):
    """Weekly timetable entry for a unit offering"""
    DAY_CHOICES = [
        ('mon', 'Monday'),
        ('tue', 'Tuesday'),
        ('wed', 'Wednesday'),
        ('thu', 'Thursday'),
        ('fri', 'Friday'),
        ('sat', 'Saturday'),
    ]
    WEEK_TYPE_CHOICES = [
        ('all',  'Every Week'),
        ('odd',  'Odd Weeks'),
        ('even', 'Even Weeks'),
    ]
    SESSION_TYPE_CHOICES = [
        ('lecture',   'Lecture'),
        ('tutorial',  'Tutorial'),
        ('practical', 'Practical / Lab'),
        ('seminar',   'Seminar'),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    unit_offering = models.ForeignKey(UnitOffering, on_delete=models.CASCADE, related_name='timetable_entries')
    day_of_week   = models.CharField(max_length=3, choices=DAY_CHOICES)
    start_time    = models.TimeField()
    end_time      = models.TimeField()
    venue         = models.CharField(max_length=100)
    session_type  = models.CharField(max_length=20, choices=SESSION_TYPE_CHOICES, default='lecture')
    week_type     = models.CharField(max_length=4, choices=WEEK_TYPE_CHOICES, default='all')
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'timetable'
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return (
            f'{self.unit_offering.unit.code} — '
            f'{self.get_day_of_week_display()} {self.start_time}–{self.end_time} @ {self.venue}'
        )