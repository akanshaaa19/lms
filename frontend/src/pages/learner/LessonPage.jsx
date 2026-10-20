import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheck,
  IconExternalLink,
  IconEye,
  IconListCheck,
  IconPlayerPlay,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { useAuth } from '../../auth/context.js'
import { IconTile } from '../../components/IconTile.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { useElementHeight } from '../../hooks/useElementHeight.js'

export function LessonPage() {
  const { lessonId } = useParams()
  const query = useApiData(`/lessons/${lessonId}/`)
  return <Async query={query}>{(lesson) => <Lesson lesson={lesson} onChange={query.setData} />}</Async>
}

function Lesson({ lesson, onChange }) {
  const { user } = useAuth()
  const isInstructor = user.role === 'instructor'
  const courseLink = isInstructor ? `/teach/courses/${lesson.course_id}/lessons` : `/courses/${lesson.course_id}`
  const [barRef, barHeight] = useElementHeight()

  // While the fixed bar is on screen, make the browser keep focused
  // elements above it when scrolling to them (so focus is never hidden).
  useEffect(() => {
    document.documentElement.style.scrollPaddingBottom = `${barHeight + 16}px`
    return () => {
      document.documentElement.style.scrollPaddingBottom = ''
    }
  }, [barHeight])

  return (
    <Page
      title={lesson.title}
      subtitle={`Lesson ${lesson.order}`}
      breadcrumbs={[
        isInstructor ? { label: 'Your courses', to: '/teach' } : { label: 'My courses', to: '/my-courses' },
        { label: lesson.course_title, to: courseLink },
        { label: `Lesson ${lesson.order}` },
      ]}
    >
      {/* Bottom padding equal to the bar's height, so the bar never covers
          the last lines of the lesson. */}
      <div className="reader" style={{ paddingBottom: barHeight + 24 }}>
        <Stack gap="xl">
          {isInstructor && (
            <Alert variant="light" color="sage" icon={<IconEye aria-hidden="true" />} styles={{ message: { color: 'var(--lms-ink)' } }}>
              Preview: this is how learners see this lesson.
            </Alert>
          )}

          {/* Plain text with line breaks kept. We never inject HTML from the
              database, so lesson content can't run scripts. */}
          <Text className="pre-wrap reader-body">{lesson.content}</Text>

          {lesson.video_url && (
            <Anchor
              href={lesson.video_url}
              target="_blank"
              rel="noopener noreferrer"
              underline="never"
              className="surface-card"
              style={{ padding: 16, display: 'block' }}
            >
              <Group gap="md" wrap="nowrap">
                <IconTile icon={IconPlayerPlay} size={40} />
                <Text fw={600} c="var(--lms-ink)" style={{ flex: 1 }}>
                  Watch the video for this lesson
                  <Text component="span" size="sm" c="dimmed" display="block" fw={400}>
                    Opens in a new tab
                  </Text>
                </Text>
                <IconExternalLink size={18} aria-hidden="true" />
              </Group>
            </Anchor>
          )}
        </Stack>
      </div>

      {/* Comes after the content in the page, so Tab reaches it last. */}
      <div ref={barRef} className="lesson-bar">
        <Group justify="space-between" gap="sm" className="lesson-bar-inner">
          <CompleteAction lesson={lesson} onChange={onChange} isInstructor={isInstructor} />
          <LessonNav lesson={lesson} courseLink={courseLink} isInstructor={isInstructor} />
        </Group>
      </div>
    </Page>
  )
}

function CompleteAction({ lesson, onChange, isInstructor }) {
  const [saving, setSaving] = useState(false)

  async function markComplete() {
    setSaving(true)
    try {
      const updated = await api.post(`/lessons/${lesson.id}/complete/`)
      onChange(updated)
      notifications.show({ message: 'Lesson marked as complete.' })
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not save your progress', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-label="Lesson actions">
      {isInstructor ? (
        <Text size="sm" c="dimmed">
          Learners mark lessons complete here.
        </Text>
      ) : lesson.is_completed ? (
        // The completed state stays on the page, not only in a toast.
        <Group gap={8} wrap="nowrap" mih={44}>
          <IconCircleCheck size={24} color="var(--lms-success)" aria-hidden="true" />
          <Text fw={600} c="var(--lms-success)">
            Completed
          </Text>
        </Group>
      ) : (
        <Button onClick={markComplete} loading={saving} leftSection={<IconCircleCheck size={20} aria-hidden="true" />}>
          Mark as complete
        </Button>
      )}
    </section>
  )
}

function LessonNav({ lesson, courseLink, isInstructor }) {
  const isLast = !lesson.next_lesson_id
  // On the last lesson, a learner is offered the quiz if the course has one.
  const courseQuery = useApiData(isLast && !isInstructor ? `/courses/${lesson.course_id}/` : null)
  const quiz = courseQuery.data?.quiz
  const nextIsPrimary = lesson.is_completed && !isInstructor

  return (
    <nav aria-label="Lesson navigation">
      <Group gap="sm" wrap="wrap">
        {lesson.previous_lesson_id && (
          <Button
            component={Link}
            to={`/lessons/${lesson.previous_lesson_id}`}
            variant="default"
            leftSection={<IconArrowLeft size={18} aria-hidden="true" />}
          >
            Previous
          </Button>
        )}
        {!isLast ? (
          <Button
            component={Link}
            to={`/lessons/${lesson.next_lesson_id}`}
            variant={nextIsPrimary ? 'filled' : 'default'}
            rightSection={<IconArrowRight size={18} aria-hidden="true" />}
          >
            Next lesson
          </Button>
        ) : quiz ? (
          <Button
            component={Link}
            to={`/quizzes/${quiz.id}`}
            variant={nextIsPrimary ? 'filled' : 'default'}
            rightSection={<IconListCheck size={18} aria-hidden="true" />}
          >
            Take the quiz
          </Button>
        ) : (
          <Button component={Link} to={courseLink} variant={nextIsPrimary ? 'filled' : 'default'}>
            Back to course
          </Button>
        )}
      </Group>
    </nav>
  )
}
