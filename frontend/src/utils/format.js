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

// Where a learner is in a course, for status labels.
export function learnerStatus(completed, total) {
  if (completed === 0) return 'not_started'
  if (total > 0 && completed >= total) return 'completed'
  return 'in_progress'
}

export function matches(text, search) {
  return (text || '').toLowerCase().includes(search.trim().toLowerCase())
}
