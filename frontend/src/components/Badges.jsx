import { Badge } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'

import { StatusPill } from './StatusLabel.jsx'

// Every badge has text; colour is never the only signal.

export function StatusBadge({ status }) {
  return <StatusPill status={status === 'published' ? 'published' : 'draft'} />
}

export function ResultBadge({ passed }) {
  if (passed === null || passed === undefined) return null
  return <StatusPill status={passed ? 'passed' : 'not_passed'} />
}

export function EnrolledBadge() {
  return (
    <Badge
      variant="light"
      radius="xl"
      size="lg"
      leftSection={<IconCheck size={14} aria-hidden="true" />}
      styles={{
        root: { background: 'var(--lms-sage-1)', color: 'var(--lms-ink)', textTransform: 'none', fontWeight: 600 },
      }}
    >
      Enrolled
    </Badge>
  )
}

export function TagPill({ children }) {
  return <span className="tag-pill">{children}</span>
}
