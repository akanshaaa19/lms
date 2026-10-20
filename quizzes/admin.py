from django.contrib import admin
from django.core.exceptions import ValidationError
from django.forms.models import BaseInlineFormSet

from .models import AttemptAnswer, Choice, Question, Quiz, QuizAttempt


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0
    show_change_link = True  # choices are edited on the question's own page


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["title", "course", "pass_mark"]
    search_fields = ["title", "course__title"]
    inlines = [QuestionInline]


class ChoiceInlineFormSet(BaseInlineFormSet):
    def clean(self):
        # The database allows at most one correct choice; this adds "at least one".
        super().clean()
        correct = sum(
            1 for form in self.forms
            if form.cleaned_data and not form.cleaned_data.get("DELETE") and form.cleaned_data.get("is_correct")
        )
        if correct != 1:
            raise ValidationError("Mark exactly one choice as correct.")


class ChoiceInline(admin.TabularInline):
    model = Choice
    formset = ChoiceInlineFormSet
    extra = 2


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["text", "quiz", "order"]
    list_filter = ["quiz"]
    inlines = [ChoiceInline]


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    extra = 0
    can_delete = False
    readonly_fields = ["question", "selected_choice", "is_correct"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    # Attempts are a record: viewable, never edited.
    list_display = ["enrollment", "quiz", "score", "total", "percentage", "passed", "submitted_at"]
    list_filter = ["passed", "quiz"]
    readonly_fields = ["enrollment", "quiz", "score", "total", "percentage", "passed", "submitted_at"]
    inlines = [AttemptAnswerInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
