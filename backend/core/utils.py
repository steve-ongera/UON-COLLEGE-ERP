"""
UON College ERP System — Utility Functions
Grading engine, GPA computation, promotion logic, custom exception handler.
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.utils import timezone
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('core')

# ─────────────────────────────────────────────────────────
# GRADING ENGINE
# ─────────────────────────────────────────────────────────

GRADING_SCALE = getattr(settings, 'GRADING_SCALE', {
    'A':  {'min': 70, 'max': 100, 'points': 4.0, 'label': 'Excellent'},
    'B+': {'min': 65, 'max': 69,  'points': 3.5, 'label': 'Very Good'},
    'B':  {'min': 60, 'max': 64,  'points': 3.0, 'label': 'Good'},
    'C+': {'min': 55, 'max': 59,  'points': 2.5, 'label': 'Above Average'},
    'C':  {'min': 50, 'max': 54,  'points': 2.0, 'label': 'Average'},
    'D+': {'min': 45, 'max': 49,  'points': 1.5, 'label': 'Below Average'},
    'D':  {'min': 40, 'max': 44,  'points': 1.0, 'label': 'Pass'},
    'E':  {'min': 0,  'max': 39,  'points': 0.0, 'label': 'Fail'},
})

PROMOTION_GPA_THRESHOLD     = Decimal(str(getattr(settings, 'PROMOTION_GPA_THRESHOLD', 2.0)))
SUPPLEMENTARY_GPA_THRESHOLD = Decimal(str(getattr(settings, 'SUPPLEMENTARY_GPA_THRESHOLD', 1.5)))


def compute_grade(score: float) -> tuple[str, float]:
    """
    Given a total score (0–100), return (grade, grade_points).
    e.g. compute_grade(72) → ('A', 4.0)
    """
    score = float(score)
    for grade, bounds in GRADING_SCALE.items():
        if bounds['min'] <= score <= bounds['max']:
            return grade, bounds['points']
    return 'E', 0.0


def compute_weighted_score(marks: list[dict]) -> Decimal:
    """
    Compute total weighted score from a list of:
      [{'score': 45, 'max_score': 30, 'weight': 30}, ...]
    Returns value out of 100.
    """
    total = Decimal('0.00')
    for m in marks:
        score      = Decimal(str(m['score']))
        max_score  = Decimal(str(m['max_score']))
        weight     = Decimal(str(m['weight']))
        if max_score > 0:
            total += (score / max_score) * weight
    return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def compute_gpa(unit_results: list[dict]) -> Decimal:
    """
    Compute GPA from list of:
      [{'grade_points': 4.0, 'credit_hours': 3}, ...]
    Returns GPA rounded to 2 decimal places.
    """
    total_points  = Decimal('0.00')
    total_credits = 0

    for result in unit_results:
        points  = Decimal(str(result['grade_points']))
        credits = int(result['credit_hours'])
        total_points  += points * credits
        total_credits += credits

    if total_credits == 0:
        return Decimal('0.00')

    gpa = total_points / Decimal(str(total_credits))
    return gpa.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


# ─────────────────────────────────────────────────────────
# UNIT RESULT COMPUTATION
# ─────────────────────────────────────────────────────────

def compute_unit_result(enrollment_id: str) -> dict:
    """
    Compute and save UnitResult for a given enrollment.
    Aggregates all StudentMark records, applies weights, derives grade.

    Returns: dict with result details or error.
    """
    from .models import Enrollment, StudentMark, UnitResult, UnitAssessment

    try:
        enrollment = Enrollment.objects.select_related(
            'unit_offering__unit', 'student'
        ).get(id=enrollment_id)
    except Enrollment.DoesNotExist:
        return {'error': f'Enrollment {enrollment_id} not found'}

    # Gather all marks for this enrollment
    marks = StudentMark.objects.filter(
        enrollment=enrollment
    ).select_related('unit_assessment__assessment_type')

    if not marks.exists():
        return {'error': 'No marks found for this enrollment'}

    # Separate CAT marks and exam marks
    cat_marks  = []
    exam_marks = []

    for mark in marks:
        atype = mark.unit_assessment.assessment_type
        entry = {
            'score':     float(mark.score) if not mark.is_absent else 0,
            'max_score': float(atype.max_score),
            'weight':    float(atype.weight_percentage),
        }
        if atype.name == 'exam':
            exam_marks.append(entry)
        else:
            cat_marks.append(entry)

    cat_total  = compute_weighted_score(cat_marks)  if cat_marks  else Decimal('0.00')
    exam_score = compute_weighted_score(exam_marks) if exam_marks else Decimal('0.00')
    total      = cat_total + exam_score

    grade, grade_points = compute_grade(float(total))
    result_status = 'pass' if grade != 'E' else 'fail'

    unit_result, _ = UnitResult.objects.update_or_create(
        enrollment=enrollment,
        defaults={
            'cat_total':    cat_total,
            'exam_score':   exam_score,
            'total_score':  total,
            'grade':        grade,
            'grade_points': Decimal(str(grade_points)),
            'status':       result_status,
        }
    )
    logger.info(
        f'Computed UnitResult for {enrollment.student.reg_number} — '
        f'{enrollment.unit_offering.unit.code}: {grade} ({total})'
    )
    return {
        'enrollment_id': str(enrollment_id),
        'grade':         grade,
        'total_score':   float(total),
        'status':        result_status,
    }


# ─────────────────────────────────────────────────────────
# SEMESTER RESULT COMPUTATION
# ─────────────────────────────────────────────────────────

def compute_semester_result(student_id: str, semester_id: str) -> dict:
    """
    Compute and save SemesterResult for a student in a semester.
    Aggregates all approved UnitResults, computes GPA, determines status.
    """
    from .models import (
        StudentProfile, Semester, UnitResult, SemesterResult, Enrollment
    )

    try:
        student  = StudentProfile.objects.get(id=student_id)
        semester = Semester.objects.get(id=semester_id)
    except (StudentProfile.DoesNotExist, Semester.DoesNotExist) as e:
        return {'error': str(e)}

    # Get all approved unit results this semester
    unit_results = UnitResult.objects.filter(
        enrollment__student=student,
        enrollment__unit_offering__semester=semester,
        is_approved=True,
    ).select_related('enrollment__unit_offering__unit')

    if not unit_results.exists():
        return {'error': 'No approved unit results found for this student/semester'}

    gpa_inputs      = []
    credits_attempted = 0
    credits_earned  = 0
    units_passed    = 0
    units_failed    = 0

    for ur in unit_results:
        credits = ur.enrollment.unit_offering.unit.credit_hours
        credits_attempted += credits
        gpa_inputs.append({
            'grade_points': float(ur.grade_points),
            'credit_hours': credits,
        })
        if ur.status == 'pass':
            credits_earned += credits
            units_passed   += 1
        else:
            units_failed += 1

    gpa = compute_gpa(gpa_inputs)

    # Determine semester status
    if gpa >= PROMOTION_GPA_THRESHOLD:
        sem_status = 'pass'
    elif gpa >= SUPPLEMENTARY_GPA_THRESHOLD:
        sem_status = 'supplementary'
    else:
        sem_status = 'fail'

    # Compute cumulative GPA across all semesters
    all_results = UnitResult.objects.filter(
        enrollment__student=student,
        is_approved=True,
    ).select_related('enrollment__unit_offering__unit')

    all_gpa_inputs = [{
        'grade_points': float(r.grade_points),
        'credit_hours': r.enrollment.unit_offering.unit.credit_hours,
    } for r in all_results]

    cumulative_gpa = compute_gpa(all_gpa_inputs)

    sem_result, _ = SemesterResult.objects.update_or_create(
        student=student,
        semester=semester,
        defaults={
            'gpa':               gpa,
            'cumulative_gpa':    cumulative_gpa,
            'credits_attempted': credits_attempted,
            'credits_earned':    credits_earned,
            'units_passed':      units_passed,
            'units_failed':      units_failed,
            'status':            sem_status,
        }
    )

    # Update student's cumulative GPA
    student.cumulative_gpa = cumulative_gpa
    student.save(update_fields=['cumulative_gpa'])

    logger.info(
        f'Computed SemesterResult: {student.reg_number} — '
        f'{semester.name}: GPA {gpa}, Status: {sem_status}'
    )
    return {
        'student':       student.reg_number,
        'semester':      semester.name,
        'gpa':           float(gpa),
        'cumulative_gpa': float(cumulative_gpa),
        'status':        sem_status,
        'units_passed':  units_passed,
        'units_failed':  units_failed,
    }


# ─────────────────────────────────────────────────────────
# PROMOTION ENGINE
# ─────────────────────────────────────────────────────────

def promote_student(student_id: str, to_semester_id: str, promoted_by_id: str,
                    promotion_type: str = None, remarks: str = '') -> dict:
    """
    Promote a student to the next semester.
    - Determines promotion type based on GPA if not supplied.
    - Updates StudentProfile.current_semester_number and current_year_of_study.
    - Records AcademicPromotion.
    - Handles graduation when final semester is completed.
    """
    from .models import (
        StudentProfile, Semester, SemesterResult, AcademicPromotion, User
    )

    try:
        student    = StudentProfile.objects.select_related('programme').get(id=student_id)
        to_sem     = Semester.objects.get(id=to_semester_id)
        promoted_by = User.objects.get(id=promoted_by_id)
    except Exception as e:
        return {'error': str(e), 'promoted': False}

    if student.status not in ('active',):
        return {'error': f'Student {student.reg_number} is {student.status}, cannot promote.', 'promoted': False}

    # Get current semester result
    try:
        sem_result = SemesterResult.objects.get(
            student=student,
            semester__semester_number=student.current_semester_number,
        )
        gpa = sem_result.gpa
    except SemesterResult.DoesNotExist:
        gpa = Decimal('0.00')

    # Determine promotion type automatically
    if not promotion_type:
        if gpa >= PROMOTION_GPA_THRESHOLD:
            promotion_type = 'normal'
        elif gpa >= SUPPLEMENTARY_GPA_THRESHOLD:
            promotion_type = 'supplementary'
        else:
            promotion_type = 'repeat'

    prog = student.programme
    from_year       = student.current_year_of_study
    from_sem_number = student.current_semester_number

    # Calculate next position
    if promotion_type == 'repeat':
        to_year       = from_year
        to_sem_number = from_sem_number
    elif from_sem_number >= prog.semesters_per_year:
        # Move to next year, semester 1
        to_year       = from_year + 1
        to_sem_number = 1
    else:
        to_year       = from_year
        to_sem_number = from_sem_number + 1

    # Check for graduation
    if from_year >= prog.duration_years and from_sem_number >= prog.semesters_per_year:
        if gpa >= PROMOTION_GPA_THRESHOLD:
            promotion_type = 'graduate'
            student.status = 'graduated'
            student.graduation_date = timezone.now().date()

    # Record promotion
    AcademicPromotion.objects.create(
        student           = student,
        from_semester     = None,
        to_semester       = to_sem,
        from_year         = from_year,
        to_year           = to_year,
        from_sem_number   = from_sem_number,
        to_sem_number     = to_sem_number,
        promotion_type    = promotion_type,
        promoted_by       = promoted_by,
        gpa_at_promotion  = gpa,
        remarks           = remarks,
    )

    # Update student profile
    if promotion_type != 'graduate':
        student.current_year_of_study   = to_year
        student.current_semester_number = to_sem_number
    student.save()

    logger.info(
        f'Promoted: {student.reg_number} — '
        f'Yr{from_year}S{from_sem_number} → Yr{to_year}S{to_sem_number} '
        f'({promotion_type}), GPA: {gpa}'
    )
    return {
        'promoted':        True,
        'student':         student.reg_number,
        'from':            f'Year {from_year} Semester {from_sem_number}',
        'to':              f'Year {to_year} Semester {to_sem_number}',
        'promotion_type':  promotion_type,
        'gpa':             float(gpa),
    }


def bulk_promote_cohort(intake_id: str, from_semester_id: str, to_semester_id: str,
                         promoted_by_id: str) -> dict:
    """
    Promote all eligible active students in an intake.
    Returns summary of promotions, supplementaries, repeats.
    """
    from .models import StudentProfile

    students = StudentProfile.objects.filter(
        intake_id=intake_id, status='active'
    )

    results = {
        'total':         students.count(),
        'promoted':      0,
        'supplementary': 0,
        'repeat':        0,
        'graduated':     0,
        'errors':        [],
    }

    for student in students:
        result = promote_student(
            student_id=str(student.id),
            to_semester_id=to_semester_id,
            promoted_by_id=promoted_by_id,
        )
        if result.get('error'):
            results['errors'].append(result['error'])
        else:
            ptype = result.get('promotion_type', 'normal')
            if ptype == 'normal':
                results['promoted'] += 1
            elif ptype == 'supplementary':
                results['supplementary'] += 1
            elif ptype == 'repeat':
                results['repeat'] += 1
            elif ptype == 'graduate':
                results['graduated'] += 1

    logger.info(f'Bulk promotion complete: {results}')
    return results


# ─────────────────────────────────────────────────────────
# REGISTRATION NUMBER GENERATOR (standalone helper)
# ─────────────────────────────────────────────────────────

def generate_reg_number(programme, intake) -> str:
    """Generate a unique student registration number."""
    from .models import StudentProfile
    year      = intake.start_date.year
    month     = intake.intake_month[:3].upper()
    prog_code = programme.code
    count     = StudentProfile.objects.filter(
        intake=intake, programme=programme
    ).count() + 1
    return f'UON/{year}/{month}/{prog_code}/{count:04d}'


def generate_staff_number(department) -> str:
    """Generate a unique staff number."""
    from .models import LecturerProfile
    dept_code = department.code
    count     = LecturerProfile.objects.filter(department=department).count() + 1
    return f'UON/STAFF/{dept_code}/{count:04d}'


# ─────────────────────────────────────────────────────────
# CUSTOM DRF EXCEPTION HANDLER
# ─────────────────────────────────────────────────────────

def custom_exception_handler(exc, context):
    """
    Normalises all DRF errors into:
    {
        "success": false,
        "message": "Human-readable message",
        "errors": { field: [messages] } | null
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        errors  = response.data
        message = 'An error occurred.'

        if isinstance(errors, dict):
            # Try to extract a top-level message
            if 'detail' in errors:
                message = str(errors['detail'])
                errors  = None
            elif 'non_field_errors' in errors:
                message = str(errors['non_field_errors'][0])
            else:
                message = 'Validation failed. Please check the errors below.'
        elif isinstance(errors, list):
            message = str(errors[0]) if errors else 'An error occurred.'
            errors  = None

        response.data = {
            'success': False,
            'message': message,
            'errors':  errors if isinstance(errors, dict) else None,
        }

    return response