import { Stack, Table, Tabs, Text } from '@mantine/core'
import { IconChalkboard } from '@tabler/icons-react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState.jsx'
import { Page } from '../../components/Page.jsx'
import { Loading } from '../../components/States.jsx'
import { StatusPill } from '../../components/StatusLabel.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate } from '../../utils/format.js'
import { InstructorActions, PersonCell, RevokeDialog } from './AdminParts.jsx'
import { useInstructorActions } from './useInstructorActions.js'

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
]

const EMPTY = {
  pending: 'No instructors are waiting for approval.',
  approved: 'No instructors have been approved yet.',
  all: 'No one has asked to become an instructor yet.',
}

export function AdminInstructorsPage() {
  // The tab lives in the URL (?status=) so reload and back both work.
  const [searchParams, setSearchParams] = useSearchParams()
  const status = TABS.some((t) => t.value === searchParams.get('status')) ? searchParams.get('status') : 'pending'
  const query = useApiData(`/admin/instructors/${status === 'all' ? '' : `?status=${status}`}`)
  const actions = useInstructorActions((id, changes) =>
    query.setData(query.data.map((i) => (i.id === id ? { ...i, ...changes } : i))),
  )

  return (
    <Page
      title="Instructors"
      subtitle="People who asked to create courses. Approve them before they can publish."
      tabs={
        <Tabs value={status} onChange={(value) => setSearchParams({ status: value })} mt="xs">
          <Tabs.List aria-label="Filter instructors by status">
            {TABS.map((t) => (
              <Tabs.Tab key={t.value} value={t.value} fz="md" fw={500} py="md">
                {t.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      }
    >
      {query.loading && !query.data ? (
        <Loading variant="table" />
      ) : query.error ? (
        <Text c="var(--lms-danger)">{query.error.message}</Text>
      ) : query.data.length === 0 ? (
        <EmptyState icon={IconChalkboard}>{EMPTY[status]}</EmptyState>
      ) : (
        <InstructorTable instructors={query.data} actions={actions} />
      )}
      <RevokeDialog actions={actions} />
    </Page>
  )
}

function InstructorTable({ instructors, actions }) {
  const pill = (i) => <StatusPill status={i.is_approved ? 'approved' : 'pending'} />
  return (
    <div className="surface-card rt">
      <div className="rt-table">
        <Table verticalSpacing="md" horizontalSpacing="sm" highlightOnHover className="compact-table">
          <caption className="visually-hidden">Instructors</caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">Instructor</Table.Th>
              <Table.Th scope="col">Bio</Table.Th>
              <Table.Th scope="col">Courses</Table.Th>
              <Table.Th scope="col">Status</Table.Th>
              <Table.Th scope="col">Requested</Table.Th>
              <Table.Th scope="col">
                <span className="visually-hidden">Actions</span>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {instructors.map((i) => (
              <Table.Tr key={i.id}>
                <Table.Th scope="row" fw={400} w="30%">
                  <PersonCell name={i.full_name} email={i.email} />
                </Table.Th>
                <Table.Td maw={280}>
                  <Text size="sm" c={i.bio ? undefined : 'dimmed'} lineClamp={2} className="safe-text">
                    {i.bio || 'No bio'}
                  </Text>
                </Table.Td>
                <Table.Td>{i.course_count}</Table.Td>
                <Table.Td>{pill(i)}</Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDate(i.requested_at)}</Table.Td>
                <Table.Td ta="right">
                  <InstructorActions instructor={i} actions={actions} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
      <ul className="rt-list">
        {instructors.map((i) => (
          <li key={i.id}>
            <Stack gap="xs">
              <PersonCell name={i.full_name} email={i.email} />
              {i.bio && (
                <Text size="sm" lineClamp={2} className="safe-text">
                  {i.bio}
                </Text>
              )}
              <Text size="sm" c="dimmed">
                {i.course_count} {i.course_count === 1 ? 'course' : 'courses'} · Requested {formatDate(i.requested_at)}
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                {pill(i)}
                <InstructorActions instructor={i} actions={actions} />
              </div>
            </Stack>
          </li>
        ))}
      </ul>
    </div>
  )
}
