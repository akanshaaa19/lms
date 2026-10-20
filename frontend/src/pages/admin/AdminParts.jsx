import { Button, Group, Text, VisuallyHidden } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'

import { ConfirmDialog } from '../../components/ConfirmDialog.jsx'
import { UserAvatar } from '../../components/UserAvatar.jsx'

export function PersonCell({ name, email, size = 36 }) {
  return (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
      <UserAvatar name={name || email} size={size} />
      <div style={{ minWidth: 0 }}>
        <Text fw={600} className="safe-text" lineClamp={1}>
          {name || email}
        </Text>
        <Text size="sm" c="dimmed" className="safe-text" lineClamp={1}>
          {email}
        </Text>
      </div>
    </Group>
  )
}

export function InstructorActions({ instructor, actions }) {
  const busy = actions.busyId === instructor.id
  return instructor.is_approved ? (
    <Button variant="subtle" color="danger" size="sm" onClick={() => actions.setRevokeTarget(instructor)} disabled={busy}>
      Revoke<VisuallyHidden> instructor access for {instructor.full_name}</VisuallyHidden>
    </Button>
  ) : (
    <Button size="sm" onClick={() => actions.approve(instructor)} loading={busy} leftSection={<IconCheck size={16} aria-hidden="true" />}>
      Approve<VisuallyHidden> {instructor.full_name}</VisuallyHidden>
    </Button>
  )
}

export function RevokeDialog({ actions }) {
  const target = actions.revokeTarget
  return (
    <ConfirmDialog
      opened={Boolean(target)}
      onClose={() => actions.setRevokeTarget(null)}
      title="Revoke instructor access?"
      confirmLabel="Revoke access"
      onConfirm={actions.confirmRevoke}
      loading={Boolean(target) && actions.busyId === target.id}
      danger
    >
      <Text>
        Revoke instructor access for {target?.full_name}? Their courses stay, and learners keep their records, but they
        won't be able to manage courses until approved again.
      </Text>
    </ConfirmDialog>
  )
}
