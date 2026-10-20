import { Anchor, Button, Group, SimpleGrid, Stack, Text, Title, VisuallyHidden } from '@mantine/core'
import {
  IconArrowRight,
  IconBook,
  IconBooks,
  IconCircleCheck,
  IconCircleX,
  IconFileText,
  IconListCheck,
  IconTrophy,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/EmptyState.jsx'
import { IconTile } from '../../components/IconTile.jsx'
import { ProgressRing } from '../../components/ProgressRing.jsx'
import { SectionCard } from '../../components/SectionCard.jsx'
import { Stat, StatRow } from '../../components/Stat.jsx'
import { UserAvatar } from '../../components/UserAvatar.jsx'
import { progressText, relativeTime } from '../../utils/format.js'

export function LearnerDashboard({ data }) {
  const { stats, in_progress: inProgress, recent_attempts: attempts, suggested_courses: suggested } = data
  const [current, ...upNext] = inProgress

  return (
    <Stack gap="xl">
      <StatRow label="Your learning at a glance">
        <Stat label="Courses enrolled" value={stats.enrolled} />
        <Stat label="Lessons completed" value={stats.lessons_completed} />
        <Stat label="Courses completed" value={stats.courses_completed} />
        <Stat label="Quizzes passed" value={stats.quizzes_passed} />
      </StatRow>

      {stats.enrolled === 0 ? (
        <Stack gap="xl">
          <EmptyState
            icon={IconBooks}
            action={
              <Button component={Link} to="/courses">
                Browse courses
              </Button>
            }
          >
            You have not enrolled in any courses yet. Find a short course to get started.
          </EmptyState>
          <ExploreCourses courses={suggested} />
        </Stack>
      ) : (
        <div className="dashboard-grid">
          <div className="dashboard-column">
            {current ? <ContinueCard item={current} /> : <AllCaughtUp />}
            {upNext.length > 0 && <UpNext items={upNext} />}
            <ExploreCourses courses={suggested} />
          </div>
          <div className="dashboard-column">
            <RecentResults attempts={attempts} />
          </div>
        </div>
      )}
    </Stack>
  )
}

// The next thing to do in a course: a lesson, else the quiz, else the course page.
function nextStep(item) {
  if (item.next_lesson) {
    const { id, order, title } = item.next_lesson
    return {
      to: `/lessons/${id}`,
      icon: IconFileText,
      label: `Continue: Lesson ${order}. ${title}`,
      words: `Next: Lesson ${order}, ${title}`,
    }
  }
  if (item.quiz && !item.quiz.passed) {
    const best = item.quiz.best_percentage
    return {
      to: `/quizzes/${item.quiz.id}`,
      icon: IconListCheck,
      label: 'Take the quiz',
      words: `Quiz ready: ${item.quiz.title}${best !== null ? ` (best ${best}%, not passed yet)` : ''}`,
    }
  }
  return { to: `/courses/${item.course_id}`, icon: IconBook, label: 'Open the course', words: 'Review the course' }
}

function ContinueCard({ item }) {
  const step = nextStep(item)
  return (
    <section className="surface-card hero-card" aria-labelledby="continue-heading">
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={600} c="var(--lms-sage-7)" id="continue-heading" component="h2" m={0}>
            Continue learning
          </Text>
          <Title order={3} size="h2" mt={6} className="safe-text" lineClamp={2}>
            <Anchor component={Link} to={`/courses/${item.course_id}`} c="var(--lms-ink)" underline="hover" inherit>
              {item.course_title}
            </Anchor>
          </Title>
          <Group gap={8} mt={6}>
            <UserAvatar name={item.instructor_name} size={24} />
            <Text size="sm" c="dimmed">
              {item.instructor_name}
            </Text>
          </Group>
        </div>
        <Group gap="lg" wrap="wrap" justify="space-between">
          <Group gap="md" wrap="nowrap">
            <ProgressRing
              value={item.progress_percent}
              size={72}
              thickness={8}
              label={
                <Text ta="center" fw={700} size="sm" aria-hidden="true">
                  {item.progress_percent}%
                </Text>
              }
            />
            <Text fw={600}>{progressText(item.completed_count, item.total_lessons, item.progress_percent)}</Text>
          </Group>
          <Button
            component={Link}
            to={step.to}
            className="button-wrap safe-text"
            rightSection={<IconArrowRight size={18} aria-hidden="true" />}
            maw="100%"
          >
            {step.label}
          </Button>
        </Group>
      </Stack>
    </section>
  )
}

function AllCaughtUp() {
  return (
    <EmptyState
      icon={IconTrophy}
      action={
        <Button component={Link} to="/my-courses" variant="default">
          See my courses
        </Button>
      }
    >
      You are all caught up: every course you enrolled in is finished.
    </EmptyState>
  )
}

function UpNext({ items }) {
  return (
    <SectionCard id="up-next-heading" title="Up next" padded={false}>
      <ol className="lesson-list">
        {items.map((item) => {
          const step = nextStep(item)
          return (
            <li key={item.course_id} className="feed-row" style={{ alignItems: 'center' }}>
              <IconTile icon={step.icon} size={40} />
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} lineClamp={1} className="safe-text">
                  {item.course_title}
                </Text>
                <Text size="sm" c="dimmed" lineClamp={2} className="safe-text">
                  {step.words}
                </Text>
              </Stack>
              <Group gap={8} wrap="nowrap" visibleFrom="xs">
                <ProgressRing value={item.progress_percent} size={32} />
                <Text size="sm" fw={600}>
                  {item.progress_percent}%
                </Text>
              </Group>
              <Button component={Link} to={step.to} variant="default" size="sm">
                Go<VisuallyHidden> to {step.words} in {item.course_title}</VisuallyHidden>
              </Button>
            </li>
          )
        })}
      </ol>
    </SectionCard>
  )
}

