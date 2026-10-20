import { notifications } from '@mantine/notifications'
import { useState } from 'react'

import { api } from '../../api.js'

// Approve and revoke, shared by the overview card and the instructors page.
// `onUpdated(id, changes)` lets the caller update its own rows.
export function useInstructorActions(onUpdated) {
  const [busyId, setBusyId] = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)

  async function approve(instructor) {
    setBusyId(instructor.id)
    try {
      const result = await api.post(`/admin/instructors/${instructor.id}/approve/`)
      onUpdated(instructor.id, { is_approved: true, approved_at: result.approved_at })
      notifications.show({ message: `Approved ${instructor.full_name}. They can now create courses.` })
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not approve', message: error.message })
    } finally {
      setBusyId(null)
    }
  }

  async function confirmRevoke() {
    const instructor = revokeTarget
    setBusyId(instructor.id)
    try {
      await api.post(`/admin/instructors/${instructor.id}/revoke/`)
      onUpdated(instructor.id, { is_approved: false, approved_at: null })
      notifications.show({ message: `Revoked instructor access for ${instructor.full_name}.` })
      setRevokeTarget(null)
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not revoke', message: error.message })
    } finally {
      setBusyId(null)
    }
  }

  return { approve, busyId, revokeTarget, setRevokeTarget, confirmRevoke }
}
