# Notes

The reasoning behind the build. The full decision log, with a reason for each decision, is in [DECISIONS.md](DECISIONS.md), and the API contract is in [API.md](API.md).

## Tools and AI assistants

- **Claude Code (Claude Opus)** was my pair programmer for the whole build. I used it to:
  - question my first rough plan and data model before writing any code, e.g. replacing a `user_type` + `entity_id` design with real foreign keys, and storing progress events instead of a progress percentage
  - write the Django models, API, admin, tests and demo data step by step, with explanations of each Django concept, because I was new to Django
  - write the React frontend through a sub-agent working in parallel against a written API contract (`API.md`), which I then checked end to end through the dev proxy
  - keep `DECISIONS.md` up to date as we went
- **Django REST Framework** for the API. **React + Vite + Mantine** for the UI. **Inter** font via Fontsource.
- TODO (Akansha): confirm in your own words how you reviewed and tested the code, once you have.

## Architecture

```
React (Vite, :5173) --/api, /admin--> Django + DRF (:8000) --> SQLite
```

- **Django** owns all data, rules and permissions. **React** only displays and calls the API. Every R7 rule is enforced on the server and tested there.
- **Login is Django's session cookie plus CSRF**, not tokens. The cookie is `HttpOnly`, so JavaScript, and therefore an XSS bug, can't read it. React sends the CSRF token in a header on every change. Sign-up and login add `csrf_protect` explicitly, because DRF only checks CSRF for sessions that are already logged in.
- **Vite proxies `/api` to Django in development**, so the browser sees one origin and there's no CORS setup.

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

- **Roles are profile tables, not a `role` string.** `Course.instructor` points at `InstructorProfile` and `Enrollment.learner` at `LearnerProfile`, so the database guarantees only instructors own courses and only learners enrol. Each user has one role, checked in `clean()` and at sign-up.
- **Instructors need admin approval.** Sign-up offers "I want to teach (needs approval)". The account waits on a pending screen until an admin uses the "Approve selected instructors" action.
- **Completions hang off `Enrollment`, not the user**, so you can't complete a lesson in a course you aren't enrolled in.
- **Progress is calculated, never stored** (completions ÷ lessons). A stored percentage would be wrong as soon as an instructor added a lesson. The instructor dashboard gets every learner's progress and best score in one annotated query (`Enrollment.objects.with_progress()`).
- **Quiz scores are stored, unlike progress.** An attempt is a historical record: editing the quiz later must not change a past score. Every attempt and every answer is kept.
- **"One correct answer"** is a partial unique constraint in the database (at most one), plus form and serializer validation (at least one).
- **Courses are soft-deleted.** Legal processes change, so instructors need to be able to remove out-of-date content. But who trained on what is a record worth keeping. A removed course disappears from the catalogue, and learners still see it in "My courses" as "Removed by the instructor on DATE" with the reason and their results, but the lessons and quiz are locked. Admins can restore it. `on_delete=PROTECT` stops a hard delete from wiping enrolments by accident.
- **Ownership is enforced by queryset, not by `if` checks.** Every view looks courses up through `courses/access.py` (e.g. `owned_courses(user)`, `catalogue_courses()`). Another instructor's course, or a draft for a learner, therefore returns **404**: the API never confirms that a hidden course exists, even if you guess the URL.
- **Marking is a plain function** (`quizzes/grading.py`), separate from the views. It rejects a choice that belongs to a different question, counts unanswered questions as wrong, and saves the attempt and its answers in one transaction.

## Accessibility

The organisation trains all of its staff, so the UI has to work for everyone:
- a skip link
- focus moves to the page heading on every navigation, and the page title updates
- visible labels on every field, with errors linked to their fields
- an error summary that takes focus
- radio groups inside fieldset and legend
- status never shown by colour alone, so every dot and ring has text
- AA contrast, including muted text
- a strong focus ring
- touch targets of at least 44px
- usable at 400px width and 200% zoom

## Assumptions and interpretations

- **One role per account.** Someone who both teaches and learns needs two accounts. It's the simplest model to explain, and the profile tables allow both roles later if needed.
- **One quiz per course**, taken at the end. Learners can retake it as often as they like, and the best score is what counts.
- **The pass mark is set per quiz**, defaulting to 70%. A score exactly at the pass mark passes.
- Correct answers are shown **after** submitting, never in the quiz itself. For training, seeing corrections is how people learn.
- A learner can open any lesson in any order. Lesson locking is a stretch goal I didn't build.

## What I left out, or would change with more time

- **Comments and questions on lessons**, and an **AI "ask me anything" assistant** about course content. Both were on my original wish list, but I chose to finish R1–R9 properly first.
- **Frontend tests** (React Testing Library plus axe accessibility checks). The backend has 32 tests.
- Stretch goals: lesson locking, certificates, CSV export, English and Malayalam, and Docker.
- **Rate limiting on login** (DRF throttling), and email verification and password reset.
- **Production setup**: PostgreSQL instead of SQLite (only `DATABASES` changes), environment-based settings and secret key, Django serving the built React app or a reverse proxy in front of both, and code splitting for the JavaScript bundle.
- Editing a quiz replaces its questions, so past attempts keep their scores but lose the per-question detail. A versioned quiz would keep both.

## Time spent

TODO (Akansha to fill in before submitting): total time, plus a rough split across planning and data model, backend and tests, frontend, and docs.
