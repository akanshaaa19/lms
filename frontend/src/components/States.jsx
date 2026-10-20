import { Alert, Button, Center, Group, Loader, Text } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Page } from './Page.jsx'

export function Loading({ label = 'Loading…' }) {
  return (
    // role="status" announces the loading text without moving focus.
    <Center py="xl" role="status">
      <Group gap="sm">
        <Loader size="sm" aria-hidden="true" />
        <Text>{label}</Text>
      </Group>
    </Center>
  )
}

export function ErrorState({ error, onRetry, backTo = '/', backLabel = 'Go to your home page' }) {
  if (error?.status === 404) {
    return (
      <Page title="Not available" heading="This page is not available">
        <Text>It may have been removed, or it may not be published yet.</Text>
        <Group>
          <Button component={Link} to={backTo}>
            {backLabel}
          </Button>
        </Group>
      </Page>
    )
  }
  return (
    <Page title="Something went wrong">
      <Alert color="red" variant="light" icon={<IconAlertTriangle aria-hidden="true" />}>
        {error?.message || 'Something went wrong. Please try again.'}
      </Alert>
      <Group>
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        <Button component={Link} to={backTo} variant="default">
          {backLabel}
        </Button>
      </Group>
    </Page>
  )
}

// Shows loading or error states for a useApiData() result, otherwise
// renders children with the loaded data.
export function Async({ query, children, ...errorProps }) {
  if (query.loading && !query.data) return <Loading />
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} {...errorProps} />
  return children(query.data)
}
