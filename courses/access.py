"""Who can see which courses and lessons. Every view gets objects through here.

Looking objects up inside an already-filtered queryset means a learner who
guesses the URL of a draft course, or an instructor who guesses another
instructor's course id, gets a 404, exactly as if it didn't exist (R7).
"""

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from .models import Course, Enrollment, Lesson


def owned_courses(user):
    """Live courses the instructor owns, in any status."""
    return Course.objects.active().filter(instructor__user=user)


def catalogue_courses():
    """What learners may see: published and not deleted."""
    return Course.objects.active().published()


def visible_courses(user):
    if user.is_instructor:
        return owned_courses(user)
    return catalogue_courses()


def get_owned_course(user, course_id):
    return get_object_or_404(owned_courses(user), pk=course_id)


def get_visible_course(user, course_id):
    return get_object_or_404(visible_courses(user), pk=course_id)


def get_enrollment(user, course):
    """The learner's enrolment in a course, or None."""
    if not user.is_learner:
        return None
    return Enrollment.objects.filter(learner__user=user, course=course).first()


def get_learner_lesson(user, lesson_id):
    """A lesson the learner may open: enrolled, course published and not deleted."""
    lesson = get_object_or_404(
        Lesson.objects.select_related("course").filter(course__in=catalogue_courses()),
        pk=lesson_id,
    )
    enrollment = get_enrollment(user, lesson.course)
    if enrollment is None:
        raise PermissionDenied("Enrol in this course to open its lessons.")
    return lesson, enrollment
