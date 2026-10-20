from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.serializers import SignUpSerializer
from courses.testing import PASSWORD, make_learner


class SignUpAndLoginTests(TestCase):
    def signup(self, client, **overrides):
        data = {
            "first_name": "Asha", "last_name": "Menon", "email": "asha@example.com",
            "password": "Sturdy-pass-2026", "role": "learner",
        }
        data.update(overrides)
        return client.post("/api/auth/signup/", data, format="json")

    def test_learner_signup_creates_learner_profile_and_logs_in(self):
        client = APIClient()
        response = self.signup(client)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["role"], "learner")
        self.assertEqual(client.get("/api/auth/me/").json()["user"]["email"], "asha@example.com")

    def test_instructor_signup_waits_for_approval(self):
        response = self.signup(APIClient(), role="instructor")
        self.assertEqual(response.json()["user"]["role"], "pending_instructor")
        self.assertFalse(User.objects.get(email="asha@example.com").is_instructor)

    def test_duplicate_email_is_rejected_whatever_the_case(self):
        self.signup(APIClient())
        response = self.signup(APIClient(), email="ASHA@example.com")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_simultaneous_duplicate_signup_gets_a_friendly_error(self):
        """Simulates the race: the email check passes, but the user already exists."""
        self.signup(APIClient())
        with mock.patch.object(SignUpSerializer, "validate_email", lambda self, value: value.lower()):
            response = self.signup(APIClient())
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())
        self.assertEqual(User.objects.filter(email="asha@example.com").count(), 1)

    def test_weak_password_is_rejected(self):
        response = self.signup(APIClient(), password="12345678")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.json())

    def test_login_is_case_insensitive_and_wrong_password_fails(self):
        make_learner("lena@example.com")
        self.assertEqual(
            APIClient().post("/api/auth/login/", {"email": "LENA@example.com", "password": PASSWORD}).status_code, 200
        )
        self.assertEqual(
            APIClient().post("/api/auth/login/", {"email": "lena@example.com", "password": "nope"}).status_code, 400
        )

    def test_login_requires_a_csrf_token(self):
        """Login comes from a logged-out user, so DRF alone wouldn't check CSRF."""
        make_learner("lena@example.com")
        client = APIClient(enforce_csrf_checks=True)
        response = client.post("/api/auth/login/", {"email": "lena@example.com", "password": PASSWORD})
        self.assertEqual(response.status_code, 403)

        client.get("/api/auth/csrf/")
        token = client.cookies["csrftoken"].value
        response = client.post(
            "/api/auth/login/", {"email": "lena@example.com", "password": PASSWORD}, HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(response.status_code, 200)
