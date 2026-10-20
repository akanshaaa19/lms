from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Creates users identified by email instead of username.

    Django's default manager expects a username, so `createsuperuser` and
    `User.objects.create_user()` would break without this.
    """

    use_in_migrations = True

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
