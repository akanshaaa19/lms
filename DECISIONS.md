# Decision log

Every design decision we make, why we made it, and what we gave up. This feeds into NOTES.md at the end.

**Deadline:** 3 pm IST, Tuesday 20 October 2026 (extended from 12 pm).

## Process

| # | Decision | Why |
|---|----------|-----|
| P1 | Build in small steps: models → admin → views/URLs/templates → forms → tests. Commit after each step. | The brief asks for commits as we go, and small steps make each part easy to explain. |
| P2 | Claude writes and explains each step. Akansha runs the commands, checks the app and asks questions before we move on. | Akansha is new to Django and must explain and extend the code in the pair-coding round. |
| P3 | Prefer explicit, readable code over clever Django shortcuts. | Every line has to be explainable in the interview. |
| P4 | Accessibility is a baseline, not a stretch goal: real labels, keyboard support, contrast, clear messages after actions. | The team works in accessible design; all staff must be able to use the app. |
| P5 | SQLite database (`db.sqlite3`, not committed). Django 5.2 LTS. | Zero setup for reviewers, and the brief allows it. It supports every constraint we need. For a real deployment we'd switch to PostgreSQL by changing only `DATABASES`. |

## Scope

| # | Decision | Why |
|---|----------|-----|
| S1 | Core requirements R1–R9 come first and must work properly, with tests. | The brief prefers fewer features done properly over many half done. |
| S2 | Lesson comments/doubts only after R1–R9 and the tests pass. | Not in the brief. Useful, but lower priority. |
| S3 | The "ask me anything" bot is cut. It goes under "with more time" in NOTES.md. | Not in the brief, and too large for the time we have. |
| S4 | The profile page is in, kept small (edit name and profile fields). | Cheap, and it gives the profile fields a purpose. |

## Accounts and roles

| # | Decision | Why |
|---|----------|-----|
| A1 | Custom `User` model (subclass of `AbstractUser`) from the very first migration. | Django recommends this: the user model is very hard to swap later. |
| A2 | Log in with email, not username (`USERNAME_FIELD = "email"`). Email is unique. | Matches the original notes (name, email, password). Staff have one less thing to remember. |
| A3 | Roles use separate profile tables: `InstructorProfile` and `LearnerProfile`, each one-to-one with `User`. | Lets foreign keys point at a profile, so the database guarantees only instructors own courses and only learners enrol. |
| A4 | Rejected: a `user_type` + generic `entity_id` column. | A generic ID can't be a real foreign key, so the database can't enforce it. |
| A5 | One role per user (keep it simple). A user has exactly one profile, enforced in the sign-up form and in the admin. | Simplest to build and explain. Trade-off: a person who wants both roles needs two accounts. |
| A6 | Instructors need admin approval. The sign-up form has an optional "I want to teach courses (needs admin approval)" box, which creates an `InstructorProfile` with `is_approved=False`. | An internal legal tool shouldn't let anyone publish training. |
| A7 | A pending instructor sees only a page saying "Your instructor request is pending" until an admin approves them. | People must never be left guessing about their account's state. |
| A8 | Profile fields: `InstructorProfile` has `bio`, `is_approved`, `approved_at`. `LearnerProfile` has `designation`, `department`. | The tables hold real data, and the instructor dashboard can show who each learner is. |
| A9 | The sign-up role choice is a labelled control, never an ambiguous checkbox pair. | Accessibility: screen readers must announce the choice clearly. |

## Courses and content

| # | Decision | Why |
|---|----------|-----|
| C1 | `Course.instructor` is a foreign key to `InstructorProfile`. `Course.status` is draft or published, defaulting to draft. | Database-level ownership. Nothing goes live by accident. |
| C2 | `Lesson.order` is a positive integer, unique within its course, and lessons are ordered by it by default. | R2 requires lessons in a set order. The constraint stops two lessons sharing a position. |
| C3 | Soft delete for courses: `deleted_at` (empty while live) and an optional `deletion_reason`. Nothing is removed from the database. | Legal content goes out of date, so it must be removable, but training records must survive. |
| C4 | A learner enrolled in a deleted course still sees it on "My courses", marked "Removed by the instructor on DATE", with the reason, their progress and their best score. Lessons and the quiz are locked, and their URLs show an explanation page. | The record of training stays, and out-of-date legal content can't be used. |
| C5 | Deleted courses are hidden from the catalogue and the instructor's views. Admins can restore them in the Django admin. | Removal is reversible. |
| C7 | `on_delete=PROTECT` on `Course.instructor` and `Enrollment.course`. Lessons use `CASCADE` (they belong to their course). | A hard delete in the admin can't silently wipe learners' training records. Soft delete is the normal path. |
| C8 | Role checks live on `User` as properties: `is_learner`, `is_instructor` (approved only), `is_pending_instructor`. | One place to ask "what can this person do?", reused by views and templates. |
| C6 | Deleted courses are filtered out with an explicit `Course.objects.active()` in each view, not by overriding the default manager. | Easier to see in the code and to explain. Overriding the default manager has subtle side effects. |

## Enrolment and progress

| # | Decision | Why |
|---|----------|-----|
| E1 | `Enrollment` links a `LearnerProfile` to a `Course`, unique per pair. | A learner can't enrol in the same course twice. |
| E2 | `LessonCompletion` links an `Enrollment` to a `Lesson`, unique per pair. The lesson must belong to the enrolment's course, checked in `clean()`. | You can't complete a lesson without being enrolled. |
| E3 | Progress is always calculated (completions ÷ lessons) and never stored. | A stored percentage goes wrong as soon as lessons are added or removed. |

