# Notes

The design choices behind the build. The API contract is in [API.md](API.md).

**Live demo:** frontend https://lms-frontend-eosin-nu.vercel.app · API and Django admin https://lms-heq3.onrender.com/admin/
(Demo logins are in the README. The free backend sleeps when idle, so the first request can take up to a minute.)

## Tools and AI assistants

- **Claude Code (Claude Opus)** as an AI pair programmer throughout:
  - **Design review before coding.** I used it to challenge my first plan. That changed a `user_type` + `entity_id` design into profile tables with real foreign keys, and replaced a stored progress percentage with completion records.
  - **Review and hardening.** I tested each part end to end, and used review passes to find edge cases. One example is a race condition on duplicate sign-ups, now handled and tested.
- **Django REST Framework** for the API, **React + Vite + Mantine** for the UI, the **Inter** font via Fontsource, and **Vercel + Render** for hosting.
- I tested the APIs end to end and every feature by hand, for each role.

## How I worked

1. **Read the brief, then pressure-tested the plan.** I started from my own rough notes (pages, roles, a first data model) and reviewed them critically before writing code. That review cut scope (an AI assistant and lesson comments moved to "later") and fixed the data model (real foreign keys instead of a generic `entity_id`, and calculated progress instead of a stored percentage).
2. **Made decisions explicitly and logged them.** Every choice was written down with its reason as I went: roles, instructor approval, soft delete, session auth, and the visual design. That log is the basis of this document.
3. **Built from the data outwards, in small committed steps.** First the custom user and email login (before the first migration), then the models and constraints, the quiz marking, the API with permissions, the admin, the tests and the demo data. After that came the frontend and the extras.
4. **Treated accessibility as a requirement, not a polish step.** It was set as a baseline on day one and checked on every screen: keyboard-only use, screen-reader semantics, contrast, and reflow at 400px and 200% zoom.
5. **Chose the frontend by trying it.** I built login and sign-up in Django templates first, compared them, and moved to React with a REST API for a better experience. The API contract (`API.md`) was written first, so the backend and frontend could be built in parallel and fit together.
6. **Iterated on the UI from hands-on testing.** I tested every role end to end and fed back concrete fixes:
   - lesson actions fixed in place
   - fixed-height editors
   - calmer form fields
   - a course outline beside lessons, with only the lesson text scrolling
   - dashboards as the home page
   - tables that never scroll sideways
   - a sidebar that stays put

   The visual direction came from a reference design and a black, white and sage palette, with every colour checked for contrast.
7. **Verified rather than assumed.** I tested in a real browser at several screen sizes, checked the README setup on a fresh clone, made tests fail without the fix they cover, and ran a production-like local run (debug off, Gunicorn, collected static files) before deploying.
8. **Deployed and debugged in production.** The backend is on Render and the frontend on Vercel. I fixed issues from the live logs, including environment configuration, allowed hosts and origins, and a build that was missing its API URL.

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
- **"Build your quiz": an AI quiz generator for instructors.** It would draft multiple-choice questions from the course's own lesson content. It fits the current design cleanly:
  - **Draft, never publish.** The instructor clicks "Generate questions" in the quiz builder, and the drafts load into the existing editor to review, edit or discard. Nothing reaches learners until the instructor saves, so a human checks every question. That matters for legal content, where a wrong "correct answer" teaches the wrong procedure.
  - **Same rules as hand-written questions.** Drafts go through the same `PUT /api/courses/{id}/quiz/` validation: at least two choices, and exactly one correct answer, backed by the database constraint. A malformed AI response can't produce an invalid quiz.
  - **Grounded in the course.** The prompt includes only that course's lessons and asks for questions answerable from them, each linked to the lesson it came from, so the instructor can check the source quickly.
  - **Server-side and owner-only.** A new endpoint (e.g. `POST /api/courses/{id}/quiz/generate/`) would call the model from Django. That keeps the API key out of the browser and reuses `get_owned_course`, so only the course's instructor can generate for it.
  - **Open points before building:** whether course content may be sent to an external AI provider (a policy and privacy decision for the organisation), and cost and rate limits per instructor.
- **Frontend tests** (React Testing Library with axe accessibility checks). The backend has 42 tests.
- Stretch goals: lesson locking, certificates, CSV export, English and Malayalam, and Docker.
- **Rate limiting on login** (DRF throttling), plus email verification and password reset.
- **PostgreSQL in production.** SQLite on the free host resets when the server restarts. The start command re-creates the demo accounts, but anything else is lost. Switching only changes `DATABASES`.
- **Versioned quizzes.** Editing a quiz replaces its questions, so past attempts keep their scores but lose the per-question detail.
- **Scaling the dashboard query.** It's a single query today. For very large courses, its joined counts would become per-column subqueries to avoid multiplying rows.

