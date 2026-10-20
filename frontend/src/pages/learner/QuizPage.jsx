import { Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCircleCheck, IconCircleX } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { ResultBadge } from '../../components/Badges.jsx'
import { ErrorSummary } from '../../components/ErrorSummary.jsx'
import { Page } from '../../components/Page.jsx'
import { ProgressRing } from '../../components/ProgressRing.jsx'
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

const firstOptionId = (question) => `question-${question.id}-option-0`

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
      notifications.show({ message: saved.passed ? 'Quiz submitted. You passed.' : 'Quiz submitted. You did not pass this time.' })
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
    .map((q) => ({ id: firstOptionId(q), message: `Answer question ${q.order}` }))
  const answeredCount = quiz.questions.filter((q) => answers[q.id]).length

  return (
    <Page
      title={quiz.title}
      subtitle={`${quiz.questions.length} ${quiz.questions.length === 1 ? 'question' : 'questions'} · Pass mark ${quiz.pass_mark}% · You can take it as many times as you like`}
      breadcrumbs={[
        { label: 'My courses', to: '/my-courses' },
        { label: quiz.course_title, to: `/courses/${quiz.course_id}` },
        { label: 'Quiz' },
      ]}
    >
      <div style={{ maxWidth: 760 }}>
        {result ? (
          <QuizResult result={result} passMark={quiz.pass_mark} onTryAgain={tryAgain} courseId={quiz.course_id} />
        ) : (
          <Stack gap="lg">
            <ErrorSummary items={missingItems} general={general} focusKey={attempt} />
            <form onSubmit={handleSubmit} noValidate>
              <Stack gap="lg">
                {quiz.questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    missing={missing.includes(question.id)}
                    onChange={(choiceId) => {
                      setAnswers((prev) => ({ ...prev, [question.id]: choiceId }))
                      setMissing((prev) => prev.filter((id) => id !== question.id))
                    }}
                  />
                ))}
                <Group justify="space-between" wrap="wrap" className="sticky-action">
                  <Text c="dimmed" size="sm" fw={500}>
                    {answeredCount} of {quiz.questions.length} answered
                  </Text>
                  <Button type="submit" loading={submitting}>
                    Submit answers
                  </Button>
                </Group>
              </Stack>
            </form>
          </Stack>
        )}
      </div>

      <PreviousAttempts attempts={attempts} />
    </Page>
  )
}

function QuestionCard({ question, value, missing, onChange }) {
  const errorId = `question-${question.id}-error`
  return (
    <Paper withBorder radius="lg" p={{ base: 'md', sm: 'lg' }} shadow="xs">
      {/* Real radio buttons in a fieldset: the legend (the question) is read
          with each option, and arrow keys move between options. Each option
          is a full-width label, so the whole row is clickable. */}
      <fieldset className="question-fieldset">
        <legend>
          <Text component="span" size="sm" c="dimmed" fw={600} display="block" mb={4}>
            Question {question.order}
          </Text>
          {question.text}
        </legend>
        {question.choices.map((choice, index) => (
          <label key={choice.id} className="option-row">
            <input
              type="radio"
              id={index === 0 ? firstOptionId(question) : undefined}
              name={`question-${question.id}`}
              value={choice.id}
              checked={value === String(choice.id)}
              onChange={() => onChange(String(choice.id))}
              aria-describedby={missing ? errorId : undefined}
            />
            <span>{choice.text}</span>
          </label>
        ))}
        {missing && (
          <p id={errorId} className="question-error">
            Choose an answer for this question
          </p>
        )}
      </fieldset>
    </Paper>
  )
}

function QuizResult({ result, passMark, onTryAgain, courseId }) {
  const headingRef = useRef(null)
  // Move focus to the result so it's read out straight after submitting.
  useEffect(() => headingRef.current?.focus(), [])
  const tone = result.passed ? 'success' : 'danger'
  const Icon = result.passed ? IconCircleCheck : IconCircleX

  return (
    <Stack gap="xl">
      <Paper withBorder radius="lg" p="xl" shadow="xs">
        <Group gap="xl" wrap="wrap">
          <ProgressRing
            value={result.percentage}
            size={148}
            thickness={12}
            label={
              <Text ta="center" fz={30} fw={700} aria-hidden="true">
                {result.percentage}%
              </Text>
            }
          />
          <Stack gap="sm" style={{ flex: '1 1 16rem' }}>
            <Group
              gap="sm"
              wrap="nowrap"
              p="sm"
              style={{ borderRadius: 10, background: `var(--lms-${tone}-tint)` }}
            >
              <Icon size={26} color={`var(--lms-${tone})`} aria-hidden="true" />
              <Title order={2} size="h3" ref={headingRef} tabIndex={-1} className="page-heading" c={`var(--lms-${tone})`}>
                {result.passed ? 'You passed' : 'You did not pass this time'}
              </Title>
            </Group>
            <Text fz="lg">
              You scored <strong>{result.score}</strong> out of <strong>{result.total}</strong> ({result.percentage}%).
            </Text>
            <Text c="dimmed">The pass mark is {passMark}%.</Text>
          </Stack>
        </Group>
      </Paper>

      <Stack gap="sm" component="section" aria-labelledby="review-heading">
        <Title order={2} id="review-heading">
          Your answers
        </Title>
        <div className="surface-card">
          <ol className="lesson-list">
            {result.answers.map((answer, index) => (
              <li key={answer.question_id} className="lesson-row" style={{ alignItems: 'flex-start' }}>
                {answer.is_correct ? (
                  <IconCircleCheck size={24} color="var(--lms-success)" aria-hidden="true" />
                ) : (
                  <IconCircleX size={24} color="var(--lms-danger)" aria-hidden="true" />
                )}
                <Stack gap={4} style={{ flex: 1 }}>
                  <Text fw={600}>
                    {index + 1}. {answer.question_text}
                  </Text>
                  <Text size="sm" fw={600} c={answer.is_correct ? 'var(--lms-success)' : 'var(--lms-danger)'}>
                    {answer.is_correct ? 'Correct' : 'Incorrect'}
                  </Text>
                  <Text size="sm">Your answer: {answer.selected_choice_text ?? 'Not answered'}</Text>
                  {!answer.is_correct && <Text size="sm">Correct answer: {answer.correct_choice_text}</Text>}
                </Stack>
              </li>
            ))}
          </ol>
        </div>
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
    <Stack gap="sm" component="section" aria-labelledby="attempts-heading" maw={760}>
      <Title order={2} id="attempts-heading">
        Previous attempts
      </Title>
      <div className="table-card">
        <Table.ScrollContainer minWidth={420}>
          <Table verticalSpacing="sm" horizontalSpacing="md">
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
      </div>
    </Stack>
  )
}
