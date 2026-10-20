import { useCallback, useEffect, useMemo, useState } from 'react'

import { api } from '../api.js'
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
        await api.get('/auth/csrf/') // sets the csrftoken cookie
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
    await api.post('/auth/logout/')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, ready, startupError, login, signup, logout, refresh }),
    [user, ready, startupError, login, signup, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
