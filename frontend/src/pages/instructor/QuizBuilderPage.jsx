import { ActionIcon, Button, Group, NumberInput, Paper, Radio, Stack, TextInput, Textarea, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { randomId } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../../api.js'
import { ErrorSummary } from '../../components/ErrorSummary.jsx'
import { Page } from '../../components/Page.jsx'
import { ErrorState, Loading } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { useFormSubmit } from '../../hooks/useFormSubmit.js'

const MAX_CHOICES = 6

export function QuizBuilderPage() {
  const { courseId } = useParams()
  const courseQuery = useApiData(`/courses/${courseId}/`)
  const quizQuery = useApiData(`/courses/${courseId}/quiz/`)

  if (courseQuery.loading || quizQuery.loading) return <Loading />
  if (courseQuery.error) return <ErrorState error={courseQuery.error} backTo="/teach" backLabel="Your courses" />
  // 404 for the quiz just means there isn't one yet.
  if (quizQuery.error && quizQuery.error.status !== 404) {
    return <ErrorState error={quizQuery.error} onRetry={quizQuery.reload} />
  }
  return <QuizBuilder course={courseQuery.data} quiz={quizQuery.error ? null : quizQuery.data} />
}

const newChoice = () => ({ key: randomId(), text: '' })
const newQuestion = () => ({ key: randomId(), text: '', correct: '', choices: [newChoice(), newChoice()] })

// Converts the API shape into form values. The correct answer is stored as
// the index of the choice, which is what the radio buttons select.
function toFormValues(quiz, course) {
  if (!quiz) return { title: `${course.title} quiz`, pass_mark: 70, questions: [newQuestion()] }
  return {
    title: quiz.title,
    pass_mark: quiz.pass_mark,
    questions: quiz.questions.map((q) => ({
      key: randomId(),
      text: q.text,
      correct: String(q.choices.findIndex((c) => c.is_correct)),
      choices: q.choices.map((c) => ({ key: randomId(), text: c.text })),
    })),
  }
}

// Stable ids so the error summary can link to each field.
const ids = {
  title: 'quiz-title',
  pass_mark: 'quiz-pass-mark',
  question: (qi) => `quiz-q${qi}-text`,
  correct: (qi) => `quiz-q${qi}-correct-0`,
  choice: (qi, ci) => `quiz-q${qi}-choice-${ci}`,
}

function validate(values) {
  const errors = {}
  if (!values.title.trim()) errors.title = 'Enter a title for the quiz'
  if (values.pass_mark === '' || values.pass_mark < 0 || values.pass_mark > 100) {
    errors.pass_mark = 'Enter a pass mark between 0 and 100'
  }
  if (values.questions.length === 0) errors.questions = 'Add at least one question'
  values.questions.forEach((q, qi) => {
    if (!q.text.trim()) errors[`questions.${qi}.text`] = `Question ${qi + 1}: enter the question`
    q.choices.forEach((c, ci) => {
      if (!c.text.trim()) errors[`questions.${qi}.choices.${ci}.text`] = `Question ${qi + 1}, choice ${ci + 1}: enter the choice text`
    })
    if (q.correct === '') errors[`questions.${qi}.correct`] = `Question ${qi + 1}: choose the correct answer`
  })
  return errors
}

// Maps Mantine's error keys ("questions.0.text") to field ids, for the summary.
function summaryItems(errors) {
  return Object.entries(errors)
    .filter(([key]) => key !== 'questions')
    .map(([key, message]) => {
      const parts = key.split('.')
      let id = ids[key]
      if (parts[0] === 'questions' && parts[2] === 'text') id = ids.question(parts[1])
      if (parts[0] === 'questions' && parts[2] === 'correct') id = ids.correct(parts[1])
      if (parts[0] === 'questions' && parts[2] === 'choices') id = ids.choice(parts[1], parts[3])
      return { id, message }
    })
}

function QuizBuilder({ course, quiz }) {
  const navigate = useNavigate()
  const form = useForm({ initialValues: toFormValues(quiz, course), validate })

  const { onSubmit, general, attempt, submitting } = useFormSubmit(form, async (values) => {
    const payload = {
      title: values.title,
      pass_mark: values.pass_mark,
      questions: values.questions.map((q, qi) => ({
        text: q.text,
        order: qi + 1,
        choices: q.choices.map((c, ci) => ({ text: c.text, is_correct: String(ci) === q.correct })),
      })),
    }
    await api.put(`/courses/${course.id}/quiz/`, payload)
    notifications.show({ message: 'Quiz saved.' })
    navigate(`/teach/courses/${course.id}/quiz`)
  })

  const { questions } = form.getValues()
  const generalErrors = [...general, ...(form.errors.questions ? [form.errors.questions] : [])]

  return (
    <Page
      title={quiz ? 'Edit quiz' : 'Create quiz'}
      subtitle="Each question needs at least two choices, and exactly one correct answer."
      breadcrumbs={[
        { label: 'Your courses', to: '/teach' },
        { label: course.title, to: `/teach/courses/${course.id}/quiz` },
        { label: quiz ? 'Edit quiz' : 'Create quiz' },
      ]}
    >
      <ErrorSummary items={summaryItems(form.errors)} general={generalErrors} focusKey={attempt} />

      <form onSubmit={onSubmit} noValidate>
        <Stack gap="lg">
          <Paper withBorder p="lg" radius="lg" shadow="xs">
            <Group align="flex-start" wrap="wrap" gap="md">
              <TextInput id={ids.title} label="Quiz title" required style={{ flex: '1 1 20rem' }} {...form.getInputProps('title')} />
              <NumberInput
                id={ids.pass_mark}
                label="Pass mark (%)"
                description="Learners need at least this score to pass."
                min={0}
                max={100}
                allowDecimal={false}
                required
                w={220}
                {...form.getInputProps('pass_mark')}
              />
            </Group>
          </Paper>

          {questions.map((question, qi) => (
            <Paper key={question.key} withBorder p="lg" radius="lg" shadow="xs" component="section" aria-labelledby={`quiz-q${qi}-heading`}>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={2} size="h4" id={`quiz-q${qi}-heading`}>
                    Question {qi + 1}
                  </Title>
                  {questions.length > 1 && (
                    <Button
                      variant="subtle"
                      color="danger"
                      size="sm"
                      onClick={() => form.removeListItem('questions', qi)}
                      leftSection={<IconTrash size={16} aria-hidden="true" />}
                    >
                      Remove question {qi + 1}
                    </Button>
                  )}
                </Group>
                <Textarea
                  id={ids.question(qi)}
                  label="Question"
                  rows={3}
                  resize="vertical"
                  required
                  {...form.getInputProps(`questions.${qi}.text`)}
                />

                {/* One radio per choice marks the correct answer. Because
                    they're one radio group, only one can be selected. */}
                <Radio.Group
                  label="Choices"
                  description="Type each choice, and select the radio button next to the correct one."
                  required
                  {...form.getInputProps(`questions.${qi}.correct`)}
                >
                  <Stack gap="sm" mt="sm">
                    {question.choices.map((choice, ci) => (
                      <Group key={choice.key} wrap="nowrap" align="flex-start" gap="sm">
                        <Radio
                          id={`quiz-q${qi}-correct-${ci}`}
                          value={String(ci)}
                          aria-label={`Choice ${ci + 1} is the correct answer`}
                          mt={10}
                        />
                        <TextInput
                          id={ids.choice(qi, ci)}
                          aria-label={`Question ${qi + 1}, choice ${ci + 1}`}
                          placeholder={`Choice ${ci + 1}`}
                          style={{ flex: 1 }}
                          {...form.getInputProps(`questions.${qi}.choices.${ci}.text`)}
                        />
                        {question.choices.length > 2 && (
                          <ActionIcon
                            variant="subtle"
                            color="danger"
                            size={44}
                            aria-label={`Remove choice ${ci + 1}`}
                            onClick={() => {
                              form.removeListItem(`questions.${qi}.choices`, ci)
                              // Keep the correct answer pointing at the same choice.
                              const correct = question.correct
                              if (correct === String(ci)) form.setFieldValue(`questions.${qi}.correct`, '')
                              else if (correct !== '' && Number(correct) > ci) {
                                form.setFieldValue(`questions.${qi}.correct`, String(Number(correct) - 1))
                              }
                            }}
                          >
                            <IconTrash size={18} aria-hidden="true" />
                          </ActionIcon>
                        )}
                      </Group>
                    ))}
                  </Stack>
                </Radio.Group>
                {question.choices.length < MAX_CHOICES && (
                  <Group>
                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => form.insertListItem(`questions.${qi}.choices`, newChoice())}
                      leftSection={<IconPlus size={16} aria-hidden="true" />}
                    >
                      Add a choice to question {qi + 1}
                    </Button>
                  </Group>
                )}
              </Stack>
            </Paper>
          ))}

          <Group justify="space-between" wrap="wrap">
            <Button
              variant="default"
              onClick={() => form.insertListItem('questions', newQuestion())}
              leftSection={<IconPlus size={18} aria-hidden="true" />}
            >
              Add question
            </Button>
            <Group>
              <Button component={Link} to={`/teach/courses/${course.id}/quiz`} variant="default">
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Save quiz
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Page>
  )
}
