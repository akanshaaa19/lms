import { Alert, Stack, Text } from '@mantine/core'
import { IconHourglass } from '@tabler/icons-react'
import { Navigate } from 'react-router-dom'

import { homePathFor, useAuth } from '../../auth/context.js'
import { Page } from '../../components/Page.jsx'

export function PendingPage() {
  const { user } = useAuth()
  if (user.role !== 'pending_instructor') return <Navigate to={homePathFor(user.role)} replace />

  return (
    <Page title="Instructor request pending" heading="Your instructor request is pending">
      <Alert color="court" variant="light" icon={<IconHourglass aria-hidden="true" />} maw={640}>
        <Stack gap="xs">
          <Text>
            Thank you for signing up, {user.first_name}. An administrator needs to approve your request before you can
            create courses.
          </Text>
          <Text>There is nothing else you need to do. Once you are approved, log in again to see your instructor tools.</Text>
        </Stack>
      </Alert>
    </Page>
  )
}
