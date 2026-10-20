import { Anchor, Group, Stack, Text } from '@mantine/core'
import { IconCircleCheck } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Page } from '../../components/Page.jsx'
import { SectionCard } from '../../components/SectionCard.jsx'
import { Stat, StatRow } from '../../components/Stat.jsx'
import { Async, Loading } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate } from '../../utils/format.js'
import { InstructorActions, PersonCell, RevokeDialog } from './AdminParts.jsx'
import { useInstructorActions } from './useInstructorActions.js'

export function AdminOverviewPage() {
  const overview = useApiData('/admin/overview/')
  return (
    <Async query={overview} skeleton="dashboard">
      {(data) => (
        <Page title="Administration" subtitle="Approve instructors and keep an eye on the whole site.">
          <StatRow label="Site at a glance">
            <Stat label="Users" value={data.users} />
            <Stat label="Learners" value={data.learners} />
            <Stat
              label="Instructors"
              value={data.instructors}
              hint={`${data.pending_instructors} pending`}
              hintTone={data.pending_instructors > 0 ? 'warning' : undefined}
            />
            <Stat
              label="Courses"
              value={data.courses.published + data.courses.drafts}
              hint={`${data.courses.drafts} ${data.courses.drafts === 1 ? 'draft' : 'drafts'} · ${data.courses.removed} removed`}
            />
            <Stat label="Enrolments" value={data.enrollments} />
            <Stat label="Quiz attempts" value={data.quiz_attempts} />
          </StatRow>
          <PendingCard onChange={overview.reload} />
        </Page>
      )}
    </Async>
  )
}

function PendingCard({ onChange }) {
  const query = useApiData('/admin/instructors/?status=pending')
  const actions = useInstructorActions((id, changes) => {
    query.setData(query.data.map((i) => (i.id === id ? { ...i, ...changes } : i)))
    onChange()
  })

  return (
    <SectionCard
      id="pending-heading"
      title="Waiting for approval"
      padded={!query.data || query.data.length === 0}
      actions={
        <Anchor component={Link} to="/manage/instructors" fw={600} size="sm">
          View all instructors
        </Anchor>
      }
    >
      {query.loading && !query.data ? (
        <Loading variant="table" label="Loading pending instructors…" />
      ) : query.error ? (
        <Text c="var(--lms-danger)">{query.error.message}</Text>
      ) : query.data.length === 0 ? (
        <Group gap="sm" wrap="nowrap">
          <IconCircleCheck size={24} color="var(--lms-success)" aria-hidden="true" />
          <Text fw={500}>No instructors are waiting for approval.</Text>
        </Group>
      ) : (
        <ul className="rt-list" style={{ display: 'block' }}>
          {query.data.map((instructor) => (
            <li key={instructor.id}>
              <Group justify="space-between" wrap="wrap" gap="sm">
                <Stack gap={2} style={{ flex: '1 1 16rem', minWidth: 0 }}>
                  <PersonCell name={instructor.full_name} email={instructor.email} />
                  <Text size="sm" c="dimmed" pl={48}>
                    Requested {formatDate(instructor.requested_at)}
                    {instructor.is_approved && ' · Approved'}
                  </Text>
                </Stack>
                <InstructorActions instructor={instructor} actions={actions} />
              </Group>
            </li>
          ))}
        </ul>
      )}
      <RevokeDialog actions={actions} />
    </SectionCard>
  )
}
