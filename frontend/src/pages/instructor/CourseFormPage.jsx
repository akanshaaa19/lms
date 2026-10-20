import { Button, Group, Paper, Radio, SimpleGrid, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { ErrorSummary } from '../../components/ErrorSummary.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { useFormSubmit } from '../../hooks/useFormSubmit.js'
import { errorItems } from '../../utils/errors.js'

const FIELDS = [
  { name: 'title', id: 'course-title' },
  { name: 'description', id: 'course-description' },
  { name: 'status', id: 'course-status-draft' },
]

// One component for both "new course" and "edit course".
export function CourseFormPage() {
  const { courseId } = useParams()
  if (!courseId) return <CourseForm course={null} />
  return <EditCourse courseId={courseId} />
}

function EditCourse({ courseId }) {
  const query = useApiData(`/courses/${courseId}/`)
  return (
    <Async query={query} backTo="/teach" backLabel="Your courses">
      {(course) => <CourseForm course={course} />}
    </Async>
  )
}

function CourseForm({ course }) {
  const navigate = useNavigate()
  const isNew = !course

  const form = useForm({
    initialValues: {
      title: course?.title ?? '',
      description: course?.description ?? '',
      status: course?.status ?? 'draft',
    },
    validate: {
      title: (v) => (v.trim() ? null : 'Enter a title for the course'),
      description: (v) => (v.trim() ? null : 'Enter a short description of the course'),
    },
  })

  const { onSubmit, general, attempt, submitting } = useFormSubmit(form, async (values) => {
    const saved = isNew ? await api.post('/courses/', values) : await api.patch(`/courses/${course.id}/`, values)
    notifications.show({ message: isNew ? 'Course created.' : 'Course details saved.' })
    navigate(`/teach/courses/${saved.id}`)
  })

  const backTo = isNew ? '/teach' : `/teach/courses/${course.id}`

  return (
    <Page
      title={isNew ? 'New course' : `Edit ${course.title}`}
      heading={isNew ? 'New course' : 'Edit course details'}
      breadcrumbs={
        isNew
          ? [{ label: 'Your courses', to: '/teach' }, { label: 'New course' }]
          : [{ label: 'Your courses', to: '/teach' }, { label: course.title, to: backTo }, { label: 'Edit details' }]
      }
    >
      <Paper withBorder p={{ base: 'lg', sm: 'xl' }} radius="lg" maw={760} shadow="xs">
        <Stack gap="md">
          <ErrorSummary items={errorItems(form.errors, FIELDS)} general={general} focusKey={attempt} />
          <form onSubmit={onSubmit} noValidate>
            <Stack gap="md">
              <TextInput id="course-title" label="Title" required {...form.getInputProps('title')} />
              <Textarea
                id="course-description"
                label="Description"
                description="What will learners be able to do after this course?"
                rows={5}
                resize="vertical"
                required
                {...form.getInputProps('description')}
              />
              <Radio.Group label="Status" required {...form.getInputProps('status')}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} mt="xs">
                  <Paper withBorder p="md" radius="md">
                    <Radio
                      id="course-status-draft"
                      value="draft"
                      label="Draft"
                      description="Only you can see it. Use this while you are still writing."
                    />
                  </Paper>
                  <Paper withBorder p="md" radius="md">
                    <Radio
                      id="course-status-published"
                      value="published"
                      label="Published"
                      description="Learners can find it in the catalogue and enrol."
                    />
                  </Paper>
                </SimpleGrid>
              </Radio.Group>
              <Group>
                <Button type="submit" loading={submitting}>
                  {isNew ? 'Create course' : 'Save changes'}
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
