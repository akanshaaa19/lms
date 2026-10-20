import { Group, Title } from '@mantine/core'

// A white dashboard card with its own h2, so screen reader users can jump
// between sections by heading.
export function SectionCard({ id, title, actions, children, padded = true }) {
  return (
    <section className="surface-card section-card" aria-labelledby={id}>
      <Group justify="space-between" wrap="wrap" gap="sm" className="section-card-header">
        <Title order={2} size="h3" id={id}>
          {title}
        </Title>
        {actions}
      </Group>
      <div className={padded ? 'section-card-body' : undefined}>{children}</div>
    </section>
  )
}
