"""Small helpers for building test data, shared by every app's tests."""

from accounts.models import InstructorProfile, LearnerProfile, User
from courses.models import Course, Enrollment, Lesson
from quizzes.models import Choice, Question, Quiz

PASSWORD = "Test-pass-2026"


def make_instructor(email="teacher@example.com", approved=True):
    user = User.objects.create_user(email, PASSWORD, first_name="Tara", last_name="Teacher")
    profile = InstructorProfile.objects.create(user=user)
    if approved:
        profile.approve()
    return user


def make_learner(email="learner@example.com"):
    user = User.objects.create_user(email, PASSWORD, first_name="Lena", last_name="Learner")
    LearnerProfile.objects.create(user=user)
    return user


def make_course(instructor_user, status=Course.Status.PUBLISHED, lessons=2, title="Course"):
    course = Course.objects.create(
        instructor=instructor_user.instructor_profile, title=title, description="About it", status=status
    )
    for position in range(1, lessons + 1):
        Lesson.objects.create(course=course, title=f"Lesson {position}", content="Text", order=position)
    return course


def make_quiz(course, pass_mark=70, questions=4):
    """A quiz whose correct answer is always the first choice."""
    quiz = Quiz.objects.create(course=course, title="Quiz", pass_mark=pass_mark)
    for position in range(1, questions + 1):
        question = Question.objects.create(quiz=quiz, text=f"Question {position}", order=position)
        Choice.objects.create(question=question, text="Right", is_correct=True)
        Choice.objects.create(question=question, text="Wrong", is_correct=False)
    return quiz


def enroll(learner_user, course):
    return Enrollment.objects.create(learner=learner_user.learner_profile, course=course)


def answers(quiz, correct):
    """Answer the first `correct` questions right and the rest wrong."""
    picked = {}
    for index, question in enumerate(quiz.questions.prefetch_related("choices")):
        right, wrong = (question.choices.get(is_correct=True), question.choices.get(is_correct=False))
        picked[question.id] = (right if index < correct else wrong).id
    return picked
