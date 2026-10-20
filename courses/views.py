from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from . import access
from .models import Enrollment, Lesson, LessonCompletion
from .permissions import IsInstructor, IsInstructorOrLearner, IsLearner
from .serializers import (
    CourseDetailSerializer,
    CourseSummarySerializer,
    CourseWriteSerializer,
    LearnerProgressSerializer,
    LessonSerializer,
    MyCourseSerializer,
)


class CourseListView(APIView):
    """GET: catalogue (learners) or own courses (instructors). POST: create (instructors)."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsInstructor()]
        return [IsInstructorOrLearner()]

    def get(self, request):
        courses = access.visible_courses(request.user).select_related("instructor__user")
        search = request.query_params.get("search", "").strip()
        if search:
            courses = courses.filter(Q(title__icontains=search) | Q(description__icontains=search))
        serializer = CourseSummarySerializer(courses, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        serializer = CourseWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save(instructor=request.user.instructor_profile)
        return Response(
            CourseDetailSerializer(course, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CourseDetailView(APIView):
    """GET: anyone allowed to see the course. PATCH/DELETE: its owner only."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsInstructorOrLearner()]
        return [IsInstructor()]

    def get(self, request, course_id):
        course = access.get_visible_course(request.user, course_id)
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    def patch(self, request, course_id):
        course = access.get_owned_course(request.user, course_id)
        serializer = CourseWriteSerializer(course, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CourseDetailSerializer(course, context={"request": request}).data)

    def delete(self, request, course_id):
        # Soft delete: learners keep their records but lose access (decision C3).
        course = access.get_owned_course(request.user, course_id)
        course.soft_delete(reason=str(request.data.get("reason", ""))[:255])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EnrollView(APIView):
    permission_classes = [IsLearner]

    def post(self, request, course_id):
        course = get_object_or_404(access.catalogue_courses(), pk=course_id)
        _, created = Enrollment.objects.get_or_create(learner=request.user.learner_profile, course=course)
        if not created:
            return Response({"detail": "You are already enrolled in this course."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            CourseDetailSerializer(course, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CourseLearnersView(APIView):
    """Instructor dashboard: who enrolled, lessons done, best quiz score (R6)."""

    permission_classes = [IsInstructor]

    def get(self, request, course_id):
        course = access.get_owned_course(request.user, course_id)
        enrollments = (
            Enrollment.objects.filter(course=course)
            .with_progress()
            .select_related("learner__user")
            .order_by("learner__user__first_name", "learner__user__last_name")
        )
        return Response(LearnerProgressSerializer(enrollments, many=True).data)


class MyCoursesView(APIView):
    permission_classes = [IsLearner]

    def get(self, request):
        # Deliberately not filtered by active(): removed courses stay listed (decision C4).
        enrollments = (
            Enrollment.objects.filter(learner__user=request.user)
            .with_progress()
            .select_related("course__instructor__user")
        )
        return Response(MyCourseSerializer(enrollments, many=True).data)


class LessonCreateView(APIView):
    permission_classes = [IsInstructor]

    def post(self, request, course_id):
        course = access.get_owned_course(request.user, course_id)
        serializer = LessonSerializer(data=request.data, context={"course": course})
        serializer.is_valid(raise_exception=True)
        lesson = serializer.save()
        return Response(LessonSerializer(lesson, context={"course": course}).data, status=status.HTTP_201_CREATED)


class LessonDetailView(APIView):
    """GET: owner or enrolled learner. PATCH/DELETE: owner only."""

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsInstructorOrLearner()]
        return [IsInstructor()]

    def _owned_lesson(self, request, lesson_id):
        return get_object_or_404(
            Lesson.objects.filter(course__in=access.owned_courses(request.user)), pk=lesson_id
        )

    def get(self, request, lesson_id):
        if request.user.is_instructor:
            lesson = self._owned_lesson(request, lesson_id)
            context = {"course": lesson.course}
        else:
            lesson, enrollment = access.get_learner_lesson(request.user, lesson_id)
            context = {"course": lesson.course, "enrollment": enrollment}
        return Response(LessonSerializer(lesson, context=context).data)

    def patch(self, request, lesson_id):
        lesson = self._owned_lesson(request, lesson_id)
        serializer = LessonSerializer(lesson, data=request.data, partial=True, context={"course": lesson.course})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, lesson_id):
        self._owned_lesson(request, lesson_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LessonCompleteView(APIView):
    permission_classes = [IsLearner]

    def post(self, request, lesson_id):
        lesson, enrollment = access.get_learner_lesson(request.user, lesson_id)
        # get_or_create: marking a lesson complete twice is harmless.
        LessonCompletion.objects.get_or_create(enrollment=enrollment, lesson=lesson)
        context = {"course": lesson.course, "enrollment": enrollment}
        return Response(LessonSerializer(lesson, context=context).data)
