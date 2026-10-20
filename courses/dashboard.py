"""Data for the home dashboards: what to do next, and the numbers that matter.

There are no due dates in the data model, so "upcoming" means the next
step: the next unfinished lesson, a quiz that's ready, or (for
instructors) a course that needs attention.
"""

from django.db.models import Avg, Count, Max, Q

from quizzes.models import QuizAttempt

from .access import catalogue_courses, owned_courses
from .models import Course, Enrollment, LessonCompletion


def _next_step(enrollment):
    """The next lesson to read, or the quiz once every lesson is done."""
    course = enrollment.course
    done = set(enrollment.completions.values_list("lesson_id", flat=True))
    next_lesson = next((lesson for lesson in course.lessons.all() if lesson.id not in done), None)
    quiz = getattr(course, "quiz", None)
    return {
        "next_lesson": {"id": next_lesson.id, "title": next_lesson.title, "order": next_lesson.order} if next_lesson else None,
        "quiz": {
            "id": quiz.id,
            "title": quiz.title,
            "best_percentage": enrollment.best_percentage,
            "passed": enrollment.has_passed,
        } if quiz else None,
    }


def learner_dashboard(user):
    enrollments = list(
        Enrollment.objects.filter(learner__user=user)
        .with_progress()
        .select_related("course__instructor__user", "course__quiz")
        .prefetch_related("course__lessons")
    )
    # Only courses the learner can still open; removed or unpublished ones are left out.
    live_ids = set(
        catalogue_courses().filter(id__in=[e.course_id for e in enrollments]).values_list("id", flat=True)
    )

    in_progress = []
    for enrollment in enrollments:
        if enrollment.course_id not in live_ids:
            continue
        last_completion = enrollment.completions.aggregate(at=Max("completed_at"))["at"]
        last_attempt = enrollment.quiz_attempts.aggregate(at=Max("submitted_at"))["at"]
        finished = enrollment.completed_count == enrollment.total_lessons and enrollment.total_lessons > 0
        quiz_done = enrollment.has_passed or not hasattr(enrollment.course, "quiz")
        if finished and quiz_done:
            continue  # nothing left to do in this course
        in_progress.append({
            "course_id": enrollment.course_id,
            "course_title": enrollment.course.title,
            "instructor_name": enrollment.course.instructor.user.get_full_name(),
            "completed_count": enrollment.completed_count,
            "total_lessons": enrollment.total_lessons,
            "progress_percent": enrollment.progress_percent,
            "last_activity": max(d for d in [enrollment.enrolled_at, last_completion, last_attempt] if d),
            **_next_step(enrollment),
        })
    in_progress.sort(key=lambda row: row["last_activity"], reverse=True)

    attempts = (
        QuizAttempt.objects.filter(enrollment__learner__user=user)
        .select_related("quiz__course")
        .order_by("-submitted_at")[:5]
    )
    enrolled_ids = [e.course_id for e in enrollments]
    suggestions = (
        catalogue_courses()
        .exclude(id__in=enrolled_ids)
        .select_related("instructor__user")
        .annotate(lesson_count=Count("lessons"))
        .order_by("-created_at")[:3]
    )

    return {
        "role": "learner",
        "stats": {
            "enrolled": len(enrollments),
            "lessons_completed": sum(e.completed_count for e in enrollments),
            "courses_completed": sum(
                1 for e in enrollments if e.total_lessons and e.completed_count == e.total_lessons
            ),
            "quizzes_passed": sum(1 for e in enrollments if e.has_passed),
        },
        "in_progress": in_progress,
        "recent_attempts": [
            {
                "quiz_id": a.quiz_id,
                "course_id": a.quiz.course_id,
                "course_title": a.quiz.course.title,
                "percentage": a.percentage,
                "passed": a.passed,
                "submitted_at": a.submitted_at,
            }
            for a in attempts
        ],
        "suggested_courses": [
            {
                "id": c.id,
                "title": c.title,
                "description": c.description,
                "instructor_name": c.instructor.user.get_full_name(),
                "lesson_count": c.lesson_count,
            }
            for c in suggestions
        ],
    }


