import { Badge } from '@mantine/core'
import { IconCheck, IconPencil, IconWorld, IconX } from '@tabler/icons-react'

// Badges always include text; colour is never the only signal.

export function StatusBadge({ status }) {
  if (status === 'published') {
    return (
      <Badge color="green.9" variant="light" leftSection={<IconWorld size={14} aria-hidden="true" />}>
        Published
      </Badge>
    )
  }
  return (
    <Badge color="gray.8" variant="light" leftSection={<IconPencil size={14} aria-hidden="true" />}>
      Draft
    </Badge>
  )
}

export function ResultBadge({ passed }) {
  if (passed === null || passed === undefined) return null
  return passed ? (
    <Badge color="green.9" variant="light" leftSection={<IconCheck size={14} aria-hidden="true" />}>
      Passed
    </Badge>
  ) : (
    <Badge color="red.9" variant="light" leftSection={<IconX size={14} aria-hidden="true" />}>
      Not passed yet
    </Badge>
  )
}

export function EnrolledBadge() {
  return (
    <Badge color="court" variant="light" leftSection={<IconCheck size={14} aria-hidden="true" />}>
      Enrolled
    </Badge>
  )
}
