from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient

from courses.testing import answers, enroll, make_course, make_instructor, make_learner, make_quiz
from quizzes.grading import grade_quiz
from quizzes.models import Choice, QuizAttempt


class GradingTests(TestCase):
    """Quiz marking (R5)."""

    def setUp(self):
        self.course = make_course(make_instructor())
        self.quiz = make_quiz(self.course, pass_mark=70, questions=4)
        self.enrollment = enroll(make_learner(), self.course)

    def test_all_correct_passes(self):
        attempt = grade_quiz(self.quiz, self.enrollment, answers(self.quiz, correct=4))
        self.assertEqual((attempt.score, attempt.total, attempt.percentage), (4, 4, 100))
        self.assertTrue(attempt.passed)

    def test_below_pass_mark_fails(self):
        attempt = grade_quiz(self.quiz, self.enrollment, answers(self.quiz, correct=2))
        self.assertEqual(attempt.percentage, 50)
        self.assertFalse(attempt.passed)

    def test_exactly_the_pass_mark_passes(self):
        self.quiz.pass_mark = 75
        attempt = grade_quiz(self.quiz, self.enrollment, answers(self.quiz, correct=3))
        self.assertEqual(attempt.percentage, 75)
        self.assertTrue(attempt.passed)

    def test_unanswered_question_counts_as_wrong(self):
        picked = answers(self.quiz, correct=4)
        picked.pop(next(iter(picked)))
        attempt = grade_quiz(self.quiz, self.enrollment, picked)
        self.assertEqual(attempt.score, 3)

    def test_choice_from_another_question_is_rejected(self):
        first, second = self.quiz.questions.all()[:2]
        right_answer_to_second = second.choices.get(is_correct=True).id
        with self.assertRaises(ValueError):
            grade_quiz(self.quiz, self.enrollment, {first.id: right_answer_to_second})
        self.assertEqual(QuizAttempt.objects.count(), 0)

    def test_every_attempt_is_saved_with_its_answers(self):
        grade_quiz(self.quiz, self.enrollment, answers(self.quiz, correct=1))
        grade_quiz(self.quiz, self.enrollment, answers(self.quiz, correct=4))
        self.assertEqual(self.enrollment.quiz_attempts.count(), 2)
        self.assertEqual(self.enrollment.quiz_attempts.first().answers.count(), 4)

    def test_database_allows_only_one_correct_choice_per_question(self):
        question = self.quiz.questions.first()
        with self.assertRaises(IntegrityError):
            Choice.objects.create(question=question, text="Also right?", is_correct=True)


class QuizApiTests(TestCase):
    def setUp(self):
        self.course = make_course(make_instructor())
        self.quiz = make_quiz(self.course)
        self.learner = make_learner()
        self.client = APIClient()
        self.client.force_authenticate(self.learner)

    def test_learner_must_be_enrolled_to_take_quiz(self):
        """R7: learners can only take quizzes for courses they are enrolled in."""
        self.assertEqual(self.client.get(f"/api/quizzes/{self.quiz.id}/").status_code, 403)
        response = self.client.post(
            f"/api/quizzes/{self.quiz.id}/attempts/", {"answers": answers(self.quiz, 4)}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(QuizAttempt.objects.count(), 0)

    def test_quiz_for_learner_never_reveals_correct_answers(self):
        enroll(self.learner, self.course)
        response = self.client.get(f"/api/quizzes/{self.quiz.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("is_correct", str(response.json()))

    def test_enrolled_learner_submits_and_sees_result(self):
        enroll(self.learner, self.course)
        response = self.client.post(
            f"/api/quizzes/{self.quiz.id}/attempts/", {"answers": answers(self.quiz, 3)}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["percentage"], 75)
        self.assertTrue(response.json()["passed"])

    def test_quiz_builder_requires_exactly_one_correct_choice(self):
        client = APIClient()
        client.force_authenticate(self.course.instructor.user)
        bad = {"title": "Q", "pass_mark": 70, "questions": [
            {"text": "Pick", "choices": [{"text": "A", "is_correct": True}, {"text": "B", "is_correct": True}]},
        ]}
        self.assertEqual(client.put(f"/api/courses/{self.course.id}/quiz/", bad, format="json").status_code, 400)
