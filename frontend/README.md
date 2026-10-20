# Frontend (React)

React + Vite + Mantine app for Court Staff Learning. It talks to the Django API described in `../API.md`.

## Run in development

1. Start Django on port 8000 from the project root: `python manage.py runserver`
2. In this folder:

```
npm install
npm run dev
```

3. Open http://localhost:5173

Vite forwards `/api`, `/admin` and `/static` to Django, so the browser sees one origin and the session cookie and CSRF token work without any CORS setup.

## Structure

- `src/api.js`: fetch wrapper (session cookie, CSRF header, error handling)
- `src/auth/`: who is logged in, and route guards
- `src/components/`: layout, page wrapper (title and focus management), error summary, badges, progress
- `src/hooks/`: `useApiData` (load data with loading and error states), `useFormSubmit` (forms with server errors)
- `src/pages/auth`, `src/pages/learner`, `src/pages/instructor`: one file per page
