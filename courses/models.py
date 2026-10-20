from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Count, Exists, Max, OuterRef
from django.utils import timezone

from accounts.models import InstructorProfile, LearnerProfile


class CourseQuerySet(models.QuerySet):
    """Reusable filters, called explicitly in views (decision C6).

    Example: Course.objects.active().published()
    """

    def active(self):
        """Courses that have not been soft-deleted."""
        return self.filter(deleted_at__isnull=True)

    def published(self):
        return self.filter(status=Course.Status.PUBLISHED)


class Course(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    # PROTECT: an instructor who still owns courses can't be deleted,
    # so learners' training records are never lost by accident.
    instructor = models.ForeignKey(
        InstructorProfile, on_delete=models.PROTECT, related_name="courses"
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Soft delete (decision C3): set instead of removing the row.
    deleted_at = models.DateTimeField(null=True, blank=True)
    deletion_reason = models.CharField(max_length=255, blank=True)

    objects = CourseQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def is_published(self):
        return self.status == self.Status.PUBLISHED

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def soft_delete(self, reason=""):
        self.deleted_at = timezone.now()
        self.deletion_reason = reason
        self.save(update_fields=["deleted_at", "deletion_reason"])


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    content = models.TextField()
    video_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(help_text="Position in the course: 1, 2, 3…")

    class Meta:
        ordering = ["order"]
        constraints = [
            # Two lessons in the same course can't share a position (decision C2).
            models.UniqueConstraint(fields=["course", "order"], name="unique_lesson_order_per_course"),
        ]

    def __str__(self):
        return f"{self.order}. {self.title}"


class EnrollmentQuerySet(models.QuerySet):
    def with_progress(self):
        """Add progress and quiz results to each enrolment in one query.

        Progress is calculated here, never stored (decision E3).
        """
        from quizzes.models import QuizAttempt  # imported here: quizzes imports this module

        return self.annotate(
            completed_count=Count("completions", distinct=True),
            total_lessons=Count("course__lessons", distinct=True),
            best_percentage=Max("quiz_attempts__percentage"),
            attempt_count=Count("quiz_attempts", distinct=True),
            has_passed=Exists(QuizAttempt.objects.filter(enrollment=OuterRef("pk"), passed=True)),
        )


class Enrollment(models.Model):
    learner = models.ForeignKey(LearnerProfile, on_delete=models.CASCADE, related_name="enrollments")
    # PROTECT: courses are soft-deleted; a hard delete must not wipe records.
    course = models.ForeignKey(Course, on_delete=models.PROTECT, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)

    objects = EnrollmentQuerySet.as_manager()

    class Meta:
        ordering = ["-enrolled_at"]
        constraints = [
            models.UniqueConstraint(fields=["learner", "course"], name="unique_enrollment"),
        ]

    def __str__(self):
        return f"{self.learner} → {self.course}"

    @property
    def progress_percent(self):
        """Needs an enrolment loaded with .with_progress()."""
        if not self.total_lessons:
            return 0
        return round(self.completed_count * 100 / self.total_lessons)


class LessonCompletion(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="completions")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["enrollment", "lesson"], name="unique_lesson_completion"),
        ]

    def __str__(self):
        return f"{self.enrollment.learner} completed {self.lesson}"

    def clean(self):
        # The lesson must belong to the course the learner is enrolled in (decision E2).
        if self.lesson.course_id != self.enrollment.course_id:
            raise ValidationError("This lesson is not part of the enrolled course.")
