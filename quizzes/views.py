from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from courses import access
from courses.permissions import IsInstructor, IsLearner

from .grading import grade_quiz
from .models import Quiz
from .serializers import (
    AttemptResultSerializer,
    AttemptSummarySerializer,
    QuizEditSerializer,
    QuizTakeSerializer,
    SubmitAttemptSerializer,
)


class CourseQuizView(APIView):
    """The instructor's quiz builder for one of their courses."""

    permission_classes = [IsInstructor]

    def get(self, request, course_id):
        course = access.get_owned_course(request.user, course_id)
        quiz = get_object_or_404(Quiz, course=course)
        return Response(QuizEditSerializer(quiz).data)

    def put(self, request, course_id):
        course = access.get_owned_course(request.user, course_id)
        serializer = QuizEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quiz = serializer.save_for_course(course)
        return Response(QuizEditSerializer(quiz).data)

    def delete(self, request, course_id):
        course = access.get_owned_course(request.user, course_id)
        quiz = get_object_or_404(Quiz, course=course)
        try:
            quiz.delete()
        except ProtectedError:
            return Response(
                {"detail": "Learners have already taken this quiz, so it can't be deleted. You can still edit its questions."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


def get_learner_quiz(user, quiz_id):
    """A quiz the learner may take: course published, not deleted, and enrolled (R7)."""
    quiz = get_object_or_404(
        Quiz.objects.select_related("course").filter(course__in=access.catalogue_courses()), pk=quiz_id
    )
    enrollment = access.get_enrollment(user, quiz.course)
    if enrollment is None:
        raise PermissionDenied("Enrol in this course before taking its quiz.")
    return quiz, enrollment


class QuizTakeView(APIView):
    permission_classes = [IsLearner]

    def get(self, request, quiz_id):
        quiz, _ = get_learner_quiz(request.user, quiz_id)
        return Response(QuizTakeSerializer(quiz).data)


class QuizAttemptsView(APIView):
    """GET: the learner's own past attempts. POST: submit a new attempt."""

    permission_classes = [IsLearner]

    def get(self, request, quiz_id):
        quiz, enrollment = get_learner_quiz(request.user, quiz_id)
        attempts = enrollment.quiz_attempts.filter(quiz=quiz)
        return Response(AttemptSummarySerializer(attempts, many=True).data)

    def post(self, request, quiz_id):
        quiz, enrollment = get_learner_quiz(request.user, quiz_id)
        serializer = SubmitAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            attempt = grade_quiz(quiz, enrollment, serializer.validated_data["answers"])
        except ValueError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(AttemptResultSerializer(attempt).data, status=status.HTTP_201_CREATED)
