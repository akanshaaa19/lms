import { Anchor, Badge, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconBook, IconBooks, IconListCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { EnrolledBadge } from '../../components/Badges.jsx'
import { EmptyState } from '../../components/EmptyState.jsx'
import { IconTile } from '../../components/IconTile.jsx'
import { Page } from '../../components/Page.jsx'
import { SearchToolbar } from '../../components/SearchToolbar.jsx'
import { Async } from '../../components/States.jsx'
import { UserAvatar } from '../../components/UserAvatar.jsx'
import { useApiData } from '../../hooks/useApiData.js'

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const [draft, setDraft] = useState(search)
  const query = useApiData(`/courses/${search ? `?search=${encodeURIComponent(search)}` : ''}`)

  function handleSearch(event) {
    event.preventDefault()
    setSearchParams(draft.trim() ? { search: draft.trim() } : {})
  }

  return (
    <Page title="Courses" heading="Browse courses" subtitle="Short courses for court and legal services staff.">
      <SearchToolbar
        id="catalog-search"
        label="Search courses by title or description"
        placeholder="Search courses…"
        value={draft}
        onChange={setDraft}
        onSubmit={handleSearch}
      >
        {search && (
          <Button
            variant="subtle"
            onClick={() => {
              setDraft('')
              setSearchParams({})
            }}
          >
            Clear
          </Button>
        )}
        <Button onClick={handleSearch}>Search</Button>
      </SearchToolbar>

      <Async query={query} skeleton="cards">
        {(courses) => (
          <Stack gap="md">
            {/* Announced to screen readers whenever the results change. */}
            <Text role="status" c="dimmed" size="sm" fw={500}>
              {courses.length === 0
                ? ''
                : `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}${search ? ` matching “${search}”` : ''}`}
            </Text>
            {courses.length === 0 ? (
              <EmptyState
                icon={IconBooks}
                action={
                  search && (
                    <Button
                      onClick={() => {
                        setDraft('')
                        setSearchParams({})
                      }}
                    >
                      Show all courses
                    </Button>
                  )
                }
              >
                {search ? `No courses match “${search}”.` : 'No courses have been published yet. Check back soon.'}
              </EmptyState>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </SimpleGrid>
            )}
          </Stack>
        )}
      </Async>
    </Page>
  )
}

function CourseCard({ course }) {
  return (
    // The title link stretches over the whole card (see .card-link in
    // styles.css): one tab stop, but the entire card is clickable.
    <article className="surface-card card-link-wrap" style={{ padding: 20 }}>
      <Stack gap="md" h="100%">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <IconTile icon={IconBook} size={44} />
          {course.is_enrolled && <EnrolledBadge />}
        </Group>
        <Stack gap={6}>
          <Title order={2} size="h3">
            <Anchor component={Link} to={`/courses/${course.id}`} c="var(--lms-ink)" fw={600} className="card-link" underline="hover">
              {course.title}
            </Anchor>
          </Title>
          <Text c="dimmed" size="sm" lineClamp={2}>
            {course.description}
          </Text>
        </Stack>
        <Group gap="xs" wrap="wrap">
          <Badge variant="outline" color="ink" radius="sm" tt="none" fw={500} leftSection={<IconBook size={13} aria-hidden="true" />}>
            {course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'}
          </Badge>
          {course.has_quiz && (
            <Badge variant="outline" color="ink" radius="sm" tt="none" fw={500} leftSection={<IconListCheck size={13} aria-hidden="true" />}>
              Quiz
            </Badge>
          )}
        </Group>
        <Group
          justify="space-between"
          mt="auto"
          pt="md"
          wrap="nowrap"
          style={{ borderTop: '1px solid var(--lms-border)' }}
        >
          <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
            <UserAvatar name={course.instructor_name} size={30} />
            <Text size="sm" fw={500} truncate>
              {course.instructor_name}
            </Text>
          </Group>
          <Text size="sm" fw={600} c="var(--lms-sage-7)" style={{ whiteSpace: 'nowrap' }} aria-hidden="true">
            {course.is_enrolled ? 'Continue →' : 'View →'}
          </Text>
        </Group>
      </Stack>
    </article>
  )
}
