import { Anchor, Box, Button, Card, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCircle, IconCircleCheck, IconUser } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { BackLink } from '../../components/BackLink.jsx'
import { EnrolledBadge, ResultBadge } from '../../components/Badges.jsx'
import { Page } from '../../components/Page.jsx'
import { ProgressSummary } from '../../components/ProgressSummary.jsx'
import { Async } from '../../components/States.jsx'
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

  async function handleEnrol() {
    setEnrolling(true)
    try {
      const updated = await api.post(`/courses/${course.id}/enroll/`)
      onChange(updated)
      notifications.show({ color: 'green', message: `You are now enrolled in “${course.title}”.` })
    } catch (error) {
      notifications.show({ color: 'red', title: 'Could not enrol', message: error.message })
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <Page title={course.title} actions={enrollment && <EnrolledBadge />}>
      <BackLink to="/courses">All courses</BackLink>

      <Group gap={6} c="dimmed">
        <IconUser size={18} aria-hidden="true" />
        <Text>Taught by {course.instructor_name}</Text>
      </Group>
      <Text className="pre-wrap">{course.description}</Text>

      {enrollment ? (
        <Paper withBorder p="lg" radius="md">
          <Stack gap="xs">
            <Title order={2} size="h4">
              Your progress
            </Title>
            <ProgressSummary
              completed={enrollment.completed_count}
              total={enrollment.total_lessons}
              percent={enrollment.progress_percent}
            />
          </Stack>
        </Paper>
      ) : (
        <Paper withBorder p="lg" radius="md" bg="court.0">
          <Group justify="space-between" wrap="wrap" gap="md">
            <Text fw={500}>Enrol to open the lessons, track your progress and take the quiz.</Text>
            <Button onClick={handleEnrol} loading={enrolling}>
              Enrol in this course
            </Button>
          </Group>
        </Paper>
      )}

      <LessonList lessons={course.lessons} enrolled={Boolean(enrollment)} />
      <QuizCard course={course} enrollment={enrollment} />
    </Page>
  )
}

function LessonList({ lessons, enrolled }) {
  return (
    <Stack gap="sm" component="section" aria-labelledby="lessons-heading">
      <Title order={2} id="lessons-heading">
        Lessons
      </Title>
      {lessons.length === 0 ? (
        <Text c="dimmed">This course has no lessons yet.</Text>
      ) : (
        <Box component="ol" className="lesson-list">
          {lessons.map((lesson) => (
            <Box component="li" key={lesson.id} mb="xs">
              <Card withBorder radius="md" padding="md">
                <Group gap="md" wrap="nowrap">
                  <ThemeIcon
                    variant="light"
                    color={lesson.is_completed ? 'green.9' : 'gray.6'}
                    radius="xl"
                    size="lg"
                    aria-hidden="true"
                  >
                    {lesson.is_completed ? <IconCircleCheck size={20} /> : <IconCircle size={20} />}
                  </ThemeIcon>
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Text size="sm" c="dimmed">
                      Lesson {lesson.order}
                    </Text>
                    {enrolled ? (
                      <Anchor component={Link} to={`/lessons/${lesson.id}`} fw={600}>
                        {lesson.title}
                      </Anchor>
                    ) : (
                      <Text fw={600}>{lesson.title}</Text>
                    )}
                  </Stack>
                  {lesson.is_completed && (
                    <Text size="sm" fw={600} c="green.9">
                      Completed
                    </Text>
                  )}
                </Group>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  )
}

function QuizCard({ course, enrollment }) {
  const quiz = course.quiz
  return (
    <Stack gap="sm" component="section" aria-labelledby="quiz-heading">
      <Title order={2} id="quiz-heading">
        Quiz
      </Title>
      {!quiz ? (
        <Text c="dimmed">This course does not have a quiz yet.</Text>
      ) : (
        <Card withBorder radius="md" padding="lg">
          <Stack gap="sm">
            <Group justify="space-between" wrap="wrap">
              <Title order={3} size="h4">
                {quiz.title}
              </Title>
              {enrollment && <ResultBadge passed={enrollment.best_percentage === null ? null : enrollment.passed} />}
            </Group>
            <Text>
              {quiz.question_count} {quiz.question_count === 1 ? 'question' : 'questions'}. You need {quiz.pass_mark}% to
              pass.
            </Text>
            {enrollment ? (
              <>
                {enrollment.best_percentage !== null && (
                  <Text fw={600}>Your best score so far: {enrollment.best_percentage}%</Text>
                )}
                <Group>
                  <Button component={Link} to={`/quizzes/${quiz.id}`}>
                    {enrollment.best_percentage === null ? 'Take the quiz' : 'Take the quiz again'}
                  </Button>
                </Group>
              </>
            ) : (
              <Text c="dimmed">Enrol in this course to take the quiz.</Text>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
