import { Button, NativeSelect, Stack, Table, Text } from '@mantine/core'
import { IconUsers } from '@tabler/icons-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState.jsx'
import { Page } from '../../components/Page.jsx'
import { SearchToolbar } from '../../components/SearchToolbar.jsx'
import { Loading } from '../../components/States.jsx'
import { StatusPill } from '../../components/StatusLabel.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate, relativeTime } from '../../utils/format.js'
import { PersonCell } from './AdminParts.jsx'

const ROLES = [
  { value: '', label: 'All roles' },
  { value: 'learner', label: 'Learners' },
  { value: 'instructor', label: 'Instructors' },
  { value: 'pending_instructor', label: 'Pending instructors' },
  { value: 'admin', label: 'Admins' },
]

export function AdminUsersPage() {
  // Search and role filter live in the URL so reload and back keep them.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const role = ROLES.some((r) => r.value === searchParams.get('role')) ? searchParams.get('role') : ''
  const [draft, setDraft] = useState(search)

  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (role) params.set('role', role)
  const query = useApiData(`/admin/users/${params.size ? `?${params}` : ''}`)

  function update(next) {
    const merged = { search, role, ...next }
    setSearchParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)))
  }

  return (
    <Page title="Users" subtitle="Everyone with an account, newest first.">
      <SearchToolbar
        id="users-search"
        label="Search users by name or email"
        placeholder="Search by name or email…"
        value={draft}
        onChange={setDraft}
        onSubmit={(e) => {
          e.preventDefault()
          update({ search: draft.trim() })
        }}
      >
        <NativeSelect
          label="Role"
          data={ROLES}
          value={role}
          onChange={(e) => update({ role: e.currentTarget.value })}
          styles={{ root: { display: 'flex', alignItems: 'center', gap: 8 }, label: { marginBottom: 0 } }}
        />
        <Button onClick={() => update({ search: draft.trim() })}>Search</Button>
      </SearchToolbar>

      {query.loading && !query.data ? (
        <Loading variant="table" />
      ) : query.error ? (
        <Text c="var(--lms-danger)">{query.error.message}</Text>
      ) : (
        <Stack gap="sm">
          <Text role="status" size="sm" c="dimmed" fw={500}>
            {query.data.length} {query.data.length === 1 ? 'user' : 'users'}
          </Text>
          {query.data.length === 0 ? (
            <EmptyState icon={IconUsers}>No users match these filters.</EmptyState>
          ) : (
            <UserTable users={query.data} />
          )}
        </Stack>
      )}
    </Page>
  )
}

const lastLogin = (u) => (u.last_login ? relativeTime(u.last_login) : 'Never')
const workDetails = (u) => [u.designation, u.department].filter(Boolean).join(' · ')

function UserTable({ users }) {
  return (
    <div className="surface-card rt">
      <div className="rt-table">
        <Table verticalSpacing="md" horizontalSpacing="sm" highlightOnHover className="compact-table">
          <caption className="visually-hidden">Users</caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">User</Table.Th>
              <Table.Th scope="col">Role</Table.Th>
              <Table.Th scope="col">Designation</Table.Th>
              <Table.Th scope="col">Joined</Table.Th>
              <Table.Th scope="col">Last login</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((u) => (
              <Table.Tr key={u.id}>
                <Table.Th scope="row" fw={400} w="34%">
                  <PersonCell name={u.full_name} email={u.email} />
                </Table.Th>
                <Table.Td>
                  <StatusPill status={u.role} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={workDetails(u) ? undefined : 'dimmed'} lineClamp={2} className="safe-text">
                    {workDetails(u) || '—'}
                  </Text>
                </Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDate(u.date_joined)}</Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>{lastLogin(u)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
      <ul className="rt-list">
        {users.map((u) => (
          <li key={u.id}>
            <Stack gap="xs">
              <PersonCell name={u.full_name} email={u.email} />
              <div>
                <StatusPill status={u.role} />
              </div>
              {workDetails(u) && (
                <Text size="sm" className="safe-text">
                  {workDetails(u)}
                </Text>
              )}
              <Text size="sm" c="dimmed">
                Joined {formatDate(u.date_joined)} · Last login {lastLogin(u)}
              </Text>
            </Stack>
          </li>
        ))}
      </ul>
    </div>
  )
}