def instructor_dashboard(user):
    courses = list(
        owned_courses(user)
        .annotate(lesson_count=Count("lessons", distinct=True), enrolled=Count("enrollments", distinct=True))
        .select_related("quiz")
        .order_by("-updated_at")
    )
    course_ids = [c.id for c in courses]
    enrollments = Enrollment.objects.filter(course_id__in=course_ids).with_progress()

    by_course = {c.id: [] for c in courses}
    for enrollment in enrollments:
        by_course[enrollment.course_id].append(enrollment)

    def average(values):
        values = list(values)
        return round(sum(values) / len(values)) if values else None

    attempts = QuizAttempt.objects.filter(quiz__course_id__in=course_ids)
    attempt_stats = attempts.aggregate(total=Count("id"), passed=Count("id", filter=Q(passed=True)))

    course_rows, attention = [], []
    for course in courses:
        rows = by_course[course.id]
        has_quiz = hasattr(course, "quiz")
        course_rows.append({
            "id": course.id,
            "title": course.title,
            "status": course.status,
            "lesson_count": course.lesson_count,
            "has_quiz": has_quiz,
            "enrolled": course.enrolled,
            "average_progress": average(e.progress_percent for e in rows),
            "passed_count": sum(1 for e in rows if e.has_passed),
        })
        # Things the instructor should fix, most important first per course.
        if course.lesson_count == 0:
            attention.append({"course_id": course.id, "course_title": course.title, "tab": "lessons",
                              "message": "Has no lessons yet."})
        elif not has_quiz:
            attention.append({"course_id": course.id, "course_title": course.title, "tab": "quiz",
                              "message": "Has no quiz yet."})
        if course.status == Course.Status.DRAFT and course.lesson_count > 0:
            attention.append({"course_id": course.id, "course_title": course.title, "tab": "overview",
                              "message": "Is still a draft, so learners can't see it."})

    # Recent activity across the instructor's courses, newest first.
    recent_enrollments = (
        Enrollment.objects.filter(course_id__in=course_ids)
        .select_related("learner__user", "course").order_by("-enrolled_at")[:8]
    )
    recent_attempts = attempts.select_related("enrollment__learner__user", "quiz__course").order_by("-submitted_at")[:8]
    recent_completions = (
        LessonCompletion.objects.filter(lesson__course_id__in=course_ids)
        .select_related("enrollment__learner__user", "lesson__course").order_by("-completed_at")[:8]
    )
    activity = (
        [{"type": "enrolled", "learner_name": e.learner.user.get_full_name(), "course_id": e.course_id,
          "course_title": e.course.title, "at": e.enrolled_at} for e in recent_enrollments]
        + [{"type": "quiz_attempt", "learner_name": a.enrollment.learner.user.get_full_name(),
            "course_id": a.quiz.course_id, "course_title": a.quiz.course.title, "at": a.submitted_at,
            "percentage": a.percentage, "passed": a.passed} for a in recent_attempts]
        + [{"type": "lesson_completed", "learner_name": c.enrollment.learner.user.get_full_name(),
            "course_id": c.lesson.course_id, "course_title": c.lesson.course.title, "at": c.completed_at,
            "lesson_title": c.lesson.title} for c in recent_completions]
    )
    activity.sort(key=lambda item: item["at"], reverse=True)

    return {
        "role": "instructor",
        "stats": {
            "published": sum(1 for c in courses if c.status == Course.Status.PUBLISHED),
            "drafts": sum(1 for c in courses if c.status == Course.Status.DRAFT),
            "learners": Enrollment.objects.filter(course_id__in=course_ids).values("learner").distinct().count(),
            "enrollments": len(enrollments),
            "learners_passed": sum(1 for e in enrollments if e.has_passed),
            "average_progress": average(e.progress_percent for e in enrollments),
            "quiz_attempts": attempt_stats["total"],
            "pass_rate": round(attempt_stats["passed"] * 100 / attempt_stats["total"]) if attempt_stats["total"] else None,
        },
        "courses": course_rows,
        "attention": attention,
        "recent_activity": activity[:8],
    }
