# API contract

The Django REST API that the React app uses. All paths start with `/api/`. Request and response bodies are JSON.

## Conventions

- **Auth:** Django session cookie. Call `GET /api/auth/csrf/` once on app load. It sets the `csrftoken` cookie. Every `POST`, `PUT`, `PATCH` and `DELETE` must send the header `X-CSRFToken: <csrftoken cookie value>`. Read the cookie fresh on each request, because Django rotates it on login.
- **Where the API is:** the frontend uses `VITE_API_URL` (`frontend/.env.development` sets `http://localhost:8000`). If it's empty, requests go to the same site, and a proxy (Vite's, or a hosting rewrite) forwards `/api` and `/admin` to Django. Django allows the frontend's origin through CORS with credentials (`DJANGO_FRONTEND_ORIGINS`).
- **Errors:**
  - `400` validation: `{"field_name": ["message", ...], "non_field_errors": ["..."]}` or `{"detail": "message"}`
  - `401` or `403`: `{"detail": "..."}`. Not logged in, or not allowed.
  - `404`: `{"detail": "Not found."}`. Also returned for draft or deleted courses that a learner isn't allowed to see.
- **Roles:** `user.role` is one of `"learner"`, `"instructor"`, `"pending_instructor"`, `"admin"` (staff with no profile), or `null`.

## Auth: `/api/auth/`

| Method & path | Body | Response |
|---|---|---|
| `GET csrf/` | none | `200 {"csrfToken": "…"}`, and sets the `csrftoken` cookie. Use the body when the frontend is on another domain and can't read the cookie. |
| `GET me/` | none | `200 {"user": User or null}` |
| `POST signup/` | `{first_name, last_name, email, password, role: "learner" or "instructor"}` | `201 {"user": User}`, now logged in. `400` field errors. |
| `POST login/` | `{email, password}` | `200 {"user": User}`. `400 {"detail": "Email or password is incorrect."}` |
| `POST logout/` | none | `204` |
| `GET profile/` | none | `200 Profile` |
| `PATCH profile/` | any of `{first_name, last_name, bio}` (instructor) or `{first_name, last_name, designation, department}` (learner) | `200 Profile` |

`User` = `{id, email, first_name, last_name, full_name, role}`

`Profile` = `User` plus `bio` (instructor only) or `designation, department` (learner only)

## Courses: `/api/courses/`

What `GET /api/courses/` returns depends on who's asking:
- **Learner:** the catalogue, i.e. published and not deleted. Supports `?search=text`, which matches title or description.
- **Instructor:** their own courses that aren't deleted, in any status.

`CourseSummary` = `{id, title, description, status: "draft" or "published", instructor_name, lesson_count, has_quiz, is_enrolled, created_at, updated_at}`

| Method & path | Who | Body | Response |
|---|---|---|---|
| `GET courses/` | logged in | none | `200 [CourseSummary]` |
| `POST courses/` | instructor | `{title, description, status}` | `201 CourseDetail` |
| `GET courses/{id}/` | owner, or learner if published | none | `200 CourseDetail` |
| `PATCH courses/{id}/` | owner | any of `{title, description, status}` | `200 CourseDetail` |
| `DELETE courses/{id}/` | owner | `{reason?}` | `204`. Soft delete. |
| `POST courses/{id}/enroll/` | learner, published | none | `201 CourseDetail`. `400` if already enrolled. |
| `GET courses/{id}/learners/` | owner | none | `200 [LearnerProgress]` (R6) |

`CourseDetail` = `CourseSummary` plus:
- `lessons: [{id, title, order, is_completed}]`. `is_completed` is always false for instructors.
- `quiz: {id, title, pass_mark, question_count} or null`
- `enrollment`: null if the user isn't enrolled, otherwise `{enrolled_at, completed_count, total_lessons, progress_percent, best_percentage (null if no attempts), passed (bool)}`

`LearnerProgress` = `{learner_id, full_name, email, designation, department, enrolled_at, completed_count, total_lessons, progress_percent, best_percentage or null, attempt_count, passed}`

## My courses: `/api/my-courses/` (learner)

`GET my-courses/` returns `200 [Enrolment]`.

`Enrolment` = `{course: {id, title, description, instructor_name, is_deleted, deleted_at, deletion_reason}, enrolled_at, completed_count, total_lessons, progress_percent, best_percentage or null, passed}`

Deleted courses are included, so the UI can show "Removed by the instructor on DATE".

## Lessons

