from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Creates users identified by email instead of username.

    Django's default manager expects a username, so `createsuperuser` and
    `User.objects.create_user()` would break without this.
    """

    use_in_migrations = True

    def get_by_natural_key(self, email):
        # Used at login: "Asha@Court.in" and "asha@court.in" are the same person.
        return self.get(email__iexact=email)

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # stores a hash, never the plain password
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    """A person who can log in. Their role comes from which profile they have."""

    username = None  # remove the username field inherited from AbstractUser
    email = models.EmailField("email address", unique=True)

    USERNAME_FIELD = "email"  # the field used to log in
    REQUIRED_FIELDS = ["first_name", "last_name"]  # asked for by createsuperuser

    objects = UserManager()

    def __str__(self):
        return self.get_full_name() or self.email

    # A reverse one-to-one (user.learner_profile) raises an error when the
    # profile doesn't exist; hasattr() turns that into True/False.
    @property
    def is_learner(self):
        return hasattr(self, "learner_profile")

    @property
    def is_instructor(self):
        """True only for instructors an admin has approved."""
        return hasattr(self, "instructor_profile") and self.instructor_profile.is_approved

    @property
    def is_pending_instructor(self):
        return hasattr(self, "instructor_profile") and not self.instructor_profile.is_approved

    @property
    def role(self):
        """One word the frontend can switch on."""
        if self.is_instructor:
            return "instructor"
        if self.is_pending_instructor:
            return "pending_instructor"
        if self.is_learner:
            return "learner"
        if self.is_staff:
            return "admin"
        return None


class InstructorProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="instructor_profile"
    )
    bio = models.TextField(blank=True)
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return str(self.user)

    def clean(self):
        # One role per user (decision A5).
        if LearnerProfile.objects.filter(user_id=self.user_id).exists():
            raise ValidationError("This user is already a learner. A user can have only one role.")

    def approve(self):
        self.is_approved = True
        self.approved_at = timezone.now()
        self.save(update_fields=["is_approved", "approved_at"])


class LearnerProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="learner_profile"
    )
    designation = models.CharField(max_length=100, blank=True, help_text="For example, Court clerk")
    department = models.CharField(max_length=100, blank=True, help_text="For example, District Court")

    def __str__(self):
        return str(self.user)

    def clean(self):
        # One role per user (decision A5).
        if InstructorProfile.objects.filter(user_id=self.user_id).exists():
            raise ValidationError("This user is already an instructor. A user can have only one role.")
