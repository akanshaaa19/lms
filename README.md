# Court Staff Learning

A small learning management system for a legal services organisation. Instructors publish short courses made of ordered lessons, with a quiz at the end. Learners enrol, work through the lessons, track their progress and take the quiz. Instructors see how each learner is doing.

- **Backend:** Django 5.2 + Django REST Framework, SQLite
- **Frontend:** React + Vite + Mantine, in `frontend/`

See [NOTES.md](NOTES.md) for the design and data model, and [API.md](API.md) for the API.

## Requirements

- Python 3.12 or newer
- Node.js 20.19+ or 22.12+ (with npm)

## Setup

```bash
git clone https://github.com/akanshaaa19/lms.git
cd lms

# 1. Backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo         # demo users, a course with lessons and a quiz

# 2. Frontend
cd frontend
npm install
cd ..
```

## Run

You need two terminals.

```bash
# Terminal 1: Django API on http://127.0.0.1:8000
source .venv/bin/activate
python manage.py runserver
```

```bash
# Terminal 2: React app on http://localhost:5173
cd frontend
npm run dev
```

Open **http://localhost:5173**. The React app calls Django at the URL in `frontend/.env.development` (`VITE_API_URL=http://localhost:8000`). The Django admin is at http://localhost:8000/admin/.

## Demo accounts

Every account's password is **`Demo-pass-2026`**.

| Email | Role | Demo state |
|---|---|---|
| `admin@example.com` | Admin (Django admin) | Can approve instructors and restore removed courses |
| `instructor@example.com` | Instructor (Meera Nair) | Owns **E-filing for court clerks** (published, 4 lessons, 4-question quiz) and one **draft** course |
| `asha@example.com` | Learner (Asha Menon) | Enrolled, 2 of 4 lessons done, one failed quiz attempt (50%) |
| `ravi@example.com` | Learner (Ravi Kumar) | Not enrolled in anything yet |

Running `python manage.py seed_demo` again resets the demo data. Other data is left alone.

**To see instructor approval:** sign up as a new user and choose "An instructor". You'll see the pending screen. Log in to the admin as `admin@example.com`, go to **Instructor profiles**, select the user and run **Approve selected instructors**, then log in again as the new instructor.

## Deployment

The frontend and backend deploy separately.

**Django (e.g. Render, as a Python web service, with the repository root as its root):**

- Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
- Start command: `python manage.py migrate --noinput && python manage.py seed_demo && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- Environment variables:

| Variable | Value |
|---|---|
| `DJANGO_SECRET_KEY` | A long random string |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_ALLOWED_HOSTS` | The backend's host, e.g. `lms-api.onrender.com` |
| `DJANGO_FRONTEND_ORIGINS` | The frontend's URL, e.g. `https://lms.vercel.app` |
| `DJANGO_CROSS_SITE_COOKIES` | `true` when the frontend is on a different site from the backend |

SQLite lives on the server's disk. On hosts whose disk resets on restart, the start command re-creates the demo accounts each time.

**React (e.g. Vercel, with `frontend` as the root directory):** framework Vite, build `npm run build`, output `dist`. Set `VITE_API_URL` to the backend's URL. `frontend/vercel.json` sends every path to `index.html`, so pages like `/dashboard` load on refresh.

## Tests

```bash
source .venv/bin/activate
python manage.py test
```

The tests cover quiz marking, the permission rules in R7 (all through the real API), sign-up and login (including CSRF on login), enrolment, progress, soft delete and the instructor dashboard.

## Project layout

```
config/      settings and root URLs
accounts/    custom User (email login), learner and instructor profiles, auth API
courses/     courses, lessons, enrolments, progress; access rules (access.py); demo data command
quizzes/     quizzes, questions, choices, attempts; marking (grading.py)
frontend/    React app (src/api.js is the API client; src/theme.js holds all colours)
```
