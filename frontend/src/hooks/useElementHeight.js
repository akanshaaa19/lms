import { useEffect, useRef, useState } from 'react'

// Measures an element's height and keeps it up to date (it changes when
// buttons wrap on narrow screens or at high zoom).
export function useElementHeight() {
  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => setHeight(entry.target.getBoundingClientRect().height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, height]
}
