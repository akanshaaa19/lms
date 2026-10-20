from rest_framework import serializers

from .access import get_enrollment
from .models import Course, Enrollment, Lesson, LessonCompletion


def enrollment_progress(enrollment):
    """Progress and quiz fields for an enrolment loaded with .with_progress()."""
    return {
        "enrolled_at": enrollment.enrolled_at,
        "completed_count": enrollment.completed_count,
        "total_lessons": enrollment.total_lessons,
        "progress_percent": enrollment.progress_percent,
        "best_percentage": enrollment.best_percentage,
        "passed": enrollment.has_passed,
    }


class CourseSummarySerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source="instructor.user.get_full_name", read_only=True)
    lesson_count = serializers.SerializerMethodField()
    has_quiz = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "title", "description", "status", "instructor_name",
            "lesson_count", "has_quiz", "is_enrolled", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_lesson_count(self, course):
        return course.lessons.count()

    def get_has_quiz(self, course):
        return hasattr(course, "quiz")

    def get_is_enrolled(self, course):
        user = self.context["request"].user
        return get_enrollment(user, course) is not None


class CourseDetailSerializer(CourseSummarySerializer):
    lessons = serializers.SerializerMethodField()
    quiz = serializers.SerializerMethodField()
    enrollment = serializers.SerializerMethodField()

    class Meta(CourseSummarySerializer.Meta):
        fields = CourseSummarySerializer.Meta.fields + ["lessons", "quiz", "enrollment"]

    def _enrollment(self, course):
        # Cached so the three fields below share one lookup.
        if not hasattr(self, "_cached_enrollment"):
            enrollment = get_enrollment(self.context["request"].user, course)
            if enrollment is not None:
                enrollment = Enrollment.objects.with_progress().get(pk=enrollment.pk)
            self._cached_enrollment = enrollment
        return self._cached_enrollment

    def get_lessons(self, course):
        enrollment = self._enrollment(course)
        completed = set(enrollment.completions.values_list("lesson_id", flat=True)) if enrollment else set()
        return [
            {"id": lesson.id, "title": lesson.title, "order": lesson.order, "is_completed": lesson.id in completed}
            for lesson in course.lessons.all()
        ]

    def get_quiz(self, course):
        if not hasattr(course, "quiz"):
            return None
        quiz = course.quiz
        return {"id": quiz.id, "title": quiz.title, "pass_mark": quiz.pass_mark, "question_count": quiz.questions.count()}

    def get_enrollment(self, course):
        enrollment = self._enrollment(course)
        return enrollment_progress(enrollment) if enrollment else None


class CourseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["title", "description", "status"]


class MyCourseSerializer(serializers.ModelSerializer):
    """One row of a learner's "My courses", including removed courses (decision C4)."""

    course = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ["course"]

    def get_course(self, enrollment):
        course = enrollment.course
        return {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "instructor_name": course.instructor.user.get_full_name(),
            "is_deleted": course.is_deleted,
            "deleted_at": course.deleted_at,
            "deletion_reason": course.deletion_reason,
        }

    def to_representation(self, enrollment):
        data = super().to_representation(enrollment)
        data.update(enrollment_progress(enrollment))
        return data


class LearnerProgressSerializer(serializers.ModelSerializer):
    """One row of the instructor dashboard (R6)."""

    class Meta:
        model = Enrollment
        fields = []

    def to_representation(self, enrollment):
        learner = enrollment.learner
        data = {
            "learner_id": learner.id,
            "full_name": learner.user.get_full_name(),
            "email": learner.user.email,
            "designation": learner.designation,
            "department": learner.department,
            "attempt_count": enrollment.attempt_count,
        }
        data.update(enrollment_progress(enrollment))
        return data


class LessonSerializer(serializers.ModelSerializer):
    course_id = serializers.IntegerField(read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    order = serializers.IntegerField(min_value=1, required=False)
    is_completed = serializers.SerializerMethodField()
    previous_lesson_id = serializers.SerializerMethodField()
    next_lesson_id = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            "id", "course_id", "course_title", "title", "content", "video_url", "order",
            "is_completed", "previous_lesson_id", "next_lesson_id",
        ]

    def validate_order(self, order):
        # A friendly message instead of a database error (decision C2).
        course = self.context["course"]
        clash = course.lessons.filter(order=order)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError(f"Another lesson is already in position {order}.")
        return order

    def create(self, validated_data):
        course = self.context["course"]
        if "order" not in validated_data:
            last = course.lessons.order_by("-order").first()
            validated_data["order"] = (last.order + 1) if last else 1
        return Lesson.objects.create(course=course, **validated_data)

    def get_is_completed(self, lesson):
        enrollment = self.context.get("enrollment")
        return bool(enrollment) and LessonCompletion.objects.filter(enrollment=enrollment, lesson=lesson).exists()

    def get_previous_lesson_id(self, lesson):
        previous = lesson.course.lessons.filter(order__lt=lesson.order).order_by("-order").first()
        return previous.id if previous else None

    def get_next_lesson_id(self, lesson):
        following = lesson.course.lessons.filter(order__gt=lesson.order).order_by("order").first()
        return following.id if following else None
