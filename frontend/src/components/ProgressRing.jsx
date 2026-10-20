import { Group, RingProgress, Text } from '@mantine/core'

// The ring is a visual extra and hidden from screen readers; the number
// next to it (or inside it) is the real information.
export function ProgressRing({ value, size = 36, thickness, label }) {
  return (
    <RingProgress
      size={size}
      thickness={thickness ?? Math.max(3, Math.round(size / 9))}
      roundCaps
      rootColor="var(--lms-border)"
      sections={[{ value: Math.max(0, Math.min(100, value)), color: 'sage.5' }]}
      label={label}
      aria-hidden={label ? undefined : 'true'}
    />
  )
}

export function RingWithPercent({ value, size = 32 }) {
  return (
    <Group gap={10} wrap="nowrap">
      <ProgressRing value={value} size={size} />
      <Text fw={600} size="sm">
        {value}%
      </Text>
    </Group>
  )
}
