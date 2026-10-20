import { useEffect, useRef, useState } from 'react'

// Gives an element exactly the height left between its top edge and the
// bottom of the window, so the page itself doesn't scroll and only panels
// inside it do. Returns null when `enabled` is false (narrow screens).
export function useFillViewport(enabled) {
  const ref = useRef(null)
  const [height, setHeight] = useState(null)

  useEffect(() => {
    if (!enabled) return undefined
    const element = ref.current
    if (!element) return undefined

    function measure() {
      const rect = element.getBoundingClientRect()
      // Space the page keeps below the element (padding, borders).
      const below = document.documentElement.scrollHeight - (rect.bottom + window.scrollY)
      // Rounded down, with 2px spare, so sub-pixel rounding can't make the page scroll.
      setHeight(Math.max(320, Math.floor(window.innerHeight - rect.top - window.scrollY - below) - 2))
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [enabled])

  return [ref, enabled ? height : null]
}