function RecentResults({ attempts }) {
  return (
    <SectionCard id="results-heading" title="Recent quiz results" padded={attempts.length === 0}>
      {attempts.length === 0 ? (
        <Text c="dimmed">You have not taken a quiz yet. Your results will appear here.</Text>
      ) : (
        <ol className="lesson-list">
          {attempts.map((a, index) => (
            <li key={`${a.quiz_id}-${a.submitted_at}-${index}`} className="feed-row">
              <Text fw={700} fz={22} lh={1.1} w={58} style={{ flexShrink: 0 }}>
                {a.percentage}%
              </Text>
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Anchor
                  component={Link}
                  to={`/courses/${a.course_id}`}
                  fw={600}
                  c="var(--lms-ink)"
                  underline="hover"
                  lineClamp={2}
                  className="safe-text"
                >
                  {a.course_title}
                </Anchor>
                <Group gap={6} wrap="nowrap">
                  {a.passed ? (
                    <IconCircleCheck size={18} color="var(--lms-success)" aria-hidden="true" />
                  ) : (
                    <IconCircleX size={18} color="var(--lms-danger)" aria-hidden="true" />
                  )}
                  <Text size="sm" fw={600} c={a.passed ? 'var(--lms-success)' : 'var(--lms-danger)'}>
                    {a.passed ? 'Passed' : 'Not passed yet'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    · <time dateTime={a.submitted_at}>{relativeTime(a.submitted_at)}</time>
                  </Text>
                </Group>
              </Stack>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}

function ExploreCourses({ courses }) {
  return (
    <SectionCard
      id="explore-heading"
      title="Explore courses"
      actions={
        <Anchor component={Link} to="/courses" fw={600} size="sm">
          Browse all courses
        </Anchor>
      }
    >
      {courses.length === 0 ? (
        <Text c="dimmed">You are enrolled in every published course. New courses will appear here.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: courses.length > 1 ? 2 : 1, xl: Math.min(courses.length, 3) }} spacing="md">
          {courses.map((course) => (
            // The title link stretches over the card: one tab stop, big target.
            <article key={course.id} className="surface-card card-link-wrap" style={{ padding: 16 }}>
              <Stack gap="sm">
                <IconTile icon={IconBook} size={36} />
                <Title order={3} size="h4" lineClamp={2} className="safe-text">
                  <Anchor
                    component={Link}
                    to={`/courses/${course.id}`}
                    c="var(--lms-ink)"
                    className="card-link"
                    underline="hover"
                    inherit
                  >
                    {course.title}
                  </Anchor>
                </Title>
                <Text size="sm" c="dimmed" lineClamp={2} className="safe-text">
                  {course.description}
                </Text>
                <Text size="sm" c="dimmed">
                  {course.instructor_name} · {course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'}
                </Text>
              </Stack>
            </article>
          ))}
        </SimpleGrid>
      )}
    </SectionCard>
  )
}
