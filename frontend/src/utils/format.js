export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function progressText(completed, total, percent) {
  const noun = total === 1 ? 'lesson' : 'lessons'
  return `${completed} of ${total} ${noun} done (${percent}%)`
}

export function learnerStatus(completed, total) {
  if (completed === 0) return 'not_started'
  if (total > 0 && completed >= total) return 'completed'
  return 'in_progress'
}

export function matches(text, search) {
  return (text || '').toLowerCase().includes(search.trim().toLowerCase())
}

// "3 minutes ago", "yesterday", or a short date for anything older than a week.
export function relativeTime(value) {
  if (!value) return ''
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'just now'
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), 'day')
  return formatDate(value)
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
