import { Button } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'

import { EmptyState } from '../../components/EmptyState.jsx'
import { Page } from '../../components/Page.jsx'

export function AdminHomePage() {
  return (
    <Page title="Administration">
      <EmptyState
        icon={IconSettings}
        action={
          // A normal link: the admin is a separate Django-rendered site.
          <Button component="a" href="/admin/">
            Open the admin site
          </Button>
        }
      >
        Use the Django admin to approve instructors and manage all data.
      </EmptyState>
    </Page>
  )
}
