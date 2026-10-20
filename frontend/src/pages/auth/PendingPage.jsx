import { Stack, Text } from '@mantine/core'
import { IconHourglassHigh } from '@tabler/icons-react'
import { Navigate } from 'react-router-dom'

import { homePathFor, useAuth } from '../../auth/context.js'
import { EmptyState } from '../../components/EmptyState.jsx'
import { Page } from '../../components/Page.jsx'

export function PendingPage() {
  const { user } = useAuth()
  if (user.role !== 'pending_instructor') return <Navigate to={homePathFor(user.role)} replace />

  return (
    <Page title="Instructor request pending" heading="Your instructor request is pending">
      <EmptyState icon={IconHourglassHigh}>
        <Stack gap="xs" component="span">
          <Text component="span">
            Thank you for signing up, {user.first_name}. An administrator needs to approve your request before you can
            create courses.
          </Text>
          <Text component="span" c="dimmed">
            There is nothing else you need to do. Once you are approved, log in again to see your instructor tools.
          </Text>
        </Stack>
      </EmptyState>
    </Page>
  )
}
