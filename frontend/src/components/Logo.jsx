import { Group, Text } from '@mantine/core'
import { IconScale } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

export function Logo({ inverted = false }) {
  return (
    <Group
      component={Link}
      to="/"
      gap={10}
      wrap="nowrap"
      style={{ textDecoration: 'none', color: inverted ? 'var(--lms-surface)' : 'var(--lms-ink)', position: 'relative' }}
    >
      <span
        className="icon-tile"
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          background: inverted ? 'var(--lms-sage-4)' : 'var(--lms-ink)',
          color: inverted ? 'var(--lms-ink)' : 'var(--lms-surface)',
        }}
      >
        <IconScale size={20} stroke={2} />
      </span>
      <Text fw={700} fz={17} lh={1.2}>
        Court Staff Learning
      </Text>
    </Group>
  )
}
