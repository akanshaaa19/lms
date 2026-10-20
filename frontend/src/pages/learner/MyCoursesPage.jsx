import { Anchor, Badge, Button, Group, Stack, Text, Title, VisuallyHidden } from '@mantine/core'
import { IconArchive, IconSchool } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { ResultBadge } from '../../components/Badges.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { ProgressRing } from '../../components/ProgressRing.jsx'
import { Page } from '../../components/Page.jsx'
import { Stat, StatRow } from '../../components/Stat.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate, progressText } from '../../utils/format.js'

export function MyCoursesPage() {
  const query = useApiData('/my-courses/')
  return (
    <Page title="My courses" subtitle="Courses you have enrolled in, and how far you have got.">
      <Async query={query} skeleton="table">
        {(enrolments) =>
          enrolments.length === 0 ? (
            <EmptyState
              icon={IconSchool}
              action={
                <Button component={Link} to="/courses">
                  Browse courses
                </Button>
              }
            >
              You have not enrolled in any courses yet.
            </EmptyState>
          ) : (
            <Stack gap="xl">
              <Summary enrolments={enrolments} />
              <Stack gap="md">
                {enrolments.map((enrolment) => (
                  <EnrolmentRow key={enrolment.course.id} enrolment={enrolment} />
                ))}
              </Stack>
            </Stack>
          )
        }
      </Async>
    </Page>
  )
}

function Summary({ enrolments }) {
  const active = enrolments.filter((e) => !e.course.is_deleted)
  const completed = active.filter((e) => e.total_lessons > 0 && e.completed_count >= e.total_lessons).length
  const passed = enrolments.filter((e) => e.passed).length
  const average = active.length
    ? Math.round(active.reduce((sum, e) => sum + e.progress_percent, 0) / active.length)
    : 0
  return (
    <StatRow label="Your learning summary">
      <Stat label="Enrolled" value={enrolments.length} />
      <Stat label="Average progress" value={`${average}%`} ring={average} />
      <Stat label="Lessons all done" value={completed} />
      <Stat label="Quizzes passed" value={passed} />
    </StatRow>
  )
}

function EnrolmentRow({ enrolment }) {
  const { course } = enrolment
  const removed = course.is_deleted
  return (
    <article className={`surface-card${removed ? ' removed' : ''}`} style={{ padding: 20 }}>
      <Group justify="space-between" wrap="wrap" gap="lg" align="center">
        <Group gap="lg" wrap="nowrap" style={{ flex: '1 1 22rem', minWidth: 0 }}>
          <ProgressRing
            value={enrolment.progress_percent}
            size={64}
            thickness={7}
            label={
              <Text ta="center" fw={700} size="sm" aria-hidden="true">
                {enrolment.progress_percent}%
              </Text>
            }
          />
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Group gap="sm" wrap="wrap">
              <Title order={2} size="h3">
                {removed ? (
                  course.title
                ) : (
                  <Anchor component={Link} to={`/courses/${course.id}`} c="var(--lms-ink)" fw={600} underline="hover">
                    {course.title}
                  </Anchor>
                )}
              </Title>
              {removed && (
                <Badge
                  radius="xl"
                  tt="none"
                  fw={600}
                  leftSection={<IconArchive size={13} aria-hidden="true" />}
                  styles={{ root: { background: 'var(--lms-neutral-tint)', color: 'var(--lms-ink)', border: '1px solid var(--lms-border)' } }}
                >
                  Removed by instructor
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {course.instructor_name} · Enrolled {formatDate(enrolment.enrolled_at)}
            </Text>
            <Text size="sm" fw={500}>
              {progressText(enrolment.completed_count, enrolment.total_lessons, enrolment.progress_percent)}
              {enrolment.best_percentage !== null && ` · Best quiz score ${enrolment.best_percentage}%`}
            </Text>
            {removed && (
              // Kept as a training record, but locked: the content may be out of date.
              <Text size="sm" c="dimmed">
                Removed on {formatDate(course.deleted_at)}.{course.deletion_reason && ` Reason: ${course.deletion_reason}`} You
                can no longer open its lessons or quiz.
              </Text>
            )}
          </Stack>
        </Group>
        <Group gap="md">
          <ResultBadge passed={enrolment.best_percentage === null ? null : enrolment.passed} />
          {!removed && (
            <Button component={Link} to={`/courses/${course.id}`} variant="default">
              Continue<VisuallyHidden> {course.title}</VisuallyHidden>
            </Button>
          )}
        </Group>
      </Group>
    </article>
  )
}
