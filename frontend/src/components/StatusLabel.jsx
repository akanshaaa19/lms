import { Group, Text } from '@mantine/core'

const STATUSES = {
  not_started: { label: 'Not started', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'warning' },
  completed: { label: 'Completed', tone: 'success' },
  passed: { label: 'Passed', tone: 'success' },
  not_passed: { label: 'Not passed yet', tone: 'danger' },
  published: { label: 'Published', tone: 'success' },
  draft: { label: 'Draft', tone: 'neutral' },
  removed: { label: 'Removed', tone: 'danger' },
  pending: { label: 'Pending', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  learner: { label: 'Learner', tone: 'neutral' },
  instructor: { label: 'Instructor', tone: 'success' },
  pending_instructor: { label: 'Pending instructor', tone: 'warning' },
  admin: { label: 'Admin', tone: 'neutral' },
}

// Unknown values get a neutral label instead of crashing the page.
function statusFor(status) {
  return STATUSES[status] ?? { label: status ? String(status) : 'Unknown', tone: 'neutral' }
}

// A coloured dot plus a text label: the colour is never the only signal.
export function StatusLabel({ status, label }) {
  const { label: defaultLabel, tone } = statusFor(status)
  return (
    <Group gap={8} wrap="nowrap" component="span">
      <span className="status-dot" style={{ background: `var(--lms-${tone}-dot)` }} aria-hidden="true" />
      <Text component="span" size="sm" fw={500} style={{ color: `var(--lms-${tone})`, whiteSpace: 'nowrap' }}>
        {label ?? defaultLabel}
      </Text>
    </Group>
  )
}

export function StatusPill({ status, label }) {
  const { tone } = statusFor(status)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 999,
        background: `var(--lms-${tone}-tint)`,
        border: '1px solid var(--lms-border)',
      }}
    >
      <StatusLabel status={status} label={label} />
    </span>
  )
}
