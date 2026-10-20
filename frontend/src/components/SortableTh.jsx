import { Table } from '@mantine/core'
import { IconArrowDown, IconArrowUp, IconSelector } from '@tabler/icons-react'

// A column header that sorts the table. aria-sort tells screen readers
// which column is sorted and in which direction.
export function SortableTh({ column, sort, onSort, children }) {
  const active = sort.column === column
  const ariaSort = active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
  const Icon = !active ? IconSelector : sort.direction === 'asc' ? IconArrowUp : IconArrowDown
  return (
    <Table.Th scope="col" aria-sort={ariaSort}>
      <button type="button" className="sort-button" onClick={() => onSort(column)}>
        {children}
        <Icon size={15} aria-hidden="true" />
      </button>
    </Table.Th>
  )
}