| Method & path | Who | Body | Response |
|---|---|---|---|
| `POST courses/{id}/lessons/` | owner | `{title, content, video_url?, order?}`. If `order` is missing, it goes last. | `201 Lesson` |
| `GET lessons/{id}/` | owner, or enrolled learner of a live published course | none | `200 Lesson` |
| `PATCH lessons/{id}/` | owner | any of `{title, content, video_url, order}` | `200 Lesson` |
| `DELETE lessons/{id}/` | owner | none | `204` |
| `POST lessons/{id}/complete/` | enrolled learner | none | `200 Lesson`. Calling it twice is safe. |

`Lesson` = `{id, course_id, course_title, title, content, video_url, order, is_completed, previous_lesson_id or null, next_lesson_id or null}`

## Quizzes

| Method & path | Who | Body | Response |
|---|---|---|---|
| `GET courses/{id}/quiz/` | owner | none | `200 QuizEdit`. `404` if there's no quiz. |
| `PUT courses/{id}/quiz/` | owner | `QuizEdit` without ids | `200 QuizEdit`. Creates the quiz or replaces its questions. Each question needs at least 2 choices and exactly 1 correct. |
| `DELETE courses/{id}/quiz/` | owner | none | `204`. `400` if the quiz has attempts. |
| `GET quizzes/{id}/` | enrolled learner | none | `200 QuizTake`. Correct answers are **never** included. |
| `POST quizzes/{id}/attempts/` | enrolled learner | `{"answers": {"<question_id>": <choice_id>, ...}}` | `201 AttemptResult` |
| `GET quizzes/{id}/attempts/` | enrolled learner | none | `200 [AttemptSummary]`, their own, newest first |

- `QuizEdit` = `{id, title, pass_mark, questions: [{id, text, order, choices: [{id, text, is_correct}]}]}`
- `QuizTake` = `{id, title, pass_mark, course_id, course_title, questions: [{id, text, order, choices: [{id, text}]}]}`
- `AttemptSummary` = `{id, score, total, percentage, passed, submitted_at}`
- `AttemptResult` = `AttemptSummary` plus `answers: [{question_id, question_text, selected_choice_id, selected_choice_text, correct_choice_id, correct_choice_text, is_correct}]`

## Dashboard: `/api/dashboard/` (learner or instructor)

`GET dashboard/` returns `200` with a body that depends on the role. There are no due dates, so "upcoming" means the next step.

**Learner**
```
{ role: "learner",
  stats: { enrolled, lessons_completed, courses_completed, quizzes_passed },
  in_progress: [ { course_id, course_title, instructor_name, completed_count, total_lessons, progress_percent,
                   last_activity, next_lesson: {id, title, order} | null,
                   quiz: {id, title, best_percentage | null, passed} | null } ],   // most recent first; finished courses left out
  recent_attempts: [ { quiz_id, course_id, course_title, percentage, passed, submitted_at } ],   // last 5
  suggested_courses: [ { id, title, description, instructor_name, lesson_count } ] }           // up to 3 not enrolled
```

**Instructor**
```
{ role: "instructor",
  stats: { published, drafts, learners, enrollments, learners_passed, average_progress | null, quiz_attempts, pass_rate | null },
  courses: [ { id, title, status, lesson_count, has_quiz, enrolled, average_progress | null, passed_count } ],
  attention: [ { course_id, course_title, tab: "lessons" | "quiz" | "overview", message } ],
  recent_activity: [ { type: "enrolled" | "quiz_attempt" | "lesson_completed", learner_name, course_id, course_title, at,
                       percentage?, passed?, lesson_title? } ] }   // newest first, up to 8
```

## Admin: `/api/admin/` (staff only; everyone else gets 403)

| Method & path | Body / query | Response |
|---|---|---|
| `GET overview/` | none | `{users, learners, instructors, pending_instructors, courses: {published, drafts, removed}, enrollments, quiz_attempts}` |
| `GET instructors/` | `?status=pending` or `approved` (optional) | `[{id, user_id, email, full_name, bio, is_approved, approved_at, requested_at, course_count}]`, with pending ones first |
| `POST instructors/{id}/approve/` | none | `{id, is_approved: true, approved_at}`. `400` if already approved. |
| `POST instructors/{id}/revoke/` | none | `{id, is_approved: false, approved_at: null}`. Their courses are kept. `400` if not approved. |
| `GET users/` | `?search=` (name or email), `?role=learner` / `instructor` / `pending_instructor` / `admin` | `[{id, email, full_name, role, is_active, date_joined, last_login, designation, department}]`, newest first |
| `GET courses/` | `?status=published` / `draft` / `removed`, `?search=` (title) | `[{id, title, status, instructor_name, instructor_email, lesson_count, enrolled, created_at, is_deleted, deleted_at, deletion_reason}]` |
| `POST courses/{id}/restore/` | none | `{id, is_deleted: false}`. `404` if the course isn't removed. |

`{id}` for instructors is the **InstructorProfile** id (`id` in the list), not the user id.
