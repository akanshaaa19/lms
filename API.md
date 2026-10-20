# API contract

The Django REST API that the React app uses. All paths start with `/api/`. Request and response bodies are JSON.

## Conventions

- **Auth:** Django session cookie. Call `GET /api/auth/csrf/` once on app load. It sets the `csrftoken` cookie. Every `POST`, `PUT`, `PATCH` and `DELETE` must send the header `X-CSRFToken: <csrftoken cookie value>`. Read the cookie fresh on each request, because Django rotates it on login.
- **Development:** Vite proxies `/api` and `/admin` to `http://127.0.0.1:8000`, so the browser sees one origin and no CORS setup is needed.
- **Errors:**
  - `400` validation: `{"field_name": ["message", ...], "non_field_errors": ["..."]}` or `{"detail": "message"}`
  - `401` or `403`: `{"detail": "..."}`. Not logged in, or not allowed.
  - `404`: `{"detail": "Not found."}`. Also returned for draft or deleted courses that a learner isn't allowed to see.
- **Roles:** `user.role` is one of `"learner"`, `"instructor"`, `"pending_instructor"`, `"admin"` (staff with no profile), or `null`.

## Auth: `/api/auth/`

| Method & path | Body | Response |
|---|---|---|
| `GET csrf/` | none | `204`, sets the cookie |
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
