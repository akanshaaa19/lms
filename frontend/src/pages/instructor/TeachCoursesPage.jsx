import { Anchor, Button, Group, Stack, Table, Text } from '@mantine/core'
import { IconBook, IconChalkboard, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '../../components/Badges.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { IconTile } from '../../components/IconTile.jsx'
import { Page } from '../../components/Page.jsx'
import { SearchToolbar } from '../../components/SearchToolbar.jsx'
import { SortableTh } from '../../components/SortableTh.jsx'
import { Stat, StatRow } from '../../components/Stat.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { useSort } from '../../hooks/useSort.js'
import { formatDate, matches } from '../../utils/format.js'

const newCourseButton = (
  <Button component={Link} to="/teach/courses/new" leftSection={<IconPlus size={18} aria-hidden="true" />}>
    New course
  </Button>
)

export function TeachCoursesPage() {
  const query = useApiData('/courses/')
  return (
    <Page title="My teaching" heading="Your courses" subtitle="Create courses, add lessons and a quiz, and follow your learners.">
      <Async query={query} skeleton="table">
        {(courses) =>
          courses.length === 0 ? (
            <EmptyState icon={IconChalkboard} action={newCourseButton}>
              You have not created any courses yet.
            </EmptyState>
          ) : (
            <CourseTable courses={courses} />
          )
        }
      </Async>
    </Page>
  )
}

const SORT_GETTERS = {
  title: (c) => c.title.toLowerCase(),
  status: (c) => c.status,
  lessons: (c) => c.lesson_count,
  updated: (c) => c.updated_at,
}

function CourseTable({ courses }) {
  const [search, setSearch] = useState('')
  const filtered = courses.filter((c) => matches(c.title, search) || matches(c.description, search))
  const { sorted, sort, onSort } = useSort(filtered, SORT_GETTERS, { column: 'updated', direction: 'desc' })
  const published = courses.filter((c) => c.status === 'published').length

  return (
    <Stack gap="xl">
      <StatRow label="Course summary">
        <Stat label="Courses" value={courses.length} />
        <Stat label="Published" value={published} />
        <Stat label="Drafts" value={courses.length - published} />
        <Stat label="With a quiz" value={courses.filter((c) => c.has_quiz).length} />
      </StatRow>

      <Stack gap="md">
        <SearchToolbar
          id="teach-search"
          label="Filter your courses"
          placeholder="Filter courses…"
          value={search}
          onChange={setSearch}
        >
          {newCourseButton}
        </SearchToolbar>

        <Text role="status" size="sm" c="dimmed" fw={500}>
          {sorted.length === courses.length
            ? `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`
            : `${sorted.length} of ${courses.length} courses match`}
        </Text>

        <div className="table-card">
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="md" horizontalSpacing="lg" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <SortableTh column="title" sort={sort} onSort={onSort}>
                    Course
                  </SortableTh>
                  <SortableTh column="status" sort={sort} onSort={onSort}>
                    Status
                  </SortableTh>
                  <SortableTh column="lessons" sort={sort} onSort={onSort}>
                    Lessons
                  </SortableTh>
                  <Table.Th scope="col">Quiz</Table.Th>
                  <SortableTh column="updated" sort={sort} onSort={onSort}>
                    Last updated
                  </SortableTh>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sorted.map((course) => (
                  <Table.Tr key={course.id}>
                    <Table.Th scope="row" fw={400}>
                      <Group gap="md" wrap="nowrap">
                        <IconTile icon={IconBook} size={40} />
                        <div style={{ minWidth: 0 }}>
                          <Anchor component={Link} to={`/teach/courses/${course.id}`} fw={600} c="var(--lms-ink)" underline="hover">
                            {course.title}
                          </Anchor>
                          <Text size="sm" c="dimmed" lineClamp={1}>
                            {course.description}
                          </Text>
                        </div>
                      </Group>
                    </Table.Th>
                    <Table.Td>
                      <StatusBadge status={course.status} />
                    </Table.Td>
                    <Table.Td>{course.lesson_count}</Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{course.has_quiz ? 'Yes' : 'Not yet'}</Table.Td>
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDate(course.updated_at)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </div>
      </Stack>
    </Stack>
  )
}
