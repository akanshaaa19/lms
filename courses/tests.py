from django.test import TestCase
from rest_framework.test import APIClient

from courses.models import Course, Enrollment
from courses.testing import enroll, make_course, make_instructor, make_learner


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


class CoursePermissionTests(TestCase):
    """R7, checked on the server."""

    def setUp(self):
        self.owner = make_instructor("owner@example.com")
        self.other_instructor = make_instructor("other@example.com")
        self.learner = make_learner()
        self.published = make_course(self.owner, title="Published")
        self.draft = make_course(self.owner, status=Course.Status.DRAFT, title="Draft")

    def test_learner_cannot_create_a_course(self):
        response = client_for(self.learner).post("/api/courses/", {"title": "X", "description": "Y"})
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Course.objects.count(), 2)

    def test_learner_cannot_edit_or_delete_a_course(self):
        client = client_for(self.learner)
        self.assertEqual(client.patch(f"/api/courses/{self.published.id}/", {"title": "Hacked"}).status_code, 403)
        self.assertEqual(client.delete(f"/api/courses/{self.published.id}/").status_code, 403)

    def test_pending_instructor_cannot_create_a_course(self):
        pending = make_instructor("pending@example.com", approved=False)
        response = client_for(pending).post("/api/courses/", {"title": "X", "description": "Y"})
        self.assertEqual(response.status_code, 403)

    def test_instructor_cannot_edit_another_instructors_course(self):
        client = client_for(self.other_instructor)
        response = client.patch(f"/api/courses/{self.published.id}/", {"title": "Hacked"})
        self.assertEqual(response.status_code, 404)
        self.published.refresh_from_db()
        self.assertEqual(self.published.title, "Published")

    def test_instructor_cannot_add_lessons_to_another_instructors_course(self):
        response = client_for(self.other_instructor).post(
            f"/api/courses/{self.published.id}/lessons/", {"title": "L", "content": "C"}
        )
        self.assertEqual(response.status_code, 404)

    def test_owner_can_edit_their_course(self):
        response = client_for(self.owner).patch(f"/api/courses/{self.published.id}/", {"title": "Renamed"})
        self.assertEqual(response.status_code, 200)

    def test_draft_is_not_in_the_catalogue(self):
        titles = [c["title"] for c in client_for(self.learner).get("/api/courses/").json()]
        self.assertEqual(titles, ["Published"])

    def test_draft_is_hidden_even_by_guessing_the_url(self):
        client = client_for(self.learner)
        self.assertEqual(client.get(f"/api/courses/{self.draft.id}/").status_code, 404)
        self.assertEqual(client.post(f"/api/courses/{self.draft.id}/enroll/").status_code, 404)
        lesson = self.draft.lessons.first()
        self.assertEqual(client.get(f"/api/lessons/{lesson.id}/").status_code, 404)

    def test_learner_must_enrol_before_opening_lessons(self):
        lesson = self.published.lessons.first()
        self.assertEqual(client_for(self.learner).get(f"/api/lessons/{lesson.id}/").status_code, 403)

    def test_anonymous_users_are_refused(self):
        self.assertEqual(APIClient().get("/api/courses/").status_code, 403)


class EnrolmentAndProgressTests(TestCase):
    def setUp(self):
        self.instructor = make_instructor()
        self.learner = make_learner()
        self.course = make_course(self.instructor, lessons=4)
        self.client = client_for(self.learner)

    def test_enrol_once_only(self):
        self.assertEqual(self.client.post(f"/api/courses/{self.course.id}/enroll/").status_code, 201)
        self.assertEqual(self.client.post(f"/api/courses/{self.course.id}/enroll/").status_code, 400)
        self.assertEqual(Enrollment.objects.count(), 1)

    def test_completing_lessons_updates_progress(self):
        enroll(self.learner, self.course)
        first = self.course.lessons.first()
        self.client.post(f"/api/lessons/{first.id}/complete/")
        self.client.post(f"/api/lessons/{first.id}/complete/")  # twice is harmless
        progress = self.client.get(f"/api/courses/{self.course.id}/").json()["enrollment"]
        self.assertEqual((progress["completed_count"], progress["total_lessons"]), (1, 4))
        self.assertEqual(progress["progress_percent"], 25)

    def test_soft_deleted_course_stays_in_my_courses_but_is_locked(self):
        enroll(self.learner, self.course)
        response = client_for(self.instructor).delete(
            f"/api/courses/{self.course.id}/", {"reason": "Rules changed"}, format="json"
        )
        self.assertEqual(response.status_code, 204)

        my_courses = self.client.get("/api/my-courses/").json()
        self.assertTrue(my_courses[0]["course"]["is_deleted"])
        self.assertEqual(my_courses[0]["course"]["deletion_reason"], "Rules changed")
        self.assertEqual(self.client.get(f"/api/courses/{self.course.id}/").status_code, 404)
        lesson = self.course.lessons.first()
        self.assertEqual(self.client.get(f"/api/lessons/{lesson.id}/").status_code, 404)

    def test_instructor_dashboard_shows_learner_progress(self):
        enrollment = enroll(self.learner, self.course)
        enrollment.completions.create(lesson=self.course.lessons.first())
        rows = client_for(self.instructor).get(f"/api/courses/{self.course.id}/learners/").json()
        self.assertEqual(len(rows), 1)
        self.assertEqual((rows[0]["completed_count"], rows[0]["total_lessons"]), (1, 4))
        self.assertIsNone(rows[0]["best_percentage"])

    def test_dashboard_is_only_for_the_owner(self):
        other = make_instructor("other@example.com")
        self.assertEqual(client_for(other).get(f"/api/courses/{self.course.id}/learners/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/courses/{self.course.id}/learners/").status_code, 403)
