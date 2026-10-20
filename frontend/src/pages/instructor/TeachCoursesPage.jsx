import { Anchor, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '../../components/Badges.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate } from '../../utils/format.js'

export function TeachCoursesPage() {
  const query = useApiData('/courses/')
  return (
    <Page
      title="My teaching"
      heading="Your courses"
      actions={
        <Button component={Link} to="/teach/courses/new" leftSection={<IconPlus size={18} aria-hidden="true" />}>
          New course
        </Button>
      }
    >
      <Async query={query}>
        {(courses) =>
          courses.length === 0 ? (
            <Text>You have not created any courses yet. Start with “New course”.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {courses.map((course) => (
                <Card key={course.id} withBorder radius="md" padding="lg" component="article">
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Title order={2} size="h3">
                        <Anchor component={Link} to={`/teach/courses/${course.id}`} c="court.8">
                          {course.title}
                        </Anchor>
                      </Title>
                      <StatusBadge status={course.status} />
                    </Group>
                    <Text lineClamp={2}>{course.description}</Text>
                    <Text size="sm" c="dimmed">
                      {course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'} ·{' '}
                      {course.has_quiz ? 'Has a quiz' : 'No quiz yet'} · Updated {formatDate(course.updated_at)}
                    </Text>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )
        }
      </Async>
    </Page>
  )
}
