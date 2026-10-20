import { Alert, Container, Text } from '@mantine/core'
import { Route, Routes } from 'react-router-dom'

import { useAuth } from './auth/context.js'
import { GuestOnly, HomeRedirect, RequireAuth, RequireRole } from './auth/guards.jsx'
import { AppLayout, AuthLayout } from './components/Layout.jsx'
import { Loading } from './components/States.jsx'
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage.jsx'
import { AdminInstructorsPage } from './pages/admin/AdminInstructorsPage.jsx'
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage.jsx'
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx'
import { LoginPage } from './pages/auth/LoginPage.jsx'
import { PendingPage } from './pages/auth/PendingPage.jsx'
import { SignupPage } from './pages/auth/SignupPage.jsx'
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx'
import { CourseFormPage } from './pages/instructor/CourseFormPage.jsx'
import { LessonFormPage } from './pages/instructor/LessonFormPage.jsx'
import { ManageCoursePage } from './pages/instructor/ManageCoursePage.jsx'
import { QuizBuilderPage } from './pages/instructor/QuizBuilderPage.jsx'
import { TeachCoursesPage } from './pages/instructor/TeachCoursesPage.jsx'
import { CatalogPage } from './pages/learner/CatalogPage.jsx'
import { CourseDetailPage } from './pages/learner/CourseDetailPage.jsx'
import { LessonPage } from './pages/learner/LessonPage.jsx'
import { MyCoursesPage } from './pages/learner/MyCoursesPage.jsx'
import { QuizPage } from './pages/learner/QuizPage.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'

export default function App() {
  const { ready, startupError } = useAuth()

  if (!ready) return <Loading label="Starting…" />
  if (startupError) {
    return (
      <Container size="sm" py="xl">
        <Alert color="danger" title="The app could not start">
          <Text>{startupError.message}</Text>
          <Text size="sm" mt="xs">
            Make sure the Django server is running on port 8000, then reload this page.
          </Text>
        </Alert>
      </Container>
    )
  }

  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>
      </Route>

      <Route element={<AppLayout />}>
        <Route index element={<HomeRedirect />} />

        <Route element={<RequireAuth />}>
          <Route path="pending" element={<PendingPage />} />

          <Route element={<RequireRole roles={['learner', 'instructor', 'admin']} />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route element={<RequireRole roles={['learner', 'instructor']} />}>
            <Route path="dashboard" element={<DashboardPage />} />
            {/* Instructors can preview their own lessons here too. */}
            <Route path="lessons/:lessonId" element={<LessonPage />} />
          </Route>

          {/* /manage, not /admin: Vite proxies /admin to the Django admin. */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="manage" element={<AdminOverviewPage />} />
            <Route path="manage/instructors" element={<AdminInstructorsPage />} />
            <Route path="manage/users" element={<AdminUsersPage />} />
            <Route path="manage/courses" element={<AdminCoursesPage />} />
          </Route>

          <Route element={<RequireRole roles={['learner']} />}>
            <Route path="courses" element={<CatalogPage />} />
            <Route path="courses/:courseId" element={<CourseDetailPage />} />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="quizzes/:quizId" element={<QuizPage />} />
          </Route>

          <Route element={<RequireRole roles={['instructor']} />}>
            <Route path="teach" element={<TeachCoursesPage />} />
            <Route path="teach/courses/new" element={<CourseFormPage />} />
            <Route path="teach/courses/:courseId/edit" element={<CourseFormPage />} />
            <Route path="teach/courses/:courseId/quiz/edit" element={<QuizBuilderPage />} />
            <Route path="teach/courses/:courseId/lessons/new" element={<LessonFormPage />} />
            <Route path="teach/lessons/:lessonId/edit" element={<LessonFormPage />} />
            {/* Overview, lessons, quiz and learners tabs: one page, one URL per tab.
                Static paths above (edit, new) win over this dynamic one. */}
            <Route path="teach/courses/:courseId/:tab?" element={<ManageCoursePage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
