"""Demo data: python manage.py seed_demo

Creates an admin, an approved instructor, two learners, one published
course with lessons and a quiz, and one draft course. Safe to run twice:
existing demo data is removed and created again.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import InstructorProfile, LearnerProfile, User
from courses.models import Course, Enrollment, Lesson, LessonCompletion
from quizzes.grading import grade_quiz
from quizzes.models import Choice, Question, Quiz

PASSWORD = "Demo-pass-2026"

LESSONS = [
    (
        "What e-filing is and why it matters",
        "E-filing lets advocates and litigants submit case documents online instead of at the filing counter.\n\n"
        "For court staff, it means fewer paper bundles, faster scrutiny and a clear digital record of every filing.\n\n"
        "In this course you will learn how a filing arrives, how to check it, and how to accept or return it.",
    ),
    (
        "Receiving a new filing",
        "New filings appear in the scrutiny queue, oldest first.\n\n"
        "1. Open the filing and confirm the case type and court are correct.\n"
        "2. Check that the court fee has been paid. The receipt number is shown on the summary page.\n"
        "3. Note the filing number. You will need it if the filer calls about the case.",
    ),
    (
        "Checking documents",
        "Every filing must include a signed petition or application, a vakalatnama if an advocate is appearing, "
        "and an index of documents.\n\n"
        "Scanned pages must be readable, in the right order, and in PDF format. "
        "If a page is missing or unreadable, the filing must be returned, not accepted.",
    ),
    (
        "Accepting or returning a filing",
        "If everything is in order, choose Accept. The system gives the case a number and sends it for listing.\n\n"
        "If something is wrong, choose Return for correction and write a clear reason, for example "
        "'Page 4 of the petition is unreadable. Please upload a clearer scan.' "
        "The filer is notified and can correct and refile within 7 days.",
    ),
]

QUESTIONS = [
    ("Where do new e-filings appear?", ["In the scrutiny queue", "In the listing register", "By email"], 0),
    ("A scanned page is unreadable. What should you do?", [
        "Accept it and note the problem", "Return it for correction with a clear reason", "Delete the filing",
    ], 1),
    ("Which document is needed when an advocate is appearing?", ["A vakalatnama", "A court fee waiver", "An affidavit of service"], 0),
    ("How long does a filer have to correct and refile a returned filing?", ["24 hours", "7 days", "30 days"], 1),
]


class Command(BaseCommand):
    help = "Create demo users, a published course with lessons and a quiz, and a draft course."

    @transaction.atomic
    def handle(self, *args, **options):
        emails = ["admin@example.com", "instructor@example.com", "asha@example.com", "ravi@example.com"]
        self._clear(emails)

        User.objects.create_superuser("admin@example.com", PASSWORD, first_name="Site", last_name="Admin")

        instructor_user = User.objects.create_user(
            "instructor@example.com", PASSWORD, first_name="Meera", last_name="Nair"
        )
        instructor = InstructorProfile.objects.create(
            user=instructor_user, bio="Registry supervisor, District Court Ernakulam."
        )
        instructor.approve()

        asha = self._learner("asha@example.com", "Asha", "Menon", "Court clerk", "District Court Ernakulam")
        ravi = self._learner("ravi@example.com", "Ravi", "Kumar", "Filing assistant", "Family Court Kochi")

        course = Course.objects.create(
            instructor=instructor,
            title="E-filing for court clerks",
            description="A short course on receiving, checking and accepting e-filings in the District Court.",
            status=Course.Status.PUBLISHED,
        )
        lessons = [
            Lesson.objects.create(course=course, title=title, content=content, order=position)
            for position, (title, content) in enumerate(LESSONS, start=1)
        ]

        quiz = Quiz.objects.create(course=course, title="E-filing check", pass_mark=70)
        for position, (text, choices, correct_index) in enumerate(QUESTIONS, start=1):
            question = Question.objects.create(quiz=quiz, text=text, order=position)
            for index, choice_text in enumerate(choices):
                Choice.objects.create(question=question, text=choice_text, is_correct=index == correct_index)

        Course.objects.create(
            instructor=instructor,
            title="Handling urgent bail applications (draft)",
            description="Not published yet, so learners can't see it.",
            status=Course.Status.DRAFT,
        )

        # Asha has made progress: 2 of 4 lessons done and one failed attempt.
        asha_enrollment = Enrollment.objects.create(learner=asha, course=course)
        for lesson in lessons[:2]:
            LessonCompletion.objects.create(enrollment=asha_enrollment, lesson=lesson)
        questions = list(quiz.questions.prefetch_related("choices"))
        first_choice_each = {q.id: q.choices.all()[0].id for q in questions}
        grade_quiz(quiz, asha_enrollment, first_choice_each)  # 2 of 4 correct, so 50%: not passed

        self.stdout.write(self.style.SUCCESS("Demo data created. Every account's password is: " + PASSWORD))
        for email in emails:
            self.stdout.write(f"  {email}")
        self.stdout.write("Ravi is a learner who hasn't enrolled yet.")

    def _learner(self, email, first, last, designation, department):
        user = User.objects.create_user(email, PASSWORD, first_name=first, last_name=last)
        return LearnerProfile.objects.create(user=user, designation=designation, department=department)

    def _clear(self, emails):
        """Remove earlier demo data. Courses are PROTECTed, so delete in order."""
        from quizzes.models import QuizAttempt

        courses = Course.objects.filter(instructor__user__email__in=emails)
        QuizAttempt.objects.filter(quiz__course__in=courses).delete()
        Enrollment.objects.filter(course__in=courses).delete()
        courses.delete()
        User.objects.filter(email__in=emails).delete()
