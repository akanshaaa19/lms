"""Role checks for the API (R7). They run on the server for every request.

Ownership ("instructors can only edit their own courses") is not a
permission class: each view only ever looks up courses from the user's own
queryset (see access.py), so someone else's course is simply "not found".
"""

from rest_framework.permissions import BasePermission


class IsInstructor(BasePermission):
    message = "Only approved instructors can do this."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_instructor


class IsLearner(BasePermission):
    message = "Only learners can do this."

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_learner


class IsInstructorOrLearner(BasePermission):
    message = "Your account doesn't have access to courses yet."

    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (user.is_instructor or user.is_learner)
