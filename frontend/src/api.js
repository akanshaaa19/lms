// A small wrapper around fetch for talking to the Django API.
//
// Auth is Django's session cookie (HttpOnly, so JavaScript never sees it).
// For any request that changes data, Django also needs the CSRF token: we
// read it from the `csrftoken` cookie and send it back in a header.

export class ApiError extends Error {
  constructor(status, body) {
    super(messageFor(status, body))
    this.status = status
    this.body = body
  }
}

function messageFor(status, body) {
  if (body && typeof body === 'object') {
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.non_field_errors)) return body.non_field_errors[0]
  }
  if (status === 0) return 'Could not reach the server. Check your connection and try again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 404) return 'This page is not available.'
  if (status >= 500) return 'Something went wrong on the server. Please try again.'
  return 'Something went wrong. Please check the form and try again.'
}

function getCookie(name) {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    // Read the cookie fresh every time: Django rotates the token on login.
    const token = getCookie('csrftoken')
    if (token) headers['X-CSRFToken'] = token
  }

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, null)
  }

  if (response.status === 204) return null
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!response.ok) throw new ApiError(response.status, data)
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path, body) => request('DELETE', path, body),
}
