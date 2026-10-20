import { Group, Stack, Text } from '@mantine/core'

import { progressText } from '../utils/format.js'
import { ProgressRing } from './ProgressRing.jsx'

// The ring is decorative; the sentence beside it carries the information.
export function ProgressSummary({ completed, total, percent, size = 64 }) {
  return (
    <Group gap="md" wrap="nowrap">
      <ProgressRing
        value={percent}
        size={size}
        thickness={Math.round(size / 9)}
        label={
          <Text ta="center" fw={700} size={size >= 64 ? 'sm' : 'xs'} aria-hidden="true">
            {percent}%
          </Text>
        }
      />
      <Stack gap={2}>
        <Text fw={600}>{progressText(completed, total, percent)}</Text>
      </Stack>
    </Group>
  )
}
