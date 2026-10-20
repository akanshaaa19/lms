import { Anchor, Button, Card, Group, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconBook, IconSearch, IconUser } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { EnrolledBadge } from '../../components/Badges.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
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
    <Page title="Courses" heading="Browse courses">
      <form role="search" onSubmit={handleSearch}>
        <Group align="flex-end" gap="sm" wrap="wrap">
          <TextInput
            id="catalog-search"
            label="Search courses"
            description="Search by title or description"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            style={{ flex: '1 1 18rem' }}
            leftSection={<IconSearch size={18} aria-hidden="true" />}
          />
          <Button type="submit">Search</Button>
          {search && (
            <Button
              variant="default"
              onClick={() => {
                setDraft('')
                setSearchParams({})
              }}
            >
              Clear search
            </Button>
          )}
        </Group>
      </form>

      <Async query={query}>
        {(courses) => (
          <Stack gap="md">
            {/* Announced to screen readers whenever the results change. */}
            <Text role="status" c="dimmed">
              {courses.length === 0
                ? search
                  ? `No courses match “${search}”.`
                  : 'No courses are available yet.'
                : `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}${search ? ` matching “${search}”` : ''}`}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </SimpleGrid>
          </Stack>
        )}
      </Async>
    </Page>
  )
}

function CourseCard({ course }) {
  return (
    <Card withBorder radius="md" padding="lg" component="article">
      <Stack gap="sm" h="100%">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Title order={2} size="h3">
            <Anchor component={Link} to={`/courses/${course.id}`} c="court.8">
              {course.title}
            </Anchor>
          </Title>
          {course.is_enrolled && <EnrolledBadge />}
        </Group>
        <Text lineClamp={3}>{course.description}</Text>
        <Group gap="lg" mt="auto" c="dimmed">
          <Group gap={4}>
            <IconUser size={16} aria-hidden="true" />
            <Text size="sm">{course.instructor_name}</Text>
          </Group>
          <Group gap={4}>
            <IconBook size={16} aria-hidden="true" />
            <Text size="sm">
              {course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'}
            </Text>
          </Group>
        </Group>
      </Stack>
    </Card>
  )
}
