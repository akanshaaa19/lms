from django.core.validators import MaxValueValidator
from django.db import models

from courses.models import Course, Enrollment


class Quiz(models.Model):
    # One quiz per course (decision Q1).
    course = models.OneToOneField(Course, on_delete=models.CASCADE, related_name="quiz")
    title = models.CharField(max_length=200)
    pass_mark = models.PositiveSmallIntegerField(
        default=70,
        validators=[MaxValueValidator(100)],
        help_text="Percentage needed to pass, from 0 to 100.",
    )

    class Meta:
        verbose_name_plural = "quizzes"

    def __str__(self):
        return self.title


class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ["order"]
        constraints = [
            models.UniqueConstraint(fields=["quiz", "order"], name="unique_question_order_per_quiz"),
        ]

    def __str__(self):
        return f"Q{self.order}. {self.text[:60]}"


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ["id"]
        constraints = [
            # A partial unique constraint: among rows where is_correct is True,
            # each question may appear only once. So the database allows at most
            # one correct choice per question (decision Q2). "At least one" is
            # checked when the instructor saves the question in a form.
            models.UniqueConstraint(
                fields=["question"],
                condition=models.Q(is_correct=True),
                name="one_correct_choice_per_question",
            ),
        ]

    def __str__(self):
        return self.text


class QuizAttempt(models.Model):
    """One submitted attempt. Every attempt is kept (decision Q3)."""

    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="quiz_attempts")
    # PROTECT: a quiz that learners have attempted can't be deleted.
    quiz = models.ForeignKey(Quiz, on_delete=models.PROTECT, related_name="attempts")

    # Stored, not calculated, so a later edit to the quiz never changes
    # a past result (decision Q5).
    score = models.PositiveSmallIntegerField(help_text="Number of correct answers")
    total = models.PositiveSmallIntegerField(help_text="Number of questions")
    percentage = models.PositiveSmallIntegerField()
    passed = models.BooleanField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"{self.enrollment.learner}: {self.percentage}% on {self.quiz}"


class AttemptAnswer(models.Model):
    """The choice a learner picked for one question in one attempt (decision Q4)."""

    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(Choice, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["attempt", "question"], name="unique_answer_per_question"),
        ]

    @property
    def is_correct(self):
        return self.selected_choice.is_correct
