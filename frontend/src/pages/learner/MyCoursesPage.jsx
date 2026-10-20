import { Alert, Anchor, Button, Card, Group, Stack, Text, Title, VisuallyHidden } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { ResultBadge } from '../../components/Badges.jsx'
import { Page } from '../../components/Page.jsx'
import { ProgressSummary } from '../../components/ProgressSummary.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate } from '../../utils/format.js'

export function MyCoursesPage() {
  const query = useApiData('/my-courses/')
  return (
    <Page title="My courses">
      <Async query={query}>
        {(enrolments) =>
          enrolments.length === 0 ? (
            <Stack gap="sm" align="flex-start">
              <Text>You have not enrolled in any courses yet.</Text>
              <Button component={Link} to="/courses">
                Browse courses
              </Button>
            </Stack>
          ) : (
            <Stack gap="md">
              {enrolments.map((enrolment) => (
                <EnrolmentCard key={enrolment.course.id} enrolment={enrolment} />
              ))}
            </Stack>
          )
        }
      </Async>
    </Page>
  )
}

function EnrolmentCard({ enrolment }) {
  const { course } = enrolment
  return (
    <Card withBorder radius="md" padding="lg" component="article">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Title order={2} size="h3">
            {course.is_deleted ? (
              course.title
            ) : (
              <Anchor component={Link} to={`/courses/${course.id}`} c="court.8">
                {course.title}
              </Anchor>
            )}
          </Title>
          <ResultBadge passed={enrolment.best_percentage === null ? null : enrolment.passed} />
        </Group>
        <Text size="sm" c="dimmed">
          Taught by {course.instructor_name} · Enrolled {formatDate(enrolment.enrolled_at)}
        </Text>

        {course.is_deleted && (
          // Removed courses stay listed as a training record, but are locked
          // because their content may now be out of date.
          <Alert color="orange.9" variant="light" icon={<IconInfoCircle aria-hidden="true" />} title="Course removed">
            <Text size="sm">Removed by the instructor on {formatDate(course.deleted_at)}.</Text>
            {course.deletion_reason && <Text size="sm">Reason: {course.deletion_reason}</Text>}
            <Text size="sm">You can no longer open its lessons or quiz. Your record below is kept.</Text>
          </Alert>
        )}

        <ProgressSummary
          completed={enrolment.completed_count}
          total={enrolment.total_lessons}
          percent={enrolment.progress_percent}
        />
        {enrolment.best_percentage !== null && <Text>Best quiz score: {enrolment.best_percentage}%</Text>}

        {!course.is_deleted && (
          <Group>
            <Button component={Link} to={`/courses/${course.id}`} variant="light">
              Continue<VisuallyHidden> {course.title}</VisuallyHidden>
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  )
}
