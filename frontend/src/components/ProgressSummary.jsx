import { Progress, Stack, Text } from '@mantine/core'

import { progressText } from '../utils/format.js'

// The text is the accessible version; the bar is a visual extra, so it's
// hidden from screen readers to avoid reading the same thing twice.
export function ProgressSummary({ completed, total, percent }) {
  return (
    <Stack gap={6}>
      <Text fw={600}>{progressText(completed, total, percent)}</Text>
      <Progress value={percent} size="lg" radius="xl" aria-hidden="true" />
    </Stack>
  )
}
