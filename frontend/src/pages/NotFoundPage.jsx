import { Button } from '@mantine/core'
import { IconSearchOff } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '../components/EmptyState.jsx'
import { Page } from '../components/Page.jsx'

export function NotFoundPage() {
  return (
    <Page title="Page not found">
      <EmptyState
        icon={IconSearchOff}
        action={
          <Button component={Link} to="/">
            Go to your home page
          </Button>
        }
      >
        We could not find that page. Check the address, or go back to your home page.
      </EmptyState>
    </Page>
  )
}
