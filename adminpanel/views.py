from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import InstructorProfile, User
from courses.models import Course, Enrollment
from quizzes.models import QuizAttempt


class IsStaff(BasePermission):
    message = "Only administrators can do this."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_staff


class StaffView(APIView):
    permission_classes = [IsStaff]


def user_row(user):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.get_full_name(),
        "role": user.role,
        "is_active": user.is_active,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
        "designation": getattr(getattr(user, "learner_profile", None), "designation", ""),
        "department": getattr(getattr(user, "learner_profile", None), "department", ""),
    }


class OverviewView(StaffView):
    def get(self, request):
        courses = Course.objects.aggregate(
            published=Count("id", filter=Q(status=Course.Status.PUBLISHED, deleted_at__isnull=True)),
            drafts=Count("id", filter=Q(status=Course.Status.DRAFT, deleted_at__isnull=True)),
            removed=Count("id", filter=Q(deleted_at__isnull=False)),
        )
        return Response({
            "users": User.objects.count(),
            "learners": User.objects.filter(learner_profile__isnull=False).count(),
            "instructors": InstructorProfile.objects.filter(is_approved=True).count(),
            "pending_instructors": InstructorProfile.objects.filter(is_approved=False).count(),
            "courses": courses,
            "enrollments": Enrollment.objects.count(),
            "quiz_attempts": QuizAttempt.objects.count(),
        })


class InstructorListView(StaffView):
    def get(self, request):
        profiles = InstructorProfile.objects.select_related("user").annotate(
            course_count=Count("courses", filter=Q(courses__deleted_at__isnull=True))
        ).order_by("is_approved", "user__first_name")
        wanted = request.query_params.get("status")
        if wanted == "pending":
            profiles = profiles.filter(is_approved=False)
        elif wanted == "approved":
            profiles = profiles.filter(is_approved=True)
        return Response([
            {
                "id": p.id,
                "user_id": p.user_id,
                "email": p.user.email,
                "full_name": p.user.get_full_name(),
                "bio": p.bio,
                "is_approved": p.is_approved,
                "approved_at": p.approved_at,
                "requested_at": p.user.date_joined,
                "course_count": p.course_count,
            }
            for p in profiles
        ])


class InstructorApproveView(StaffView):
    def post(self, request, profile_id):
        profile = get_object_or_404(InstructorProfile, pk=profile_id)
        if profile.is_approved:
            return Response({"detail": "This instructor is already approved."}, status=status.HTTP_400_BAD_REQUEST)
        profile.approve()
        return Response({"id": profile.id, "is_approved": True, "approved_at": profile.approved_at})


class InstructorRevokeView(StaffView):
    """Takes instructor access away. Their courses and learners' records are kept."""

    def post(self, request, profile_id):
        profile = get_object_or_404(InstructorProfile, pk=profile_id)
        if not profile.is_approved:
            return Response({"detail": "This instructor isn't approved."}, status=status.HTTP_400_BAD_REQUEST)
        profile.is_approved = False
        profile.approved_at = None
        profile.save(update_fields=["is_approved", "approved_at"])
        return Response({"id": profile.id, "is_approved": False, "approved_at": None})


class UserListView(StaffView):
    def get(self, request):
        users = User.objects.select_related("learner_profile", "instructor_profile").order_by("-date_joined")
        search = request.query_params.get("search", "").strip()
        if search:
            users = users.filter(
                Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search)
            )
        role = request.query_params.get("role")
        if role == "learner":
            users = users.filter(learner_profile__isnull=False)
        elif role == "instructor":
            users = users.filter(instructor_profile__is_approved=True)
        elif role == "pending_instructor":
            users = users.filter(instructor_profile__is_approved=False)
        elif role == "admin":
            users = users.filter(is_staff=True)
        return Response([user_row(user) for user in users])


class CourseListView(StaffView):
    """Every course from every instructor, removed ones included."""

    def get(self, request):
        courses = Course.objects.select_related("instructor__user").annotate(
            lesson_count=Count("lessons", distinct=True),
            enrolled=Count("enrollments", distinct=True),
        ).order_by("-created_at")
        wanted = request.query_params.get("status")
        if wanted == "removed":
            courses = courses.filter(deleted_at__isnull=False)
        elif wanted in (Course.Status.PUBLISHED, Course.Status.DRAFT):
            courses = courses.filter(status=wanted, deleted_at__isnull=True)
        search = request.query_params.get("search", "").strip()
        if search:
            courses = courses.filter(title__icontains=search)
        return Response([
            {
                "id": c.id,
                "title": c.title,
                "status": c.status,
                "instructor_name": c.instructor.user.get_full_name(),
                "instructor_email": c.instructor.user.email,
                "lesson_count": c.lesson_count,
                "enrolled": c.enrolled,
                "created_at": c.created_at,
                "is_deleted": c.is_deleted,
                "deleted_at": c.deleted_at,
                "deletion_reason": c.deletion_reason,
            }
            for c in courses
        ])


class CourseRestoreView(StaffView):
    def post(self, request, course_id):
        course = get_object_or_404(Course, pk=course_id, deleted_at__isnull=False)
        course.deleted_at = None
        course.deletion_reason = ""
        course.save(update_fields=["deleted_at", "deletion_reason"])
        return Response({"id": course.id, "is_deleted": False})
