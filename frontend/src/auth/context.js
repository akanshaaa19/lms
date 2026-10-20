import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// Where each kind of user lands after logging in.
export function homePathFor(role) {
  switch (role) {
    case 'learner':
    case 'instructor':
      return '/dashboard'
    case 'pending_instructor':
      return '/pending'
    case 'admin':
      return '/admin-home'
    default:
      return '/login'
  }
}
