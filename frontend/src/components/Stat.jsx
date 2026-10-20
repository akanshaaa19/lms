import { Text } from '@mantine/core'

import { ProgressRing } from './ProgressRing.jsx'

// A row of key numbers separated by thin dividers.
export function StatRow({ children, label }) {
  return (
    <div className="stat-row" role="group" aria-label={label}>
      {children}
    </div>
  )
}

export function Stat({ label, value, ring, hint }) {
  return (
    <div className="stat">
      {ring !== undefined && <ProgressRing value={ring} size={52} thickness={6} />}
      <div>
        <Text size="sm" c="dimmed" fw={500}>
          {label}
        </Text>
        <div className="stat-value">{value}</div>
        {hint && (
          <Text size="sm" c="dimmed" mt={2}>
            {hint}
          </Text>
        )}
      </div>
    </div>
  )
}
