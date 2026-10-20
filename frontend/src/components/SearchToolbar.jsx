import { Group, TextInput } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

// The search box has a real (visually hidden) label; the placeholder is only a hint.
export function SearchToolbar({ id, label, placeholder, value, onChange, onSubmit, children }) {
  return (
    <Group justify="space-between" wrap="wrap" gap="sm" className="surface-card search-bar" p={6} pl="md">
      <form role="search" onSubmit={onSubmit ?? ((e) => e.preventDefault())} style={{ flex: '1 1 16rem' }}>
        <label htmlFor={id} className="visually-hidden">
          {label}
        </label>
        <TextInput
          id={id}
          className="toolbar-search"
          variant="unstyled"
          size="md"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          leftSection={<IconSearch size={18} aria-hidden="true" />}
          type="search"
        />
      </form>
      {children && (
        <Group gap="sm" wrap="wrap">
          {children}
        </Group>
      )}
    </Group>
  )
}