## Quizzes

| # | Decision | Why |
|---|----------|-----|
| Q1 | One quiz per course (one-to-one), with a `pass_mark` from 0 to 100, defaulting to 70. | Matches R5, which says "a quiz" at the end of a course. |
| Q2 | `Question` → `Choice`, with a partial unique constraint: at most one `is_correct=True` per question. "At least one" is checked in the form. | The database enforces "one correct answer" from R5. |
| Q3 | `QuizAttempt` is linked to an `Enrollment` and stores score, total, percentage, passed, and submission time. Every attempt is kept. | R5 says to save every attempt. Linking to an enrolment means only enrolled learners can have attempts (R7). |
| Q4 | `AttemptAnswer` records the choice selected for each question, unique per attempt and question. | Lets us show learners what they got wrong, and audit the marking. |
| Q6 | Marking lives in one function, `quizzes/grading.py: grade_quiz()`, not in a view. An unanswered question counts as wrong. A choice from a different question is rejected. The attempt and its answers save together inside a transaction. | Easy to test (R9). A tampered form can't score points. A half-saved attempt is impossible. |
| Q7 | `QuizAttempt.quiz` uses `PROTECT`: a quiz that has been attempted can't be deleted. Deleting a question removes its `AttemptAnswer` rows, but the stored score stays. | Keeps results as a record while still letting instructors fix questions. |
| Q5 | Scores are stored even though progress is calculated (compare E3). | An attempt is a historical record: editing the quiz later must not change a past score. |

## Frontend and API

| # | Decision | Why |
|---|----------|-----|
| F1 | React (Vite, plain JavaScript, Mantine components) in `frontend/`, calling a Django REST Framework API. Django templates were tried first and rejected. | The user wanted a better UI than plain templates. Mantine gives accessible, polished components quickly. |
| F2 | Session-cookie login with CSRF, not tokens. React fetches `/api/auth/csrf/` and sends `X-CSRFToken` on every change. | The session cookie is `HttpOnly`, so an XSS bug can't steal it. This is Django's own login and CSRF protection, used as intended. |
| F3 | Sign-up and login views add `csrf_protect` explicitly. | DRF only checks CSRF for logged-in sessions. Without this, another site could log a visitor into an attacker's account (login CSRF). Tested. |
| F4 | Vite's dev server proxies `/api` and `/admin` to Django. | One origin in the browser, so no CORS setup and the cookies just work. |
| F5 | API is locked by default (`IsAuthenticated`), and only csrf, me, signup and login are opened explicitly. | Forgetting a permission fails safe. |
| F6 | Ownership is enforced by looking objects up in the user's own queryset (`courses/access.py`). Another instructor's course, or a draft or deleted course for a learner, returns 404, not 403. | The API never confirms that a hidden course exists, which is what "even by guessing the URL" (R7) requires. |
| F7 | Not enrolled returns 403 with a readable message ("Enrol in this course…"). | The learner can see the course, so explaining what to do is more useful than pretending it doesn't exist. |
| F8 | Login failure gives one message for a wrong email or a wrong password. | Doesn't reveal which emails have accounts. |
| F9 | The quiz-taking API never sends `is_correct`. Correct answers are shown only in the result, after submitting. | Can't cheat by reading the API response. Seeing corrections after an attempt is how people learn. |
| F10 | Progress and best scores come from one annotated query, `Enrollment.objects.with_progress()`. | The dashboard is one query, not one per learner. Still calculated, never stored (E3). |
| F11 | The quiz builder saves the whole quiz in one `PUT` and replaces the questions inside a transaction. | Simpler for the instructor UI and the code. Past attempts keep their stored scores (Q7). |

## Delivery

| # | Decision | Why |
|---|----------|-----|
| D1 | `python manage.py seed_demo` creates an admin, an approved instructor, two learners, one published course (4 lessons, 4-question quiz) and one draft course. Asha has partial progress and a failed attempt, and Ravi hasn't enrolled. It's safe to run again. | The demo shows every state: progress, a failed attempt, an unenrolled learner and a hidden draft. |
| D2 | Tests use DRF's `APIClient` against real endpoints, plus direct tests of `grade_quiz()` and the database constraint. | Tests permissions where they're actually enforced, on the server. |

## Visual design

| # | Decision | Why |
|---|----------|-----|
| V1 | Layout follows the user's reference (a modern LMS dashboard): sidebar navigation, a large page title with tabs, a KPI row with rings, and a learners table with avatars, status and progress rings. | The user asked for a modern UI rather than a skeleton. |
| V2 | Every sidebar item keeps a visible text label. No icon-only rail. | Icon-only navigation is harder to understand and to use. |
| V3 | Palette is black and white with a sage-green accent. Ink `#111111` for text and primary buttons. Sage (`#9CAF88` / `#7D9471`) for decoration only: rings, pills, tiles. Dark sage `#4F6B47` (6.0:1) where sage carries text. | White text on sage is only 2.4:1, which fails AA. So the accent decorates, and the ink and dark sage carry meaning. |
| V4 | Status is always a dot plus a text label. Rings always show a number. Content types are told apart by icon, not colour. | Colour is never the only signal. |
| V5 | Every colour token lives in `frontend/src/theme.js`. | A palette change touches one file. |
