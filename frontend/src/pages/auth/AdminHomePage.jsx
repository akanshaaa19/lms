import { Button, Group, Text } from '@mantine/core'

import { Page } from '../../components/Page.jsx'

export function AdminHomePage() {
  return (
    <Page title="Administration">
      <Text>
        Your account has no learner or instructor role. Use the Django admin to approve instructors and manage all data.
      </Text>
      <Group>
        {/* A normal link: the admin is a separate Django-rendered site. */}
        <Button component="a" href="/admin/">
          Open the admin site
        </Button>
      </Group>
    </Page>
  )
}
