import { useCallback, useEffect, useState } from 'react'

import { api } from '../api.js'

// Loads data from a GET endpoint and tracks loading and error states,
// so pages never show a blank screen.
export function useApiData(path) {
  const [version, setVersion] = useState(0)
  const requestKey = `${path}#${version}`
  // `key` records which request the stored result belongs to. While it
  // doesn't match the current request, we're loading.
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    let cancelled = false
    api
      .get(path)
      .then((data) => !cancelled && setResult({ key: requestKey, data, error: null }))
      .catch((error) => !cancelled && setResult({ key: requestKey, data: null, error }))
    return () => {
      cancelled = true
    }
  }, [path, requestKey])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback((data) => setResult((r) => ({ ...r, data })), [])

  return {
    data: result.data,
    error: result.key === requestKey ? result.error : null,
    loading: result.key !== requestKey,
    reload,
    setData,
  }
}
