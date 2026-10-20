from django.contrib import admin, messages

from .models import Course, Enrollment, Lesson, LessonCompletion


class LessonInline(admin.StackedInline):
    model = Lesson
    extra = 0
    ordering = ["order"]


class DeletedFilter(admin.SimpleListFilter):
    title = "removed"
    parameter_name = "removed"

    def lookups(self, request, model_admin):
        return [("no", "Live"), ("yes", "Removed by instructor")]

    def queryset(self, request, queryset):
        if self.value() == "no":
            return queryset.filter(deleted_at__isnull=True)
        if self.value() == "yes":
            return queryset.filter(deleted_at__isnull=False)
        return queryset


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "instructor", "status", "lesson_count", "enrollment_count", "deleted_at"]
    list_filter = ["status", DeletedFilter, "instructor"]
    search_fields = ["title", "description"]
    inlines = [LessonInline]
    actions = ["restore_selected"]

    @admin.display(description="Lessons")
    def lesson_count(self, course):
        return course.lessons.count()

    @admin.display(description="Enrolled")
    def enrollment_count(self, course):
        return course.enrollments.count()

    @admin.action(description="Restore selected removed courses")
    def restore_selected(self, request, queryset):
        count = queryset.filter(deleted_at__isnull=False).update(deleted_at=None, deletion_reason="")
        self.message_user(request, f"Restored {count} course(s).", messages.SUCCESS)


class LessonCompletionInline(admin.TabularInline):
    model = LessonCompletion
    extra = 0
    readonly_fields = ["completed_at"]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["learner", "course", "enrolled_at"]
    list_filter = ["course"]
    search_fields = ["learner__user__email", "course__title"]
    inlines = [LessonCompletionInline]
