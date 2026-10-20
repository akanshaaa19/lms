import { Anchor, Button, Group, Stack, Table, Text, VisuallyHidden } from '@mantine/core'
import { IconAlertTriangle, IconChalkboard, IconCircleCheck, IconPlus } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '../../components/Badges.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { RingWithPercent } from '../../components/ProgressRing.jsx'
import { SectionCard } from '../../components/SectionCard.jsx'
import { Stat, StatRow } from '../../components/Stat.jsx'
import { UserAvatar } from '../../components/UserAvatar.jsx'
import { relativeTime } from '../../utils/format.js'

const dash = (value, suffix = '') => (value === null || value === undefined ? '—' : `${value}${suffix}`)

const newCourseButton = (
  <Button component={Link} to="/teach/courses/new" size="sm" leftSection={<IconPlus size={16} aria-hidden="true" />}>
    New course
  </Button>
)

export function InstructorDashboard({ data }) {
  const { stats, courses, attention, recent_activity: activity } = data
  return (
    <Stack gap="xl">
      <StatRow label="Your teaching at a glance">
        <Stat
          label="Published courses"
          value={stats.published}
          hint={`${stats.drafts} ${stats.drafts === 1 ? 'draft' : 'drafts'}`}
        />
        <Stat
          label="Learners"
          value={stats.learners}
          hint={`${stats.enrollments} ${stats.enrollments === 1 ? 'enrolment' : 'enrolments'}`}
        />
        <Stat
          label="Average progress"
          value={dash(stats.average_progress, '%')}
          ring={stats.average_progress === null ? undefined : stats.average_progress}
        />
        <Stat
          label="Learners passed"
          value={stats.learners_passed}
          hint={`${stats.quiz_attempts} quiz ${stats.quiz_attempts === 1 ? 'attempt' : 'attempts'}, ${dash(stats.pass_rate, '%')} pass rate`}
        />
      </StatRow>

      <div className="dashboard-grid">
        <div className="dashboard-column">
          <CoursesCard courses={courses} />
        </div>
        <div className="dashboard-column">
          <AttentionCard items={attention} />
          <ActivityCard items={activity} />
        </div>
      </div>
    </Stack>
  )
}

function CoursesCard({ courses }) {
  if (courses.length === 0) {
    return (
      <EmptyState icon={IconChalkboard} action={newCourseButton}>
        You have not created any courses yet.
      </EmptyState>
    )
  }
  return (
    <SectionCard id="courses-heading" title="Your courses" actions={newCourseButton} padded={false}>
      <Table.ScrollContainer minWidth={620}>
        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover className="compact-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">Course</Table.Th>
              <Table.Th scope="col">Status</Table.Th>
              <Table.Th scope="col">Lessons</Table.Th>
              <Table.Th scope="col">Enrolled</Table.Th>
              <Table.Th scope="col">Avg. progress</Table.Th>
              <Table.Th scope="col">Passed</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {courses.map((course) => (
              <Table.Tr key={course.id}>
                <Table.Th scope="row" fw={400} miw={180} maw={280}>
                  <Anchor
                    component={Link}
                    to={`/teach/courses/${course.id}`}
                    fw={600}
                    c="var(--lms-ink)"
                    underline="hover"
                    lineClamp={2}
                    className="safe-text"
                  >
                    {course.title}
                  </Anchor>
                </Table.Th>
                <Table.Td>
                  <StatusBadge status={course.status} />
                </Table.Td>
                <Table.Td>{course.lesson_count}</Table.Td>
                <Table.Td>{course.enrolled}</Table.Td>
                <Table.Td>
                  {course.average_progress === null ? (
                    <Text size="sm" c="dimmed">
                      —<VisuallyHidden> no learners yet</VisuallyHidden>
                    </Text>
                  ) : (
                    <RingWithPercent value={course.average_progress} size={28} />
                  )}
                </Table.Td>
                <Table.Td>{course.has_quiz ? course.passed_count : <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>No quiz</Text>}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </SectionCard>
  )
}

const TAB_LABELS = { lessons: 'Add lessons', quiz: 'Set up the quiz', overview: 'Open overview' }

function AttentionCard({ items }) {
  return (
    <SectionCard id="attention-heading" title="Needs attention" padded={items.length === 0}>
      {items.length === 0 ? (
        <Group gap="sm" wrap="nowrap">
          <IconCircleCheck size={24} color="var(--lms-success)" aria-hidden="true" />
          <Text fw={500}>All your courses are in good shape.</Text>
        </Group>
      ) : (
        <ul className="lesson-list">
          {items.map((item, index) => (
            <li key={`${item.course_id}-${item.tab}-${index}`} className="feed-row">
              <span
                className="icon-tile"
                aria-hidden="true"
                style={{ width: 36, height: 36, background: 'var(--lms-warning-tint)', color: 'var(--lms-warning)' }}
              >
                <IconAlertTriangle size={18} />
              </span>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} lineClamp={2} className="safe-text">
                  {item.course_title}
                </Text>
                <Text size="sm" c="dimmed">
                  {item.message}
                </Text>
                <Anchor
                  component={Link}
                  to={item.tab === 'overview' ? `/teach/courses/${item.course_id}` : `/teach/courses/${item.course_id}/${item.tab}`}
                  size="sm"
                  fw={600}
                  mt={2}
                >
                  {TAB_LABELS[item.tab] ?? 'Open course'}
                  <VisuallyHidden> for {item.course_title}</VisuallyHidden>
                </Anchor>
              </Stack>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function activitySentence(item) {
  switch (item.type) {
    case 'enrolled':
      return `enrolled in ${item.course_title}`
    case 'quiz_attempt':
      return `scored ${item.percentage}% on ${item.course_title}, ${item.passed ? 'passed' : 'not passed'}`
    case 'lesson_completed':
      return `completed ${item.lesson_title} in ${item.course_title}`
    default:
      return `was active in ${item.course_title}`
  }
}

function ActivityCard({ items }) {
  return (
    <SectionCard id="activity-heading" title="Recent activity" padded={items.length === 0}>
      {items.length === 0 ? (
        <Text c="dimmed">No learner activity yet. Enrolments, completed lessons and quiz results will show here.</Text>
      ) : (
        <ol className="lesson-list">
          {items.map((item, index) => (
            <li key={`${item.type}-${item.at}-${index}`} className="feed-row">
              <UserAvatar name={item.learner_name} size={34} />
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" className="safe-text" lineClamp={3}>
                  <strong>{item.learner_name}</strong> {activitySentence(item)}
                </Text>
                <Text size="xs" c="dimmed">
                  <time dateTime={item.at}>{relativeTime(item.at)}</time>
                </Text>
              </Stack>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}
