import { Alert, Anchor, List, Title } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'

// Lists every problem at the top of a form, each linking to its field.
// It takes focus after a failed submit, so screen reader users hear the
// problems straight away instead of hunting for red text.
export function ErrorSummary({ items = [], general = [], focusKey = 0 }) {
  const ref = useRef(null)
  const visible = items.length > 0 || general.length > 0

  useEffect(() => {
    if (focusKey > 0) ref.current?.focus()
  }, [focusKey])

  if (!visible) return null

  function focusField(event, id) {
    event.preventDefault()
    document.getElementById(id)?.focus()
  }

  return (
    <Alert
      ref={ref}
      tabIndex={-1}
      className="error-summary"
      color="danger"
      variant="outline"
      radius="lg"
      styles={{ root: { background: 'var(--lms-danger-tint)', borderWidth: 2 }, icon: { color: 'var(--lms-danger)' } }}
      icon={<IconAlertCircle aria-hidden="true" />}
      title={
        <Title order={2} size="h4">
          There is a problem
        </Title>
      }
    >
      <List spacing={4}>
        {general.map((message) => (
          <List.Item key={message}>{message}</List.Item>
        ))}
        {items.map((item) => (
          <List.Item key={item.id}>
            <Anchor href={`#${item.id}`} c="var(--lms-danger)" fw={600} onClick={(e) => focusField(e, item.id)}>
              {item.message}
            </Anchor>
          </List.Item>
        ))}
      </List>
    </Alert>
  )
}
