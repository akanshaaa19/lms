import { Alert, Button, Card, Group, Paper, Radio, Stack, Table, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { BackLink } from '../../components/BackLink.jsx'
import { ResultBadge } from '../../components/Badges.jsx'
import { ErrorSummary } from '../../components/ErrorSummary.jsx'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { formatDate } from '../../utils/format.js'

export function QuizPage() {
  const { quizId } = useParams()
  const quizQuery = useApiData(`/quizzes/${quizId}/`)
  const attemptsQuery = useApiData(`/quizzes/${quizId}/attempts/`)
  return (
    <Async query={quizQuery}>
      {(quiz) => <Quiz quiz={quiz} attempts={attemptsQuery.data ?? []} onAttempt={attemptsQuery.reload} />}
    </Async>
  )
}

const questionInputId = (question) => `question-${question.id}-first`

function Quiz({ quiz, attempts, onAttempt }) {
  const [answers, setAnswers] = useState({})
  const [missing, setMissing] = useState([])
  const [general, setGeneral] = useState([])
  const [attempt, setAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setGeneral([])
    // Check every question is answered before sending anything.
    const unanswered = quiz.questions.filter((q) => !answers[q.id])
    setMissing(unanswered.map((q) => q.id))
    if (unanswered.length > 0) {
      setAttempt((a) => a + 1)
      return
    }
    setSubmitting(true)
    try {
      const payload = Object.fromEntries(Object.entries(answers).map(([qid, cid]) => [qid, Number(cid)]))
      const saved = await api.post(`/quizzes/${quiz.id}/attempts/`, { answers: payload })
      setResult(saved)
      onAttempt()
      notifications.show({
        color: saved.passed ? 'green' : 'orange',
        message: saved.passed ? 'Quiz submitted. You passed.' : 'Quiz submitted. You did not pass this time.',
      })
    } catch (error) {
      setGeneral([error.message])
      setAttempt((a) => a + 1)
    } finally {
      setSubmitting(false)
    }
  }

  function tryAgain() {
    setAnswers({})
    setMissing([])
    setResult(null)
  }

  const missingItems = quiz.questions
    .filter((q) => missing.includes(q.id))
    .map((q) => ({ id: questionInputId(q), message: `Answer question ${q.order}` }))

  return (
    <Page title={quiz.title}>
      <BackLink to={`/courses/${quiz.course_id}`}>Back to {quiz.course_title}</BackLink>

      {result ? (
        <QuizResult result={result} passMark={quiz.pass_mark} onTryAgain={tryAgain} courseId={quiz.course_id} />
      ) : (
        <>
          <Text>
            {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}. Choose one answer for each.
            You need {quiz.pass_mark}% to pass. You can take the quiz as many times as you like.
          </Text>
          <ErrorSummary items={missingItems} general={general} focusKey={attempt} />
          <form onSubmit={handleSubmit} noValidate>
            <Stack gap="lg">
              {quiz.questions.map((question) => (
                <Paper key={question.id} withBorder p="lg" radius="md">
                  <Radio.Group
                    // Radio.Group labels the set of options, so each option is
                    // read out together with its question.
                    label={`Question ${question.order}: ${question.text}`}
                    labelProps={{ style: { fontSize: '1.0625rem', fontWeight: 600 } }}
                    value={answers[question.id] ?? null}
                    onChange={(value) => {
                      setAnswers((prev) => ({ ...prev, [question.id]: value }))
                      setMissing((prev) => prev.filter((id) => id !== question.id))
                    }}
                    error={missing.includes(question.id) ? 'Choose an answer for this question' : null}
                  >
                    <Stack gap="sm" mt="sm">
                      {question.choices.map((choice, index) => (
                        <Radio
                          key={choice.id}
                          id={index === 0 ? questionInputId(question) : undefined}
                          value={String(choice.id)}
                          label={choice.text}
                        />
                      ))}
                    </Stack>
                  </Radio.Group>
                </Paper>
              ))}
              <Group>
                <Button type="submit" loading={submitting}>
                  Submit answers
                </Button>
              </Group>
            </Stack>
          </form>
        </>
      )}

      <PreviousAttempts attempts={attempts} />
    </Page>
  )
}

function QuizResult({ result, passMark, onTryAgain, courseId }) {
  const headingRef = useRef(null)
  // Move focus to the result so it's read out straight after submitting.
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <Stack gap="md">
      <Alert
        color={result.passed ? 'green.9' : 'orange.9'}
        variant="light"
        icon={result.passed ? <IconCircleCheck aria-hidden="true" /> : <IconCircleX aria-hidden="true" />}
      >
        <Stack gap={4}>
          <Title order={2} size="h3" ref={headingRef} tabIndex={-1} className="page-heading">
            {result.passed ? 'You passed' : 'You did not pass this time'}
          </Title>
          <Text>
            You scored {result.score} out of {result.total} ({result.percentage}%). The pass mark is {passMark}%.
          </Text>
        </Stack>
      </Alert>

      <Title order={2} size="h3">
        Your answers
      </Title>
      <Stack gap="sm">
        {result.answers.map((answer, index) => (
          <Card key={answer.question_id} withBorder radius="md" padding="md">
            <Stack gap={4}>
              <Text fw={600}>
                Question {index + 1}: {answer.question_text}
              </Text>
              <Group gap={6}>
                {answer.is_correct ? (
                  <IconCircleCheck size={18} color="var(--mantine-color-green-9)" aria-hidden="true" />
                ) : (
                  <IconCircleX size={18} color="var(--mantine-color-red-9)" aria-hidden="true" />
                )}
                <Text fw={600} c={answer.is_correct ? 'green.9' : 'red.9'}>
                  {answer.is_correct ? 'Correct' : 'Incorrect'}
                </Text>
              </Group>
              <Text>Your answer: {answer.selected_choice_text ?? 'Not answered'}</Text>
              {!answer.is_correct && <Text>Correct answer: {answer.correct_choice_text}</Text>}
            </Stack>
          </Card>
        ))}
      </Stack>

      <Group>
        <Button onClick={onTryAgain}>Take the quiz again</Button>
        <Button component={Link} to={`/courses/${courseId}`} variant="default">
          Back to the course
        </Button>
      </Group>
    </Stack>
  )
}

function PreviousAttempts({ attempts }) {
  if (attempts.length === 0) return null
  return (
    <Stack gap="sm" component="section" aria-labelledby="attempts-heading">
      <Title order={2} size="h3" id="attempts-heading">
        Your previous attempts
      </Title>
      <Table.ScrollContainer minWidth={420}>
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">Date</Table.Th>
              <Table.Th scope="col">Score</Table.Th>
              <Table.Th scope="col">Result</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {attempts.map((a) => (
              <Table.Tr key={a.id}>
                <Table.Td>{formatDate(a.submitted_at)}</Table.Td>
                <Table.Td>
                  {a.score} of {a.total} ({a.percentage}%)
                </Table.Td>
                <Table.Td>
                  <ResultBadge passed={a.passed} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  )
}
