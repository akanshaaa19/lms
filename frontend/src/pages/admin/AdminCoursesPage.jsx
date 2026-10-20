import { Button, Stack, Table, Tabs, Text, VisuallyHidden } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconBooks, IconRestore } from '@tabler/icons-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { api } from '../../api.js'
import { EmptyState } from '../../components/EmptyState.jsx'
import { Page } from '../../components/Page.jsx'
import { SearchToolbar } from '../../components/SearchToolbar.jsx'
import { Loading } from '../../components/States.jsx'
import { StatusPill } from '../../components/StatusLabel.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate } from '../../utils/format.js'

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'removed', label: 'Removed' },
]

export function AdminCoursesPage() {
  // Tab and search live in the URL so reload and back keep them.
  const [searchParams, setSearchParams] = useSearchParams()
  const status = TABS.some((t) => t.value === searchParams.get('status')) ? searchParams.get('status') : 'all'
  const search = searchParams.get('search') ?? ''
  const [draft, setDraft] = useState(search)

  const params = new URLSearchParams()
  if (status !== 'all') params.set('status', status)
  if (search) params.set('search', search)
  const query = useApiData(`/admin/courses/${params.size ? `?${params}` : ''}`)
  const [restoringId, setRestoringId] = useState(null)

  function update(next) {
    const merged = { status, search, ...next }
    if (merged.status === 'all') delete merged.status
    setSearchParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)))
  }

  async function restore(course) {
    setRestoringId(course.id)
    try {
      await api.post(`/admin/courses/${course.id}/restore/`)
      query.setData(query.data.map((c) => (c.id === course.id ? { ...c, is_deleted: false, deleted_at: null, deletion_reason: '' } : c)))
      notifications.show({ message: `Restored ${course.title}. Learners can open it again.` })
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not restore the course', message: error.message })
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Page
      title="Courses"
      subtitle="Every course on the site, including drafts and removed ones."
      tabs={
        <Tabs value={status} onChange={(value) => update({ status: value })} mt="xs">
          <Tabs.List aria-label="Filter courses by status">
            {TABS.map((t) => (
              <Tabs.Tab key={t.value} value={t.value} fz="md" fw={500} py="md">
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      }
    >
      <SearchToolbar
        id="courses-search"
        label="Search courses by title"
        placeholder="Search by title…"
        value={draft}
        onChange={setDraft}
        onSubmit={(e) => {
          e.preventDefault()
          update({ search: draft.trim() })
        }}
      >
        <Button onClick={() => update({ search: draft.trim() })}>Search</Button>
      </SearchToolbar>

      {query.loading && !query.data ? (
        <Loading variant="table" />
      ) : query.error ? (
        <Text c="var(--lms-danger)">{query.error.message}</Text>
      ) : (
        <Stack gap="sm">
          <Text role="status" size="sm" c="dimmed" fw={500}>
            {query.data.length} {query.data.length === 1 ? 'course' : 'courses'}
          </Text>
          {query.data.length === 0 ? (
            <EmptyState icon={IconBooks}>No courses match these filters.</EmptyState>
          ) : (
            <CourseTable courses={query.data} onRestore={restore} restoringId={restoringId} />
          )}
        </Stack>
      )}
    </Page>
  )
}

function CourseTitle({ course }) {
  return (
    <div style={{ minWidth: 0 }}>
      <Text fw={600} lineClamp={2} className="safe-text">
        {course.title}
      </Text>
      {course.is_deleted && (
        <Text size="sm" c="dimmed" lineClamp={2} className="safe-text">
          Removed {formatDate(course.deleted_at)}
          {course.deletion_reason && `: ${course.deletion_reason}`}
        </Text>
      )}
    </div>
  )
}

const statusOf = (c) => (c.is_deleted ? 'removed' : c.status)

function RestoreButton({ course, onRestore, restoringId }) {
  if (!course.is_deleted) return null
  return (
    <Button
      variant="default"
      size="sm"
      onClick={() => onRestore(course)}
      loading={restoringId === course.id}
      leftSection={<IconRestore size={16} aria-hidden="true" />}
    >
      Restore<VisuallyHidden> {course.title}</VisuallyHidden>
    </Button>
  )
}

function CourseTable({ courses, onRestore, restoringId }) {
  return (
    <div className="surface-card rt">
      <div className="rt-table">
        <Table verticalSpacing="md" horizontalSpacing="sm" highlightOnHover className="compact-table">
          <caption className="visually-hidden">Courses</caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">Course</Table.Th>
              <Table.Th scope="col">Instructor</Table.Th>
              <Table.Th scope="col">Status</Table.Th>
              <Table.Th scope="col">Lessons</Table.Th>
              <Table.Th scope="col">Enrolled</Table.Th>
              <Table.Th scope="col">Created</Table.Th>
              <Table.Th scope="col">
                <span className="visually-hidden">Actions</span>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {courses.map((c) => (
              <Table.Tr key={c.id}>
                <Table.Th scope="row" fw={400} w="30%">
                  <CourseTitle course={c} />
                </Table.Th>
                <Table.Td maw={200}>
                  <Text size="sm" fw={500} lineClamp={1} className="safe-text">
                    {c.instructor_name}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1} className="safe-text">
                    {c.instructor_email}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <StatusPill status={statusOf(c)} />
                </Table.Td>
                <Table.Td>{c.lesson_count}</Table.Td>
                <Table.Td>{c.enrolled}</Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.created_at)}</Table.Td>
                <Table.Td ta="right">
                  <RestoreButton course={c} onRestore={onRestore} restoringId={restoringId} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
      <ul className="rt-list">
        {courses.map((c) => (
          <li key={c.id}>
            <Stack gap="xs">
              <CourseTitle course={c} />
              <div>
                <StatusPill status={statusOf(c)} />
              </div>
              <Text size="sm" c="dimmed" className="safe-text">
                {c.instructor_name} · {c.lesson_count} {c.lesson_count === 1 ? 'lesson' : 'lessons'} · {c.enrolled}{' '}
                enrolled · Created {formatDate(c.created_at)}
              </Text>
              <div>
                <RestoreButton course={c} onRestore={onRestore} restoringId={restoringId} />
              </div>
            </Stack>
          </li>
        ))}
      </ul>
    </div>
  )
}
