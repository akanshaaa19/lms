import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { homePathFor, useAuth } from './context.js'

// These guards only control what the UI shows. Every API endpoint checks
// permissions again on the server, so hiding a page is never the only defence.

export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  // A pending instructor can only see the "waiting for approval" page.
  if (user.role === 'pending_instructor' && location.pathname !== '/pending') {
    return <Navigate to="/pending" replace />
  }
  return <Outlet />
}

export function RequireRole({ roles }) {
  const { user } = useAuth()
  if (!roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return <Outlet />
}

export function GuestOnly() {
  const { user } = useAuth()
  if (user) return <Navigate to={homePathFor(user.role)} replace />
  return <Outlet />
}

export function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}
