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
import { useMediaQuery } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { useAuth } from '../../auth/context.js'
import { IconTile } from '../../components/IconTile.jsx'
import { LessonOutline } from '../../components/LessonOutline.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { useElementHeight } from '../../hooks/useElementHeight.js'
import { useFillViewport } from '../../hooks/useFillViewport.js'

export function LessonPage() {
  const { lessonId } = useParams()
  const query = useApiData(`/lessons/${lessonId}/`)
  return <Async query={query}>{(lesson) => <Lesson lesson={lesson} onChange={query.setData} />}</Async>
}

function Lesson({ lesson, onChange }) {
  const { user } = useAuth()
  const isInstructor = user.role === 'instructor'
  const courseLink = isInstructor ? `/teach/courses/${lesson.course_id}/lessons` : `/courses/${lesson.course_id}`
  // The course gives the outline (which lessons are done) and the quiz link.
  const course = useApiData(`/courses/${lesson.course_id}/`)

  // Wide screens: the page stays still, and only the lesson text scrolls,
  // between the outline and the action bar. Narrow screens and high zoom
  // keep normal page scrolling: a small scroll box inside a small screen
  // is hard to use, and WCAG 1.4.10 asks content to reflow instead.
  const isWide = useMediaQuery('(min-width: 62em)')
  const [layoutRef, layoutHeight] = useFillViewport(isWide)
  const [barRef, barHeight] = useElementHeight()

  // Narrow screens only: the bar is fixed to the window there, so keep
  // focused elements above it when the browser scrolls to them.
  useEffect(() => {
    if (isWide) return undefined
    document.documentElement.style.scrollPaddingBottom = `${barHeight + 16}px`
    return () => {
      document.documentElement.style.scrollPaddingBottom = ''
    }
  }, [barHeight, isWide])

  function handleChange(updated) {
    onChange(updated)
    course.reload() // refresh the outline's ticks and progress
  }

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
      <div ref={layoutRef} className="lesson-layout" style={layoutHeight ? { height: layoutHeight } : undefined}>
        {course.data ? <LessonOutline course={course.data} currentLessonId={lesson.id} /> : <div />}

        <div className="lesson-main">
          {/* On wide screens this is the only part that scrolls. It can take
              keyboard focus so it can be scrolled with the arrow keys. */}
          <section
            className="lesson-scroll"
            aria-label="Lesson content"
            tabIndex={isWide ? 0 : undefined}
            style={isWide ? undefined : { paddingBottom: barHeight + 24 }}
          >
            <div className="reader">
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
          </section>

          {/* Comes after the content in the page, so Tab reaches it last. */}
          <div ref={barRef} className="lesson-bar">
            <Group justify="space-between" gap="sm" className="lesson-bar-inner">
              <CompleteAction lesson={lesson} onChange={handleChange} isInstructor={isInstructor} />
              <LessonNav lesson={lesson} courseLink={courseLink} isInstructor={isInstructor} quiz={course.data?.quiz} />
            </Group>
          </div>
        </div>
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

function LessonNav({ lesson, courseLink, isInstructor, quiz: courseQuiz }) {
  const isLast = !lesson.next_lesson_id
  // On the last lesson, a learner is offered the quiz if the course has one.
  const quiz = isInstructor ? null : courseQuiz
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
