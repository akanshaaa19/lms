import { Stack, Text } from '@mantine/core'

import { IconTile } from './IconTile.jsx'

export function EmptyState({ icon, children, action }) {
  return (
    <div className="surface-card" style={{ padding: '40px 24px' }}>
      <Stack align="center" gap="md" ta="center">
        <IconTile icon={icon} size={52} />
        <Text maw={460}>{children}</Text>
        {action}
      </Stack>
    </div>
  )
}
