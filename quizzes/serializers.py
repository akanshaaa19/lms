from django.db import transaction
from rest_framework import serializers

from .models import Choice, Question, Quiz, QuizAttempt


# --- Instructor: build and edit a quiz ---

class ChoiceEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text", "is_correct"]
        read_only_fields = ["id"]


class QuestionEditSerializer(serializers.ModelSerializer):
    choices = ChoiceEditSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "order", "choices"]
        read_only_fields = ["id", "order"]

    def validate_choices(self, choices):
        # The database stops a second correct answer; this also catches none.
        if len(choices) < 2:
            raise serializers.ValidationError("Each question needs at least two choices.")
        correct = sum(1 for choice in choices if choice.get("is_correct"))
        if correct != 1:
            raise serializers.ValidationError("Mark exactly one choice as the correct answer.")
        return choices


class QuizEditSerializer(serializers.ModelSerializer):
    questions = QuestionEditSerializer(many=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "pass_mark", "questions"]
        read_only_fields = ["id"]

    def validate_questions(self, questions):
        if not questions:
            raise serializers.ValidationError("Add at least one question.")
        return questions

    @transaction.atomic
    def save_for_course(self, course):
        """Create the course's quiz, or replace its questions with the ones sent.

        Past attempts keep their stored scores.
        """
        data = self.validated_data
        quiz, _ = Quiz.objects.update_or_create(
            course=course, defaults={"title": data["title"], "pass_mark": data["pass_mark"]}
        )
        quiz.questions.all().delete()
        for position, question_data in enumerate(data["questions"], start=1):
            question = Question.objects.create(quiz=quiz, text=question_data["text"], order=position)
            Choice.objects.bulk_create(
                Choice(question=question, text=c["text"], is_correct=c.get("is_correct", False))
                for c in question_data["choices"]
            )
        return quiz


# --- Learner: take a quiz (correct answers are never sent) ---

class ChoiceTakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text"]


class QuestionTakeSerializer(serializers.ModelSerializer):
    choices = ChoiceTakeSerializer(many=True)

    class Meta:
        model = Question
        fields = ["id", "text", "order", "choices"]


class QuizTakeSerializer(serializers.ModelSerializer):
    course_id = serializers.IntegerField(read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)
    questions = QuestionTakeSerializer(many=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "pass_mark", "course_id", "course_title", "questions"]


class SubmitAttemptSerializer(serializers.Serializer):
    answers = serializers.DictField(child=serializers.IntegerField())

    def validate_answers(self, answers):
        try:
            return {int(question_id): choice_id for question_id, choice_id in answers.items()}
        except ValueError:
            raise serializers.ValidationError("Question ids must be numbers.")


# --- Results ---

class AttemptSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ["id", "score", "total", "percentage", "passed", "submitted_at"]


class AttemptResultSerializer(AttemptSummarySerializer):
    answers = serializers.SerializerMethodField()
    answers_revealed = serializers.SerializerMethodField()

    class Meta(AttemptSummarySerializer.Meta):
        fields = AttemptSummarySerializer.Meta.fields + ["answers_revealed", "answers"]

    def get_answers_revealed(self, attempt):
        if not hasattr(self, "_revealed"):
            self._revealed = attempt.enrollment.quiz_attempts.filter(quiz=attempt.quiz, passed=True).exists()
        return self._revealed

    def get_answers(self, attempt):
        revealed = self.get_answers_revealed(attempt)
        chosen = {a.question_id: a.selected_choice for a in attempt.answers.select_related("selected_choice")}
        rows = []
        for question in attempt.quiz.questions.prefetch_related("choices"):
            correct = next((c for c in question.choices.all() if c.is_correct), None)
            selected = chosen.get(question.id)
            rows.append({
                "question_id": question.id,
                "question_text": question.text,
                "selected_choice_id": selected.id if selected else None,
                "selected_choice_text": selected.text if selected else None,
                "correct_choice_id": correct.id if revealed and correct else None,
                "correct_choice_text": correct.text if revealed and correct else None,
                "is_correct": bool(selected and selected.is_correct),
            })
        return rows
