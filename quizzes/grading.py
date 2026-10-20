"""Quiz marking, kept apart from views so it's easy to read and to test (R5, R9)."""

from django.db import transaction

from .models import AttemptAnswer, QuizAttempt


def grade_quiz(quiz, enrollment, selected_choice_ids):
    """Mark a submission, save it as a new attempt, and return the attempt.

    `selected_choice_ids` maps question id -> chosen choice id. A question
    with no answer counts as wrong. A choice that doesn't belong to its
    question is rejected, so a tampered form can't score points.
    """
    if enrollment.course_id != quiz.course_id:
        raise ValueError("The learner is not enrolled in this quiz's course.")

    questions = list(quiz.questions.prefetch_related("choices"))
    if not questions:
        raise ValueError("This quiz has no questions yet.")

    answers = []
    score = 0
    for question in questions:
        choice_id = selected_choice_ids.get(question.id)
        if choice_id is None:
            continue
        choice = next((c for c in question.choices.all() if c.id == choice_id), None)
        if choice is None:
            raise ValueError(f"Choice {choice_id} is not an option for question {question.id}.")
        answers.append(AttemptAnswer(question=question, selected_choice=choice))
        if choice.is_correct:
            score += 1

    total = len(questions)
    percentage = round(score * 100 / total)

    # Either the attempt and all its answers are saved, or nothing is.
    with transaction.atomic():
        attempt = QuizAttempt.objects.create(
            enrollment=enrollment,
            quiz=quiz,
            score=score,
            total=total,
            percentage=percentage,
            passed=percentage >= quiz.pass_mark,
        )
        for answer in answers:
            answer.attempt = attempt
        AttemptAnswer.objects.bulk_create(answers)

    return attempt
