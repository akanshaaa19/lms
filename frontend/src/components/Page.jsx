import { Group, Stack, Title } from '@mantine/core'
import { useEffect, useRef } from 'react'

// Every page uses this. It sets the browser tab title and moves focus to the
// page's single h1 when the page opens. In a single-page app the browser
// doesn't do this by itself, so without it screen reader users wouldn't
// know the page had changed.
export function Page({ title, heading, actions, children }) {
  const headingRef = useRef(null)

  useEffect(() => {
    document.title = `${title} · Court Staff Learning`
  }, [title])

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <Title order={1} ref={headingRef} tabIndex={-1} className="page-heading">
          {heading ?? title}
        </Title>
        {actions}
      </Group>
      {children}
    </Stack>
  )
}
