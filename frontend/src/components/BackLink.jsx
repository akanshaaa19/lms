import { Anchor, Group } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

export function BackLink({ to, children }) {
  return (
    <Anchor component={Link} to={to} fw={500}>
      <Group gap={4} component="span">
        <IconArrowLeft size={18} aria-hidden="true" />
        {children}
      </Group>
    </Anchor>
  )
}
