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
