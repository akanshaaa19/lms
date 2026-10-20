import { useState } from 'react'

import { splitServerErrors } from '../utils/errors.js'

// Wraps a Mantine form's submit: runs the action, maps server errors onto
// fields, and counts failed attempts so the error summary can take focus.
export function useFormSubmit(form, action) {
  const [general, setGeneral] = useState([])
  const [attempt, setAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = form.onSubmit(
    async (values) => {
      setGeneral([])
      setSubmitting(true)
      try {
        await action(values)
      } catch (error) {
        const { fieldErrors, general: messages } = splitServerErrors(
          error,
          Object.keys(form.getValues()),
        )
        form.setErrors(fieldErrors)
        setGeneral(messages)
        setAttempt((a) => a + 1)
      } finally {
        setSubmitting(false)
      }
    },
    () => {
      setGeneral([])
      setAttempt((a) => a + 1)
    },
  )

  return { onSubmit, general, attempt, submitting }
}
