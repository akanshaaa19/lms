import { Button, Group, Text } from '@mantine/core'
import { Link } from 'react-router-dom'

import { Page } from '../components/Page.jsx'

export function NotFoundPage() {
  return (
    <Page title="Page not found">
      <Text>We could not find that page. Check the address, or go back to your home page.</Text>
      <Group>
        <Button component={Link} to="/">
          Go to your home page
        </Button>
      </Group>
    </Page>
  )
}
