# Notes

The design choices behind the build. The API contract is in [API.md](API.md).

**Live demo:** frontend https://lms-frontend-eosin-nu.vercel.app · API and Django admin https://lms-heq3.onrender.com/admin/
(Demo logins are in the README. The free backend sleeps when idle, so the first request can take up to a minute.)

## Tools and AI assistants

- **Claude Code (Claude Opus)** as an AI pair programmer throughout:
  - **Design review before coding.** I used it to challenge my first plan. That changed a `user_type` + `entity_id` design into profile tables with real foreign keys, and replaced a stored progress percentage with completion records.
  - **Implementation.** Claude Code wrote most of the code to my design and requirements: the Django models, the API, the admin, the tests and the demo data. A parallel Claude sub-agent built the React UI against a written API contract (`API.md`).
  - **Review and hardening.** We tested each part end to end, and used review passes to find edge cases. One example is a race condition on duplicate sign-ups, now handled and tested.
- **Django REST Framework** for the API, **React + Vite + Mantine** for the UI, the **Inter** font via Fontsource, and **Vercel + Render** for hosting.
- TODO (Akansha): one or two sentences in your own words on how you reviewed and tested the code.

## Architecture

```
React (Vercel / Vite :5173)  ──HTTPS, session cookie + CSRF──▶  Django + DRF (Render / :8000)  ──▶  SQLite
```

- **Django owns all data, rules and permissions.** React only displays data and calls the API. Every R7 rule is enforced on the server and covered by tests.
- **Login uses Django sessions and CSRF, not tokens.** The session cookie is `HttpOnly`, so JavaScript (and therefore an XSS bug) can't read it, and logging out revokes it immediately. Every change request carries the CSRF token in a header. Sign-up and login add `csrf_protect` explicitly, because DRF only enforces CSRF for sessions that are already logged in.
- **The frontend finds the API through `VITE_API_URL`.** Django allows that origin through CORS with credentials. All production settings come from environment variables: secret key, debug, allowed hosts, trusted origins and cookie flags.
- **The API is locked by default** (`IsAuthenticated`). Only csrf, me, signup and login are opened explicitly, so a forgotten permission fails safe.

## Data model

```
User (email login)
 ├─ InstructorProfile (bio, is_approved, approved_at)   1:1
 └─ LearnerProfile   (designation, department)          1:1

InstructorProfile ─< Course (title, description, status, deleted_at, deletion_reason)
Course ─< Lesson (title, content, video_url, order)      UNIQUE(course, order)
Course ── Quiz (title, pass_mark)                        1:1
Quiz ─< Question (text, order) ─< Choice (text, is_correct)
                                   at most one correct per question (partial unique index)
LearnerProfile ─< Enrollment >─ Course                   UNIQUE(learner, course)
Enrollment ─< LessonCompletion >─ Lesson                 UNIQUE(enrollment, lesson)
Enrollment ─< QuizAttempt (score, total, percentage, passed) ─< AttemptAnswer
```

Why it looks like this:

- **Roles are profile tables, not a `role` string.** `Course.instructor` points at `InstructorProfile` and `Enrollment.learner` at `LearnerProfile`, so the database itself guarantees that only instructors own courses and only learners enrol. Each user has exactly one role, checked at sign-up and in `clean()`.
- **Instructors need admin approval.** Sign-up offers "I want to teach (needs approval)". The account waits on a clear pending screen until an admin approves it, either in the app's admin area or with the Django admin action.
- **Completions hang off `Enrollment`, not the user**, so a lesson can't be completed in a course the learner isn't enrolled in.
- **Progress is calculated, never stored** (completions ÷ lessons), so it's always correct, even after an instructor adds or removes lessons. The instructor dashboard gets every learner's progress, best score and pass status in **one** annotated query (`Enrollment.objects.with_progress()`).
- **Quiz scores are stored, unlike progress.** An attempt is a historical record, and editing the quiz later must not change a past result. Every attempt and every answer is kept.
- **"One correct answer"** is enforced by the database: a partial unique index allows at most one. The quiz builder and the admin form also require at least one.
- **Courses are soft-deleted.** Legal processes change, so instructors must be able to withdraw out-of-date content, but the record of who trained on what is worth keeping. A removed course leaves the catalogue. Learners still see it in "My courses" as "Removed by the instructor on DATE" with the reason and their results, while its lessons and quiz are locked. Admins can restore it, and `on_delete=PROTECT` stops a hard delete from wiping enrolments.
- **Ownership is enforced by queryset, not by scattered `if` checks.** Every view fetches courses through `courses/access.py` (`owned_courses(user)`, `catalogue_courses()`). Another instructor's course, or a draft seen by a learner, returns **404**, so the API never confirms that a hidden course exists, even from a guessed URL.
- **Marking is a plain function** (`quizzes/grading.py`), separate from the views. It rejects a choice that belongs to a different question, counts unanswered questions as wrong, and saves the attempt with its answers in one transaction.
- **Database constraints are the real guarantees, and Python checks give friendly messages.** For example, two simultaneous sign-ups with the same email can both pass validation. The unique constraint stops the second, and its `IntegrityError` is turned into the same friendly 400 error.

## Beyond the core requirements

- **Dashboards** for learners (continue where you left off, what's next, recent results) and instructors (key numbers, courses that need attention, recent learner activity). There are no due dates, so "upcoming" means the next step.
- **An admin area in the app** (`/manage`) for approving or revoking instructors, browsing users, and seeing every course, with restore for removed ones. It's backed by a staff-only API. The Django admin remains for full data management (R8).
- **Course search** in the catalogue, and a **course outline** beside each lesson showing what's done.
- **A live deployment** on Vercel and Render.

## Accessibility

The organisation trains all of its staff, so the UI is built to work for everyone:
- a skip link
- focus moves to each page's heading on navigation, and the page title updates
- visible labels on every field, with errors linked to their fields
- an error summary that takes focus
- radio groups inside fieldset and legend
- status is never shown by colour alone: every dot and ring has text
- AA contrast, including muted text
- a visible focus indicator
- touch targets of at least 44px
- no horizontal scrolling, and layouts that reflow at 400px width and 200% zoom

## Assumptions and interpretations

- **One role per account.** Someone who both teaches and learns uses two accounts. The profile tables would allow both roles later without a redesign.
- **One quiz per course**, taken at the end. Learners can retake it, and the best score counts.
- **The pass mark is set per quiz**, defaulting to 70%. A score exactly at the pass mark passes.
- Correct answers are shown **after** submitting, never in the quiz itself. For training, seeing corrections is part of learning.
- Lessons can be opened in any order. Lesson locking was a stretch goal I chose not to build.

## What I left out, or would change with more time

- **Comments and questions on lessons**, and an **AI "ask me anything" assistant** grounded in course content. Both were on my original plan, but I chose to finish R1–R9 properly first.
- **Frontend tests** (React Testing Library with axe accessibility checks). The backend has 42 tests.
- Stretch goals: lesson locking, certificates, CSV export, English and Malayalam, and Docker.
- **Rate limiting on login** (DRF throttling), plus email verification and password reset.
- **PostgreSQL in production.** SQLite on the free host resets when the server restarts. The start command re-creates the demo accounts, but anything else is lost. Switching only changes `DATABASES`.
- **Versioned quizzes.** Editing a quiz replaces its questions, so past attempts keep their scores but lose the per-question detail.
- **Scaling the dashboard query.** It's a single query today. For very large courses, its joined counts would become per-column subqueries to avoid multiplying rows.

## Time spent

TODO (Akansha): total time, plus a rough split across planning and data model, backend and tests, frontend, and docs.
