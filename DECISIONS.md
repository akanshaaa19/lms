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
| Q5 | Scores are stored even though progress is calculated (compare E3). | An attempt is a historical record: editing the quiz later must not change a past score. |
