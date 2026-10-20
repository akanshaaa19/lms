import { Anchor, Button, Grid, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconListCheck, IconLock } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { EnrolledBadge, ResultBadge } from '../../components/Badges.jsx'
import { IconTile } from '../../components/IconTile.jsx'
import { Page } from '../../components/Page.jsx'
import { ProgressSummary } from '../../components/ProgressSummary.jsx'
import { Async } from '../../components/States.jsx'
import { UserAvatar } from '../../components/UserAvatar.jsx'
import { useApiData } from '../../hooks/useApiData.js'

export function CourseDetailPage() {
  const { courseId } = useParams()
  const query = useApiData(`/courses/${courseId}/`)
  return (
    <Async query={query} backTo="/courses" backLabel="Browse courses">
      {(course) => <CourseDetail course={course} onChange={query.setData} />}
    </Async>
  )
}

function CourseDetail({ course, onChange }) {
  const [enrolling, setEnrolling] = useState(false)
  const enrollment = course.enrollment
  // "Continue" opens the first lesson not yet completed.
  const nextLesson = course.lessons.find((l) => !l.is_completed) ?? course.lessons[0]

  async function handleEnrol() {
    setEnrolling(true)
    try {
      const updated = await api.post(`/courses/${course.id}/enroll/`)
      onChange(updated)
      notifications.show({ message: `You are now enrolled in “${course.title}”.` })
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not enrol', message: error.message })
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <Page
      title={course.title}
      breadcrumbs={[{ label: 'Browse courses', to: '/courses' }, { label: course.title }]}
      actions={enrollment && <EnrolledBadge />}
    >
      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
          <Stack gap="xl">
            <Stack gap="md">
              <Group gap="sm">
                <UserAvatar name={course.instructor_name} size={32} />
                <Text fw={500}>Taught by {course.instructor_name}</Text>
              </Group>
              <Text className="pre-wrap" fz="md" lh={1.7}>
                {course.description}
              </Text>
            </Stack>
            <LessonList lessons={course.lessons} enrolled={Boolean(enrollment)} />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
          <Stack gap="lg">
            <Paper withBorder radius="lg" p="lg" shadow="xs">
              {enrollment ? (
                <Stack gap="md">
                  <Title order={2} size="h3">
                    Your progress
                  </Title>
                  <ProgressSummary
                    completed={enrollment.completed_count}
                    total={enrollment.total_lessons}
                    percent={enrollment.progress_percent}
                    size={72}
                  />
                  {nextLesson && (
                    <Button component={Link} to={`/lessons/${nextLesson.id}`} fullWidth>
                      {enrollment.completed_count === 0
                        ? 'Start the first lesson'
                        : enrollment.completed_count >= enrollment.total_lessons
                          ? 'Review the lessons'
                          : 'Continue learning'}
                    </Button>
                  )}
                </Stack>
              ) : (
                <Stack gap="md">
                  <Title order={2} size="h3">
                    Join this course
                  </Title>
                  <Text c="dimmed">Enrol to open the lessons, track your progress and take the quiz.</Text>
                  <Button onClick={handleEnrol} loading={enrolling} fullWidth>
                    Enrol in this course
                  </Button>
                </Stack>
              )}
            </Paper>
            <QuizCard course={course} enrollment={enrollment} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Page>
  )
}

function LessonList({ lessons, enrolled }) {
  const done = lessons.filter((l) => l.is_completed).length
  return (
    <Stack gap="sm" component="section" aria-labelledby="lessons-heading">
      <Group justify="space-between">
        <Title order={2} id="lessons-heading">
          Lessons
        </Title>
        {enrolled && (
          <Text size="sm" c="dimmed" fw={500}>
            {done} of {lessons.length} done
          </Text>
        )}
      </Group>
      {lessons.length === 0 ? (
        <Text c="dimmed">This course has no lessons yet.</Text>
      ) : (
        <div className="surface-card">
          <ol className="lesson-list">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="lesson-row">
                <span className="lesson-number" data-done={lesson.is_completed} aria-hidden="true">
                  {lesson.is_completed ? <IconCheck size={16} stroke={2.5} /> : lesson.order}
                </span>
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                  {enrolled ? (
                    <Anchor component={Link} to={`/lessons/${lesson.id}`} fw={600} c="var(--lms-ink)" underline="hover">
                      Lesson {lesson.order}: {lesson.title}
                    </Anchor>
                  ) : (
                    <Text fw={600}>
                      Lesson {lesson.order}: {lesson.title}
                    </Text>
                  )}
                </Stack>
                {lesson.is_completed ? (
                  <Text size="sm" fw={600} c="var(--lms-success)">
                    Completed
                  </Text>
                ) : (
                  !enrolled && (
                    <IconLock size={18} color="var(--lms-muted)" aria-label="Locked until you enrol" role="img" />
                  )
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </Stack>
  )
}

function QuizCard({ course, enrollment }) {
  const quiz = course.quiz
  if (!quiz) {
    return (
      <Paper withBorder radius="lg" p="lg">
        <Text c="dimmed">This course does not have a quiz yet.</Text>
      </Paper>
    )
  }
  const attempted = enrollment && enrollment.best_percentage !== null
  return (
    <Paper withBorder radius="lg" p="lg" component="section" aria-labelledby="quiz-heading">
      <Stack gap="md">
        <Group gap="sm" wrap="nowrap">
          <IconTile icon={IconListCheck} size={40} />
          <div>
            <Title order={2} size="h3" id="quiz-heading">
              {quiz.title}
            </Title>
            <Text size="sm" c="dimmed">
              {quiz.question_count} {quiz.question_count === 1 ? 'question' : 'questions'} · Pass mark {quiz.pass_mark}%
            </Text>
          </div>
        </Group>
        {attempted && (
          <Group justify="space-between">
            <Text fw={600}>Best score: {enrollment.best_percentage}%</Text>
            <ResultBadge passed={enrollment.passed} />
          </Group>
        )}
        {enrollment ? (
          <Button component={Link} to={`/quizzes/${quiz.id}`} variant={attempted ? 'default' : 'filled'} fullWidth>
            {attempted ? 'Take the quiz again' : 'Take the quiz'}
          </Button>
        ) : (
          <Text size="sm" c="dimmed">
            Enrol in this course to take the quiz.
          </Text>
        )}
      </Stack>
    </Paper>
  )
}
