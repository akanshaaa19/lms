import { Alert, Anchor, Button, Group, Paper, SimpleGrid, Stack, Table, Tabs, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconEdit,
  IconEye,
  IconFileText,
  IconLayoutDashboard,
  IconListCheck,
  IconPlus,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { ResultBadge, StatusBadge, TagPill } from '../../components/Badges.jsx'
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { IconTile } from '../../components/IconTile.jsx'
import { Page } from '../../components/Page.jsx'
import { RingWithPercent } from '../../components/ProgressRing.jsx'
import { SearchToolbar } from '../../components/SearchToolbar.jsx'
import { SortableTh } from '../../components/SortableTh.jsx'
import { Stat, StatRow } from '../../components/Stat.jsx'
import { StatusLabel } from '../../components/StatusLabel.jsx'
import { Async, Loading } from '../../components/States.jsx'
import { UserAvatar } from '../../components/UserAvatar.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { useSort } from '../../hooks/useSort.js'
import { learnerStatus, matches } from '../../utils/format.js'
import { NotFoundPage } from '../NotFoundPage.jsx'

const TABS = [
  { value: 'overview', label: 'Overview', icon: IconLayoutDashboard },
  { value: 'lessons', label: 'Lessons', icon: IconFileText },
  { value: 'quiz', label: 'Quiz', icon: IconListCheck },
  { value: 'learners', label: 'Learners', icon: IconUsers },
]

// /teach/courses/:courseId            -> Overview tab
// /teach/courses/:courseId/lessons    -> Lessons tab (and quiz, learners)
// Each tab has its own URL, so reload and the back button both work.
export function ManageCoursePage() {
  const { courseId, tab = 'overview' } = useParams()
  const query = useApiData(`/courses/${courseId}/`)
  if (!TABS.some((t) => t.value === tab)) return <NotFoundPage />
  return (
    <Async query={query} backTo="/teach" backLabel="Your courses">
      {(course) => <ManageCourse course={course} tab={tab} onChange={query.setData} reload={query.reload} />}
    </Async>
  )
}

function ManageCourse({ course, tab, onChange, reload }) {
  const navigate = useNavigate()
  const base = `/teach/courses/${course.id}`

  return (
    <Page
      title={course.title}
      breadcrumbs={[{ label: 'Your courses', to: '/teach' }, { label: course.title }]}
      actions={
        <Group gap="sm">
          <StatusBadge status={course.status} />
          <Button component={Link} to={`${base}/edit`} variant="default" leftSection={<IconEdit size={18} aria-hidden="true" />}>
            Edit details
          </Button>
        </Group>
      }
      tabs={
        // Real tabs: arrow keys move between them; each one changes the URL.
        <Tabs
          value={tab}
          onChange={(value) => navigate(value === 'overview' ? base : `${base}/${value}`)}
          keepMounted={false}
          mt="xs"
        >
          <Tabs.List aria-label="Course sections">
            {TABS.map(({ value, label, icon: Icon }) => (
              <Tabs.Tab key={value} value={value} leftSection={<Icon size={18} aria-hidden="true" />} fz="md" fw={500} py="md">
                {label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
          <Tabs.Panel value="overview" pt="xl">
            <OverviewTab course={course} onChange={onChange} />
          </Tabs.Panel>
          <Tabs.Panel value="lessons" pt="xl">
            <LessonsTab course={course} reload={reload} />
          </Tabs.Panel>
          <Tabs.Panel value="quiz" pt="xl">
            <QuizTab course={course} />
          </Tabs.Panel>
          <Tabs.Panel value="learners" pt="xl">
            <LearnersTab course={course} />
          </Tabs.Panel>
        </Tabs>
      }
    />
  )
}

/* ---------------- Overview ---------------- */

function OverviewTab({ course, onChange }) {
  const [publishing, setPublishing] = useState(false)
  const isPublished = course.status === 'published'

  async function togglePublished() {
    setPublishing(true)
    try {
      const updated = await api.patch(`/courses/${course.id}/`, { status: isPublished ? 'draft' : 'published' })
      onChange(updated)
      notifications.show({
        message: isPublished ? 'Course moved back to draft. Learners can no longer see it.' : 'Course published.',
      })
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not change the status', message: error.message })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Stack gap="xl">
      <StatRow label="Course at a glance">
        <Stat label="Lessons" value={course.lessons.length} />
        <Stat label="Quiz questions" value={course.quiz ? course.quiz.question_count : 0} />
        <Stat label="Pass mark" value={course.quiz ? `${course.quiz.pass_mark}%` : '—'} />
      </StatRow>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Paper withBorder radius="lg" p="lg">
          <Stack gap="sm">
            <Title order={2} size="h3">
              Description
            </Title>
            <Text className="pre-wrap" c="dimmed">
              {course.description}
            </Text>
          </Stack>
        </Paper>
        <Paper withBorder radius="lg" p="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2} size="h3">
                Visibility
              </Title>
              <StatusBadge status={course.status} />
            </Group>
            <Text c="dimmed">
              {isPublished
                ? 'Learners can find this course in the catalogue and enrol.'
                : 'Only you can see this course. Publish it when the lessons are ready.'}
            </Text>
            <Group>
              <Button onClick={togglePublished} loading={publishing} variant={isPublished ? 'default' : 'filled'}>
                {isPublished ? 'Move back to draft' : 'Publish course'}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </SimpleGrid>

      <DeleteSection course={course} />
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
      notifications.show({ color: 'danger', title: 'Could not delete the course', message: error.message })
      setDeleting(false)
    }
  }

  return (
    <Paper withBorder radius="lg" p="lg" style={{ borderColor: 'var(--lms-danger)' }} component="section" aria-labelledby="delete-heading">
      <Group justify="space-between" wrap="wrap" gap="md">
        <Stack gap={4} style={{ flex: '1 1 20rem' }}>
          <Title order={2} size="h3" id="delete-heading" c="var(--lms-danger)">
            Delete course
          </Title>
          <Text size="sm" c="dimmed">
            Use this when the content is out of date, for example after a change in the rules. Learners keep their
            records.
          </Text>
        </Stack>
        <Button color="danger" onClick={() => setOpened(true)} leftSection={<IconTrash size={18} aria-hidden="true" />}>
          Delete course
        </Button>
      </Group>
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
          Want to keep it but hide it?{' '}
          <Anchor component={Link} to={`/teach/courses/${course.id}/edit`}>
            Move it back to draft
          </Anchor>{' '}
          instead.
        </Text>
      </ConfirmDialog>
    </Paper>
  )
}

/* ---------------- Lessons ---------------- */

function LessonsTab({ course, reload }) {
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const addButton = (
    <Button component={Link} to={`/teach/courses/${course.id}/lessons/new`} leftSection={<IconPlus size={18} aria-hidden="true" />}>
      Add lesson
    </Button>
  )

  async function confirmDelete() {
    setDeleting(true)
    try {
      await api.delete(`/lessons/${toDelete.id}/`)
      notifications.show({ message: `Lesson “${toDelete.title}” deleted.` })
      setToDelete(null)
      reload()
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not delete the lesson', message: error.message })
    } finally {
      setDeleting(false)
    }
  }

  if (course.lessons.length === 0) {
    return (
      <EmptyState icon={IconFileText} action={addButton}>
        This course has no lessons yet. Add the first one.
      </EmptyState>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Title order={2}>
          {course.lessons.length} {course.lessons.length === 1 ? 'lesson' : 'lessons'}
        </Title>
        {addButton}
      </Group>
      <div className="surface-card">
        <ol className="lesson-list">
          {course.lessons.map((lesson) => (
            <li key={lesson.id} className="lesson-row" style={{ flexWrap: 'wrap' }}>
              <span className="lesson-number" aria-hidden="true">
                {lesson.order}
              </span>
              <Text fw={600} style={{ flex: '1 1 14rem' }}>
                Lesson {lesson.order}: {lesson.title}
              </Text>
              <Group gap={4}>
                {/* Hidden text gives each button a unique name, e.g.
                    "Edit Receiving a new filing", not just "Edit". */}
                <Button component={Link} to={`/lessons/${lesson.id}`} variant="subtle" size="sm" leftSection={<IconEye size={16} aria-hidden="true" />}>
                  Preview<span className="visually-hidden"> {lesson.title}</span>
                </Button>
                <Button component={Link} to={`/teach/lessons/${lesson.id}/edit`} variant="subtle" size="sm" leftSection={<IconEdit size={16} aria-hidden="true" />}>
                  Edit<span className="visually-hidden"> {lesson.title}</span>
                </Button>
                <Button
                  variant="subtle"
                  color="danger"
                  size="sm"
                  onClick={() => setToDelete(lesson)}
                  leftSection={<IconTrash size={16} aria-hidden="true" />}
                >
                  Delete<span className="visually-hidden"> {lesson.title}</span>
                </Button>
              </Group>
            </li>
          ))}
        </ol>
      </div>
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

/* ---------------- Quiz ---------------- */

function QuizTab({ course }) {
  const quiz = course.quiz
  const editLink = `/teach/courses/${course.id}/quiz/edit`
  if (!quiz) {
    return (
      <EmptyState
        icon={IconListCheck}
        action={
          <Button component={Link} to={editLink} leftSection={<IconPlus size={18} aria-hidden="true" />}>
            Create quiz
          </Button>
        }
      >
        This course has no quiz yet. Add one so learners can check what they have learnt.
      </EmptyState>
    )
  }
  return (
    <Paper withBorder radius="lg" p="lg" maw={720}>
      <Group justify="space-between" wrap="wrap" gap="md">
        <Group gap="md" wrap="nowrap">
          <IconTile icon={IconListCheck} size={48} />
          <div>
            <Title order={2} size="h3">
              {quiz.title}
            </Title>
            <Text c="dimmed" size="sm">
              {quiz.question_count} {quiz.question_count === 1 ? 'question' : 'questions'} · Pass mark {quiz.pass_mark}%
            </Text>
          </div>
        </Group>
        <Button component={Link} to={editLink} variant="default" leftSection={<IconEdit size={18} aria-hidden="true" />}>
          Edit quiz
        </Button>
      </Group>
    </Paper>
  )
}

/* ---------------- Learners ---------------- */

const LEARNER_SORT = {
  name: (l) => l.full_name.toLowerCase(),
  status: (l) => ['not_started', 'in_progress', 'completed'].indexOf(learnerStatus(l.completed_count, l.total_lessons)),
  progress: (l) => l.progress_percent,
  score: (l) => l.best_percentage,
}

function LearnersTab({ course }) {
  const query = useApiData(`/courses/${course.id}/learners/`)
  if (query.loading && !query.data) return <Loading variant="table" label="Loading learners…" />
  if (query.error) {
    return (
      <Alert variant="light" styles={{ root: { background: 'var(--lms-danger-tint)' } }}>
        <Text c="var(--lms-danger)" fw={500}>
          {query.error.message}
        </Text>
      </Alert>
    )
  }
  const learners = query.data
  if (learners.length === 0) {
    return (
      <EmptyState
        icon={IconUsers}
        action={
          course.status !== 'published' && (
            <Button component={Link} to={`/teach/courses/${course.id}`}>
              Go to Overview to publish
            </Button>
          )
        }
      >
        {course.status === 'published'
          ? 'No one has enrolled in this course yet.'
          : 'No one can enrol yet because this course is a draft.'}
      </EmptyState>
    )
  }
  return <LearnersTable learners={learners} course={course} />
}

function LearnersTable({ learners, course }) {
  const [search, setSearch] = useState('')
  const filtered = learners.filter(
    (l) => matches(l.full_name, search) || matches(l.department, search) || matches(l.designation, search),
  )
  const { sorted, sort, onSort } = useSort(filtered, LEARNER_SORT, { column: 'name', direction: 'asc' })

  const average = Math.round(learners.reduce((sum, l) => sum + l.progress_percent, 0) / learners.length)
  const passed = learners.filter((l) => l.attempt_count > 0 && l.passed).length

  return (
    <Stack gap="xl">
      <StatRow label="Learner summary">
        <Stat label="Enrolled" value={learners.length} />
        <Stat label="Average progress" value={`${average}%`} ring={average} />
        <Stat label="Passed the quiz" value={passed} />
        <Stat label="Not passed yet" value={learners.length - passed} />
      </StatRow>

      <Stack gap="md">
        <SearchToolbar
          id="learner-search"
          label="Filter learners by name, department or designation"
          placeholder="Filter learners…"
          value={search}
          onChange={setSearch}
        />
        <Text role="status" size="sm" c="dimmed" fw={500}>
          {sorted.length === learners.length
            ? `${learners.length} ${learners.length === 1 ? 'learner' : 'learners'}`
            : `${sorted.length} of ${learners.length} learners match`}
        </Text>

        <div className="table-card">
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
              <caption className="visually-hidden">Progress of learners enrolled in {course.title}</caption>
              <Table.Thead>
                <Table.Tr>
                  <SortableTh column="name" sort={sort} onSort={onSort}>
                    Full name
                  </SortableTh>
                  <SortableTh column="status" sort={sort} onSort={onSort}>
                    Status
                  </SortableTh>
                  <Table.Th scope="col">Lessons</Table.Th>
                  <SortableTh column="progress" sort={sort} onSort={onSort}>
                    Progress
                  </SortableTh>
                  <SortableTh column="score" sort={sort} onSort={onSort}>
                    Best score
                  </SortableTh>
                  <Table.Th scope="col">Attempts</Table.Th>
                  <Table.Th scope="col">Quiz result</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sorted.map((l) => (
                  <Table.Tr key={l.learner_id}>
                    <Table.Th scope="row" fw={400}>
                      <Group gap="md" wrap="nowrap">
                        <UserAvatar name={l.full_name} size={40} />
                        <div style={{ minWidth: 0 }}>
                          <Group gap={8} wrap="wrap">
                            <Text fw={600}>{l.full_name}</Text>
                            {l.department && <TagPill>{l.department}</TagPill>}
                          </Group>
                          <Text size="sm" c="dimmed">
                            {l.designation || l.email}
                          </Text>
                        </div>
                      </Group>
                    </Table.Th>
                    <Table.Td>
                      <StatusLabel status={learnerStatus(l.completed_count, l.total_lessons)} />
                    </Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      {l.completed_count} of {l.total_lessons}
                    </Table.Td>
                    <Table.Td>
                      <RingWithPercent value={l.progress_percent} />
                    </Table.Td>
                    <Table.Td fw={600}>{l.best_percentage === null ? '—' : `${l.best_percentage}%`}</Table.Td>
                    <Table.Td>{l.attempt_count}</Table.Td>
                    <Table.Td>
                      {l.attempt_count === 0 ? (
                        <Text size="sm" c="dimmed">
                          Not taken
                        </Text>
                      ) : (
                        <ResultBadge passed={l.passed} />
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </div>
      </Stack>
    </Stack>
  )
}

