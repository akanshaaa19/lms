from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import InstructorProfile, LearnerProfile, User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role"]


DUPLICATE_EMAIL = "An account with this email already exists. Try logging in instead."


class SignUpSerializer(serializers.Serializer):
    """Creates a user and exactly one profile (decision A5)."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    role = serializers.ChoiceField(choices=["learner", "instructor"])

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(DUPLICATE_EMAIL)
        return value

    def validate(self, data):
        # Run Django's password rules (length, too common, all numbers,
        # too similar to the name or email) against the would-be user.
        candidate = User(email=data["email"], first_name=data["first_name"], last_name=data["last_name"])
        try:
            validate_password(data["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        return data

    @transaction.atomic
    def create(self, validated_data):
        # atomic: if creating the profile fails, the user isn't saved either.
        role = validated_data.pop("role")
        try:
            # Inner savepoint, so the outer transaction is still usable if this fails.
            with transaction.atomic():
                user = User.objects.create_user(**validated_data)
        except IntegrityError:
            # Two sign-ups with the same email at the same moment can both pass
            # validate_email; the database's unique constraint stops the second.
            # Report it as the same friendly error instead of a server error.
            raise serializers.ValidationError({"email": [DUPLICATE_EMAIL]})
        if role == "instructor":
            InstructorProfile.objects.create(user=user)  # waits for admin approval
        else:
            LearnerProfile.objects.create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class ProfileSerializer(serializers.ModelSerializer):
    """The logged-in user's own details, plus the fields of their role's profile."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)
    role = serializers.CharField(read_only=True)
    bio = serializers.CharField(source="instructor_profile.bio", required=False, allow_blank=True)
    designation = serializers.CharField(source="learner_profile.designation", required=False, allow_blank=True)
    department = serializers.CharField(source="learner_profile.department", required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role", "bio", "designation", "department"]
        read_only_fields = ["email"]

    def to_representation(self, user):
        data = super().to_representation(user)
        # Only show the fields that belong to this user's role.
        if not hasattr(user, "instructor_profile"):
            data.pop("bio", None)
        if not hasattr(user, "learner_profile"):
            data.pop("designation", None)
            data.pop("department", None)
        return data

    @transaction.atomic
    def update(self, user, validated_data):
        instructor_data = validated_data.pop("instructor_profile", {})
        learner_data = validated_data.pop("learner_profile", {})
        for field, value in validated_data.items():
            setattr(user, field, value)
        user.save()
        if instructor_data and hasattr(user, "instructor_profile"):
            InstructorProfile.objects.filter(user=user).update(**instructor_data)
        if learner_data and hasattr(user, "learner_profile"):
            LearnerProfile.objects.filter(user=user).update(**learner_data)
        user.refresh_from_db()
        return user
