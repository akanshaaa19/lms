import { Alert, Anchor, Box, Button, Card, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconEye, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { BackLink } from '../../components/BackLink.jsx'
import { StatusBadge } from '../../components/Badges.jsx'
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'

export function ManageCoursePage() {
  const { courseId } = useParams()
  const query = useApiData(`/courses/${courseId}/`)
  return (
    <Async query={query} backTo="/teach" backLabel="Your courses">
      {(course) => <ManageCourse course={course} onChange={query.setData} reload={query.reload} />}
    </Async>
  )
}

function ManageCourse({ course, onChange, reload }) {
  const [publishing, setPublishing] = useState(false)
  const isPublished = course.status === 'published'

  async function togglePublished() {
    setPublishing(true)
    try {
      const updated = await api.patch(`/courses/${course.id}/`, { status: isPublished ? 'draft' : 'published' })
      onChange(updated)
      notifications.show({
        color: 'green',
        message: isPublished ? 'Course moved back to draft. Learners can no longer see it.' : 'Course published.',
      })
    } catch (error) {
      notifications.show({ color: 'red', title: 'Could not change the status', message: error.message })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Page
      title={course.title}
      actions={
        <Group gap="sm">
          <Button component={Link} to={`/teach/courses/${course.id}/edit`} variant="default" leftSection={<IconEdit size={18} aria-hidden="true" />}>
            Edit details
          </Button>
          <Button component={Link} to={`/teach/courses/${course.id}/learners`} leftSection={<IconUsers size={18} aria-hidden="true" />}>
            View learners
          </Button>
        </Group>
      }
    >
      <BackLink to="/teach">Your courses</BackLink>

      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Stack gap={4}>
            <Group gap="sm">
              <Text fw={600}>Status:</Text>
              <StatusBadge status={course.status} />
            </Group>
            <Text size="sm" c="dimmed">
              {isPublished ? 'Learners can find this course and enrol.' : 'Only you can see this course.'}
            </Text>
          </Stack>
          <Button onClick={togglePublished} loading={publishing} variant={isPublished ? 'default' : 'filled'}>
            {isPublished ? 'Move back to draft' : 'Publish course'}
          </Button>
        </Group>
      </Paper>

      <Text className="pre-wrap">{course.description}</Text>

      <LessonsSection course={course} reload={reload} />
      <QuizSection course={course} />
      <DeleteSection course={course} />
    </Page>
  )
}

function LessonsSection({ course, reload }) {
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    setDeleting(true)
    try {
      await api.delete(`/lessons/${toDelete.id}/`)
      notifications.show({ message: `Lesson “${toDelete.title}” deleted.` })
      setToDelete(null)
      reload()
    } catch (error) {
      notifications.show({ color: 'red', title: 'Could not delete the lesson', message: error.message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Stack gap="sm" component="section" aria-labelledby="lessons-heading">
      <Group justify="space-between" wrap="wrap">
        <Title order={2} id="lessons-heading">
          Lessons
        </Title>
        <Button component={Link} to={`/teach/courses/${course.id}/lessons/new`} leftSection={<IconPlus size={18} aria-hidden="true" />}>
          Add lesson
        </Button>
      </Group>
      {course.lessons.length === 0 ? (
        <Text c="dimmed">No lessons yet. Add the first one.</Text>
      ) : (
        <Box component="ol" className="lesson-list">
          {course.lessons.map((lesson) => (
            <Box component="li" key={lesson.id} mb="xs">
              <Card withBorder radius="md" padding="md">
                <Group justify="space-between" wrap="wrap" gap="sm">
                  <Stack gap={0}>
                    <Text size="sm" c="dimmed">
                      Lesson {lesson.order}
                    </Text>
                    <Text fw={600}>{lesson.title}</Text>
                  </Stack>
                  <Group gap="xs">
                    {/* Hidden text gives each button a unique name, e.g.
                        "Edit Filing a new case", not just "Edit". */}
                    <Button component={Link} to={`/lessons/${lesson.id}`} variant="subtle" size="sm" leftSection={<IconEye size={16} aria-hidden="true" />}>
                      Preview<span className="visually-hidden"> {lesson.title}</span>
                    </Button>
                    <Button component={Link} to={`/teach/lessons/${lesson.id}/edit`} variant="subtle" size="sm" leftSection={<IconEdit size={16} aria-hidden="true" />}>
                      Edit<span className="visually-hidden"> {lesson.title}</span>
                    </Button>
                    <Button variant="subtle" color="red.8" size="sm" onClick={() => setToDelete(lesson)} leftSection={<IconTrash size={16} aria-hidden="true" />}>
                      Delete<span className="visually-hidden"> {lesson.title}</span>
                    </Button>
                  </Group>
                </Group>
              </Card>
            </Box>
          ))}
        </Box>
      )}
      <ConfirmDialog
        opened={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this lesson?"
        confirmLabel="Delete lesson"
        onConfirm={confirmDelete}
        loading={deleting}
        danger
      >
        <Text>
          “{toDelete?.title}” will be removed. Learners who completed it will no longer have it counted in their progress.
        </Text>
      </ConfirmDialog>
    </Stack>
  )
}

function QuizSection({ course }) {
  const quiz = course.quiz
  return (
    <Stack gap="sm" component="section" aria-labelledby="quiz-heading">
      <Title order={2} id="quiz-heading">
        Quiz
      </Title>
      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" wrap="wrap" gap="md">
          {quiz ? (
            <Stack gap={2}>
              <Text fw={600}>{quiz.title}</Text>
              <Text size="sm" c="dimmed">
                {quiz.question_count} {quiz.question_count === 1 ? 'question' : 'questions'} · Pass mark {quiz.pass_mark}%
              </Text>
            </Stack>
          ) : (
            <Text>This course has no quiz yet.</Text>
          )}
          <Button component={Link} to={`/teach/courses/${course.id}/quiz`} variant={quiz ? 'default' : 'filled'}>
            {quiz ? 'Edit quiz' : 'Create quiz'}
          </Button>
        </Group>
      </Card>
    </Stack>
  )
}

function DeleteSection({ course }) {
  const navigate = useNavigate()
  const [opened, setOpened] = useState(false)
  const [reason, setReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    setDeleting(true)
    try {
      await api.delete(`/courses/${course.id}/`, { reason })
      notifications.show({ message: `Course “${course.title}” deleted.` })
      navigate('/teach')
    } catch (error) {
      notifications.show({ color: 'red', title: 'Could not delete the course', message: error.message })
      setDeleting(false)
    }
  }

  return (
    <Stack gap="sm" component="section" aria-labelledby="delete-heading">
      <Title order={2} id="delete-heading">
        Delete course
      </Title>
      <Alert color="red.8" variant="outline">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Text size="sm" c="dark">
            Use this when the content is out of date, for example after a change in the rules.
          </Text>
          <Button color="red.8" onClick={() => setOpened(true)} leftSection={<IconTrash size={18} aria-hidden="true" />}>
            Delete course
          </Button>
        </Group>
      </Alert>
      <ConfirmDialog
        opened={opened}
        onClose={() => setOpened(false)}
        title="Delete this course?"
        confirmLabel="Delete course"
        onConfirm={confirmDelete}
        loading={deleting}
        danger
      >
        <Text>
          “{course.title}” will be removed from the catalogue and from your courses. Learners who enrolled keep their
          record of progress and quiz scores, but can no longer open the lessons or quiz.
        </Text>
        <TextInput
          id="delete-reason"
          label="Reason (optional)"
          description="Learners will see this, for example: Replaced by the 2026 e-filing rules."
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
        />
        <Text size="sm">
          Need to keep it but hide it? <Anchor component={Link} to={`/teach/courses/${course.id}/edit`}>Move it back to draft</Anchor> instead.
        </Text>
      </ConfirmDialog>
    </Stack>
  )
}
