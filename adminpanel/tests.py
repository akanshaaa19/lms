from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from courses.testing import enroll, make_course, make_instructor, make_learner


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


class AdminPanelTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser("boss@example.com", "Test-pass-2026")
        self.instructor = make_instructor()
        self.learner = make_learner()
        self.course = make_course(self.instructor)

    def test_only_staff_can_use_the_admin_api(self):
        for user in (self.instructor, self.learner):
            self.assertEqual(client_for(user).get("/api/admin/overview/").status_code, 403)
        self.assertEqual(APIClient().get("/api/admin/users/").status_code, 403)
        self.assertEqual(client_for(self.admin).get("/api/admin/overview/").status_code, 200)

    def test_approving_a_pending_instructor_gives_access(self):
        pending = make_instructor("pending@example.com", approved=False)
        profile_id = pending.instructor_profile.id
        response = client_for(self.admin).post(f"/api/admin/instructors/{profile_id}/approve/")
        self.assertEqual(response.status_code, 200)
        pending.refresh_from_db()
        self.assertTrue(pending.is_instructor)

    def test_revoking_keeps_courses_but_removes_access(self):
        profile_id = self.instructor.instructor_profile.id
        client_for(self.admin).post(f"/api/admin/instructors/{profile_id}/revoke/")
        self.instructor.refresh_from_db()
        self.assertFalse(self.instructor.is_instructor)
        self.assertTrue(self.course.__class__.objects.filter(pk=self.course.pk).exists())
        self.assertEqual(client_for(self.instructor).post("/api/courses/", {"title": "X", "description": "Y"}).status_code, 403)

    def test_restore_brings_a_removed_course_back(self):
        enroll(self.learner, self.course)
        self.course.soft_delete("Old rules")
        response = client_for(self.admin).post(f"/api/admin/courses/{self.course.id}/restore/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(client_for(self.learner).get(f"/api/courses/{self.course.id}/").status_code, 200)

    def test_course_list_includes_removed_courses(self):
        self.course.soft_delete("Old rules")
        rows = client_for(self.admin).get("/api/admin/courses/?status=removed").json()
        self.assertEqual([row["id"] for row in rows], [self.course.id])
