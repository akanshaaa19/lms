import { Stack, Table, Text } from '@mantine/core'
import { useParams } from 'react-router-dom'

import { BackLink } from '../../components/BackLink.jsx'
import { ResultBadge } from '../../components/Badges.jsx'
import { Page } from '../../components/Page.jsx'
import { ErrorState, Loading } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate, progressText } from '../../utils/format.js'

export function LearnersPage() {
  const { courseId } = useParams()
  const courseQuery = useApiData(`/courses/${courseId}/`)
  const learnersQuery = useApiData(`/courses/${courseId}/learners/`)

  if (courseQuery.loading || learnersQuery.loading) return <Loading />
  const error = courseQuery.error || learnersQuery.error
  if (error) return <ErrorState error={error} backTo="/teach" backLabel="Your courses" />

  const course = courseQuery.data
  const learners = learnersQuery.data

  return (
    <Page title={`Learners · ${course.title}`} heading="Learners">
      <BackLink to={`/teach/courses/${course.id}`}>Back to {course.title}</BackLink>
      {learners.length === 0 ? (
        <Text>No one has enrolled in this course yet.</Text>
      ) : (
        <Stack gap="sm">
          <Text>
            {learners.length} {learners.length === 1 ? 'learner has' : 'learners have'} enrolled.
          </Text>
          {/* Scrolls sideways on small screens instead of squashing columns. */}
          <Table.ScrollContainer minWidth={760}>
            <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
              <caption className="visually-hidden">Progress of learners enrolled in {course.title}</caption>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th scope="col">Learner</Table.Th>
                  <Table.Th scope="col">Designation</Table.Th>
                  <Table.Th scope="col">Enrolled</Table.Th>
                  <Table.Th scope="col">Lessons</Table.Th>
                  <Table.Th scope="col">Best quiz score</Table.Th>
                  <Table.Th scope="col">Attempts</Table.Th>
                  <Table.Th scope="col">Result</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {learners.map((l) => (
                  <Table.Tr key={l.learner_id}>
                    <Table.Th scope="row" fw={500}>
                      <Text fw={600}>{l.full_name}</Text>
                      <Text size="sm" c="dimmed">
                        {l.email}
                      </Text>
                    </Table.Th>
                    <Table.Td>{[l.designation, l.department].filter(Boolean).join(', ') || '—'}</Table.Td>
                    <Table.Td>{formatDate(l.enrolled_at)}</Table.Td>
                    <Table.Td>{progressText(l.completed_count, l.total_lessons, l.progress_percent)}</Table.Td>
                    <Table.Td>{l.best_percentage === null ? 'Not taken' : `${l.best_percentage}%`}</Table.Td>
                    <Table.Td>{l.attempt_count}</Table.Td>
                    <Table.Td>{l.attempt_count === 0 ? '—' : <ResultBadge passed={l.passed} />}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Stack>
      )}
    </Page>
  )
}
