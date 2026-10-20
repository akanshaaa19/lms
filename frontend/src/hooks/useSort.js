import { useMemo, useState } from 'react'

// Sorts rows by a column. `getters` maps a column name to a function that
// returns the value to compare for a row.
export function useSort(rows, getters, initial) {
  const [sort, setSort] = useState(initial)

  const sorted = useMemo(() => {
    const get = getters[sort.column]
    if (!get) return rows
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = get(a)
      const y = get(b)
      if (x === y) return 0
      if (x === null || x === undefined) return 1
      if (y === null || y === undefined) return -1
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * factor
    })
  }, [rows, getters, sort])

  function onSort(column) {
    setSort((s) => ({ column, direction: s.column === column && s.direction === 'asc' ? 'desc' : 'asc' }))
  }

  return { sorted, sort, onSort }
}
