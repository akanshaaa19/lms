import { Alert, Button, Group, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core'
import { IconAlertTriangle, IconSearchOff } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { EmptyState } from './EmptyState.jsx'
import { Page } from './Page.jsx'

// Skeleton placeholders shaped like the content that's coming, with a
// "Loading…" message announced to screen readers.
export function Loading({ variant = 'page', label = 'Loading…' }) {
  return (
    <Stack gap="lg" aria-busy="true">
      <span role="status" className="visually-hidden">
        {label}
      </span>
      <Skeleton height={34} width="40%" radius="md" />
      {variant === 'cards' && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={220} radius="lg" />
          ))}
        </SimpleGrid>
      )}
      {variant === 'table' && (
        <Stack gap="sm">
          <Skeleton height={64} radius="lg" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={56} radius="md" />
          ))}
        </Stack>
      )}
      {variant === 'page' && (
        <Stack gap="sm">
          <Skeleton height={16} radius="xl" />
          <Skeleton height={16} radius="xl" width="90%" />
          <Skeleton height={16} radius="xl" width="70%" />
          <Skeleton height={180} radius="lg" mt="md" />
        </Stack>
      )}
    </Stack>
  )
}

export function ErrorState({ error, onRetry, backTo = '/', backLabel = 'Go to your home page' }) {
  if (error?.status === 404) {
    return (
      <Page title="Not available" heading="This page is not available">
        <EmptyState
          icon={IconSearchOff}
          action={
            <Button component={Link} to={backTo}>
              {backLabel}
            </Button>
          }
        >
          It may have been removed, or it may not be published yet.
        </EmptyState>
      </Page>
    )
  }
  return (
    <Page title="Something went wrong">
      <Alert
        variant="light"
        icon={<IconAlertTriangle aria-hidden="true" />}
        styles={{ root: { background: 'var(--lms-danger-tint)' }, icon: { color: 'var(--lms-danger)' } }}
      >
        <Text style={{ color: 'var(--lms-danger)' }} fw={500}>
          {error?.message || 'Something went wrong. Please try again.'}
        </Text>
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
export function Async({ query, children, skeleton = 'page', ...errorProps }) {
  if (query.loading && !query.data) return <Loading variant={skeleton} />
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} {...errorProps} />
  return children(query.data)
}
