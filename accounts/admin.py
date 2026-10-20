from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import InstructorProfile, LearnerProfile, User


class AdminUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ["email", "first_name", "last_name"]


class AdminUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    # Django's UserAdmin assumes a username field; ours logs in with email.
    add_form = AdminUserCreationForm
    form = AdminUserChangeForm
    ordering = ["email"]
    list_display = ["email", "first_name", "last_name", "role", "is_staff", "is_active"]
    list_filter = ["is_staff", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    fieldsets = [
        (None, {"fields": ["email", "password"]}),
        ("Personal info", {"fields": ["first_name", "last_name"]}),
        ("Permissions", {"fields": ["is_active", "is_staff", "is_superuser", "groups", "user_permissions"]}),
        ("Important dates", {"fields": ["last_login", "date_joined"]}),
    ]
    add_fieldsets = [
        (None, {"classes": ["wide"], "fields": ["email", "first_name", "last_name", "password1", "password2"]}),
    ]


@admin.register(InstructorProfile)
class InstructorProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "is_approved", "approved_at"]
    list_filter = ["is_approved"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]
    readonly_fields = ["approved_at"]
    actions = ["approve_selected"]

    @admin.action(description="Approve selected instructors")
    def approve_selected(self, request, queryset):
        pending = queryset.filter(is_approved=False)
        count = pending.count()
        for profile in pending:
            profile.approve()
        self.message_user(request, f"Approved {count} instructor(s).", messages.SUCCESS)


@admin.register(LearnerProfile)
class LearnerProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "designation", "department"]
    list_filter = ["department"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "department"]
