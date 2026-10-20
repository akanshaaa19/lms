import { Alert, Anchor, Button, Group, Paper, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconArrowRight, IconCircleCheck, IconExternalLink, IconEye } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { useAuth } from '../../auth/context.js'
import { BackLink } from '../../components/BackLink.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'

export function LessonPage() {
  const { lessonId } = useParams()
  const query = useApiData(`/lessons/${lessonId}/`)
  return <Async query={query}>{(lesson) => <Lesson lesson={lesson} onChange={query.setData} />}</Async>
}

function Lesson({ lesson, onChange }) {
  const { user } = useAuth()
  const isInstructor = user.role === 'instructor'
  const courseLink = isInstructor ? `/teach/courses/${lesson.course_id}` : `/courses/${lesson.course_id}`
  const [saving, setSaving] = useState(false)

  async function markComplete() {
    setSaving(true)
    try {
      const updated = await api.post(`/lessons/${lesson.id}/complete/`)
      onChange(updated)
      notifications.show({ color: 'green', message: 'Lesson marked as complete.' })
    } catch (error) {
      notifications.show({ color: 'red', title: 'Could not save your progress', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page title={lesson.title}>
      <BackLink to={courseLink}>Back to {lesson.course_title}</BackLink>
      <Text c="dimmed">Lesson {lesson.order}</Text>

      {isInstructor && (
        <Alert color="court" variant="light" icon={<IconEye aria-hidden="true" />}>
          Preview: this is how learners see this lesson.
        </Alert>
      )}

      <Paper withBorder p="xl" radius="md">
        {/* Plain text with line breaks kept. We never inject HTML from the
            database, so lesson content can't run scripts. */}
        <Text className="pre-wrap">{lesson.content}</Text>
      </Paper>

      {lesson.video_url && (
        <Anchor href={lesson.video_url} target="_blank" rel="noopener noreferrer" fw={600}>
          <Group gap={6} component="span">
            Watch the video for this lesson (opens in a new tab)
            <IconExternalLink size={18} aria-hidden="true" />
          </Group>
        </Anchor>
      )}

      {!isInstructor &&
        (lesson.is_completed ? (
          // The completed state stays on the page, not only in a toast.
          <Alert color="green.9" variant="light" icon={<IconCircleCheck aria-hidden="true" />}>
            You have completed this lesson.
          </Alert>
        ) : (
          <Group>
            <Button onClick={markComplete} loading={saving} leftSection={<IconCircleCheck size={20} aria-hidden="true" />}>
              Mark as complete
            </Button>
          </Group>
        ))}

      <nav aria-label="Lessons">
        <Group justify="space-between" wrap="wrap" gap="sm">
          {lesson.previous_lesson_id ? (
            <Button
              component={Link}
              to={`/lessons/${lesson.previous_lesson_id}`}
              variant="default"
              leftSection={<IconArrowLeft size={18} aria-hidden="true" />}
            >
              Previous lesson
            </Button>
          ) : (
            <span />
          )}
          {lesson.next_lesson_id ? (
            <Button
              component={Link}
              to={`/lessons/${lesson.next_lesson_id}`}
              variant="default"
              rightSection={<IconArrowRight size={18} aria-hidden="true" />}
            >
              Next lesson
            </Button>
          ) : (
            <Button component={Link} to={courseLink} variant="default">
              Back to the course
            </Button>
          )}
        </Group>
      </nav>
    </Page>
  )
}
