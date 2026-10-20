import { Avatar } from '@mantine/core'

import { tokens } from '../theme.js'

function initials(name) {
  const parts = (name || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

// The same name always gets the same colour.
function colourFor(name) {
  let hash = 0
  for (const char of name || '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return tokens.avatars[hash % tokens.avatars.length]
}

// Decorative: the person's name is always shown as text next to it.
export function UserAvatar({ name, size = 40 }) {
  return (
    <Avatar
      size={size}
      radius="xl"
      aria-hidden="true"
      styles={{ placeholder: { background: colourFor(name), color: 'var(--lms-ink)', fontWeight: 600 } }}
    >
      {initials(name)}
    </Avatar>
  )
}
