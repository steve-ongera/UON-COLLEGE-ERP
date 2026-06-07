"""
UON College ERP System — Custom Permission Classes
Role-based access control for all API endpoints.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Only system administrators."""
    message = 'Access restricted to system administrators.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsAdminOrReadOnly(BasePermission):
    """Admins can write; authenticated users can read."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == 'admin'


class IsStudent(BasePermission):
    message = 'Access restricted to students.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'student')


class IsLecturer(BasePermission):
    message = 'Access restricted to lecturers.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'lecturer')


class IsCOD(BasePermission):
    message = 'Access restricted to Chairs of Department.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'cod')


class IsDean(BasePermission):
    message = 'Access restricted to Faculty Deans.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'dean')


class IsFinance(BasePermission):
    message = 'Access restricted to Finance Officers.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'finance')


class IsAdminOrCOD(BasePermission):
    """Admin or Chair of Department."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'cod')
        )


class IsAdminOrDean(BasePermission):
    """Admin or Dean."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'dean')
        )


class IsAdminOrFinance(BasePermission):
    """Admin or Finance Officer."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'finance')
        )


class IsLecturerOrCOD(BasePermission):
    """Lecturer or COD."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('lecturer', 'cod', 'admin')
        )


class IsAcademicStaff(BasePermission):
    """Any academic staff: lecturer, COD, dean, admin."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('admin', 'lecturer', 'cod', 'dean')
        )


class IsStudentOwner(BasePermission):
    """
    Students can only access their own data.
    Staff have full access.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in ('admin', 'cod', 'dean', 'finance', 'lecturer'):
            return True
        if user.role == 'student':
            # obj could be StudentProfile or have a .student attribute
            if hasattr(obj, 'student'):
                return obj.student.user == user
            if hasattr(obj, 'user'):
                return obj.user == user
            if hasattr(obj, 'enrollment'):
                return obj.enrollment.student.user == user
        return False


class IsLecturerOwner(BasePermission):
    """
    Lecturers can only modify marks for their own unit offerings.
    COD and admin can access all.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.role in ('admin', 'cod', 'dean'):
            return True
        if user.role == 'lecturer':
            if hasattr(obj, 'unit_assessment'):
                return obj.unit_assessment.unit_offering.lecturer == user
            if hasattr(obj, 'unit_offering'):
                return obj.unit_offering.lecturer == user
        return False