import { Anchor, Breadcrumbs, Group, Stack, Text, Title } from '@mantine/core'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// Every page uses this. It sets the browser tab title and moves focus to
// the page's single h1 when the page opens. A single-page app doesn't do
// this by itself, so without it screen reader users wouldn't hear that
// the page changed.
export function Page({ title, heading, subtitle, breadcrumbs, actions, tabs, children }) {
  const headingRef = useRef(null)

  useEffect(() => {
    document.title = `${title} · Court Staff Learning`
  }, [title])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Stack gap="xl">
      <Stack gap="sm">
        {breadcrumbs && (
          <nav aria-label="Breadcrumb">
            <Breadcrumbs separator="/" separatorMargin={6}>
              {breadcrumbs.map((crumb) =>
                crumb.to ? (
                  <Anchor key={crumb.label} component={Link} to={crumb.to} size="sm" fw={500}>
                    {crumb.label}
                  </Anchor>
                ) : (
                  <Text key={crumb.label} size="sm" c="dimmed" aria-current="page">
                    {crumb.label}
                  </Text>
                ),
              )}
            </Breadcrumbs>
          </nav>
        )}
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Title order={1} ref={headingRef} tabIndex={-1} className="page-heading">
              {heading ?? title}
            </Title>
            {subtitle && <Text c="dimmed">{subtitle}</Text>}
          </Stack>
          {actions}
        </Group>
        {tabs}
      </Stack>
      {children}
    </Stack>
  )
}
