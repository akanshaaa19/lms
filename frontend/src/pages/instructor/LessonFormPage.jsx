import { Button, Group, NumberInput, Paper, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { BackLink } from '../../components/BackLink.jsx'
import { ErrorSummary } from '../../components/ErrorSummary.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { useFormSubmit } from '../../hooks/useFormSubmit.js'
import { errorItems } from '../../utils/errors.js'

const FIELDS = [
  { name: 'title', id: 'lesson-title' },
  { name: 'content', id: 'lesson-content' },
  { name: 'video_url', id: 'lesson-video-url' },
  { name: 'order', id: 'lesson-order' },
]

// /teach/courses/:courseId/lessons/new  or  /teach/lessons/:lessonId/edit
export function LessonFormPage() {
  const { courseId, lessonId } = useParams()
  if (courseId) return <LessonForm courseId={courseId} lesson={null} />
  return <EditLesson lessonId={lessonId} />
}

function EditLesson({ lessonId }) {
  const query = useApiData(`/lessons/${lessonId}/`)
  return (
    <Async query={query} backTo="/teach" backLabel="Your courses">
      {(lesson) => <LessonForm courseId={lesson.course_id} lesson={lesson} />}
    </Async>
  )
}

function LessonForm({ courseId, lesson }) {
  const navigate = useNavigate()
  const isNew = !lesson

  const form = useForm({
    initialValues: {
      title: lesson?.title ?? '',
      content: lesson?.content ?? '',
      video_url: lesson?.video_url ?? '',
      order: lesson?.order ?? '',
    },
    validate: {
      title: (v) => (v.trim() ? null : 'Enter a title for the lesson'),
      content: (v) => (v.trim() ? null : 'Enter the lesson content'),
      video_url: (v) => (!v || /^https?:\/\/\S+$/.test(v) ? null : 'Enter a full web address starting with https://'),
    },
  })

  const { onSubmit, general, attempt, submitting } = useFormSubmit(form, async (values) => {
    const payload = { ...values }
    if (payload.order === '' || payload.order === null) delete payload.order // server puts it last
    if (isNew) await api.post(`/courses/${courseId}/lessons/`, payload)
    else await api.patch(`/lessons/${lesson.id}/`, payload)
    notifications.show({ color: 'green', message: isNew ? 'Lesson added.' : 'Lesson saved.' })
    navigate(`/teach/courses/${courseId}`)
  })

  const backTo = `/teach/courses/${courseId}`

  return (
    <Page title={isNew ? 'Add a lesson' : `Edit ${lesson.title}`} heading={isNew ? 'Add a lesson' : 'Edit lesson'}>
      <BackLink to={backTo}>Back to {lesson?.course_title ?? 'the course'}</BackLink>
      <Paper withBorder p="xl" radius="md" maw={820}>
        <Stack gap="md">
          <ErrorSummary items={errorItems(form.errors, FIELDS)} general={general} focusKey={attempt} />
          <form onSubmit={onSubmit} noValidate>
            <Stack gap="md">
              <TextInput id="lesson-title" label="Title" required {...form.getInputProps('title')} />
              <Textarea
                id="lesson-content"
                label="Content"
                description="Plain text. Leave a blank line between paragraphs."
                autosize
                minRows={10}
                required
                {...form.getInputProps('content')}
              />
              <TextInput
                id="lesson-video-url"
                label="Video link (optional)"
                description="For example, https://www.youtube.com/watch?v=…"
                type="url"
                {...form.getInputProps('video_url')}
              />
              <NumberInput
                id="lesson-order"
                label="Position in the course (optional)"
                description={isNew ? 'Leave blank to add it after the last lesson.' : '1 is the first lesson.'}
                min={1}
                allowDecimal={false}
                allowNegative={false}
                maw={240}
                {...form.getInputProps('order')}
              />
              <Group>
                <Button type="submit" loading={submitting}>
                  {isNew ? 'Add lesson' : 'Save lesson'}
                </Button>
                <Button component={Link} to={backTo} variant="default">
                  Cancel
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Page>
  )
}
