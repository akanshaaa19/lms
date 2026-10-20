// Turns a DRF error body into messages a person can read.
// DRF sends {"field": ["message"]}, nested lists for nested data, and
// {"detail": "..."} or {"non_field_errors": [...]} for general problems.

function firstMessage(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item)
      if (message) return message
    }
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const message = firstMessage(item)
      if (message) return message
    }
  }
  return null
}

export function splitServerErrors(error, fieldNames) {
  const fieldErrors = {}
  const general = []
  const body = error?.body
  if (!body || typeof body !== 'object') {
    general.push(error?.message || 'Something went wrong. Please try again.')
    return { fieldErrors, general }
  }
  for (const [key, value] of Object.entries(body)) {
    const message = firstMessage(value)
    if (!message) continue
    if (fieldNames.includes(key)) fieldErrors[key] = message
    else general.push(message)
  }
  if (Object.keys(fieldErrors).length === 0 && general.length === 0) {
    general.push(error.message)
  }
  return { fieldErrors, general }
}

// In the order the fields appear on the page. `fields` is [{ name, id }].
export function errorItems(errors, fields) {
  return fields
    .filter((field) => errors[field.name])
    .map((field) => ({ id: field.id, message: errors[field.name] }))
}
