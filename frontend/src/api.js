// Auth is Django's session cookie (HttpOnly, so JavaScript never sees it).
// For any request that changes data, Django also needs the CSRF token,
// sent back in a header.

// Where Django lives, from VITE_API_URL (see .env.development / .env.production).
// Empty means "this same site": a proxy (Vite in dev, or a hosting rewrite)
// forwards /api to Django.
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const crossSite = API_URL !== ''

// When Django is on another domain, its csrftoken cookie can't be read from
// here, so we keep the token Django returns from /auth/csrf/ instead.
let csrfToken = null

let authErrorHandler = null
export function onAuthError(handler) {
  authErrorHandler = handler
  return () => {
    if (authErrorHandler === handler) authErrorHandler = null
  }
}

export async function loadCsrfToken() {
  const data = await request('GET', '/auth/csrf/')
  csrfToken = data?.csrfToken ?? null
}

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
    // Prefer the cookie when we can read it: it's always current.
    const token = getCookie('csrftoken') ?? csrfToken
    if (token) headers['X-CSRFToken'] = token
  }

  let response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      // Send the session cookie to Django, even when it's on another domain.
      credentials: crossSite ? 'include' : 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, null)
  }

  if (response.status === 204) return null
  // A web page instead of JSON means the request never reached Django,
  // usually because VITE_API_URL is missing from the build.
  if (response.ok && !(response.headers.get('content-type') ?? '').includes('application/json')) {
    throw new ApiError(response.status, {
      detail: `The app couldn't reach its server: ${API_URL || 'this site'}/api returned a web page instead of data. Check VITE_API_URL.`,
    })
  }
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !path.startsWith('/auth/')) authErrorHandler?.()
    throw new ApiError(response.status, data)
  }
  // Django issues a new CSRF token on login, sign-up and logout.
  if (method !== 'GET' && path.startsWith('/auth/') && path !== '/auth/profile/') await loadCsrfToken()
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path, body) => request('DELETE', path, body),
}
