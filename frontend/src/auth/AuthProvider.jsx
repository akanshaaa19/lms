import { useCallback, useEffect, useMemo, useState } from 'react'

import { api, loadCsrfToken, onAuthError } from '../api.js'
import { AuthContext } from './context.js'

// Holds the logged-in user for the whole app. The real check is always on
// the server; this only decides which pages and links to show.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [startupError, setStartupError] = useState(null)

  const refresh = useCallback(async () => {
    const data = await api.get('/auth/me/')
    setUser(data.user)
    return data.user
  }, [])

  useEffect(() => {
    async function start() {
      try {
        await loadCsrfToken()
        await refresh()
      } catch (error) {
        setStartupError(error)
      } finally {
        setReady(true)
      }
    }
    start()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login/', { email, password })
    setUser(data.user)
    return data.user
  }, [])

  const signup = useCallback(async (values) => {
    const data = await api.post('/auth/signup/', values)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/')
    } finally {
      // Clear the screen even if the request failed: on a shared computer,
      // the next person must not see this user's data.
      setUser(null)
    }
  }, [])

  // A 401/403 can mean the session expired or the role changed (e.g. an
  // instructor was revoked). Re-check who is logged in, so the route guards
  // send the user to the right place instead of leaving a stale screen.
  useEffect(() => onAuthError(() => refresh().catch(() => {})), [refresh])

  const value = useMemo(
    () => ({ user, ready, startupError, login, signup, logout, refresh }),
    [user, ready, startupError, login, signup, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
