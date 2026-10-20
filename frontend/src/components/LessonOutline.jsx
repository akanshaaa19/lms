import { Text } from '@mantine/core'
import { IconCircle, IconCircleCheckFilled } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

// The list of a course's lessons shown beside the lesson reader: where you
// are, and which lessons are done. On wide screens it's a sticky side panel;
// on narrow screens it folds into a <details> above the lesson, so it never
// squeezes the reading column.
export function LessonOutline({ course, currentLessonId }) {
  const enrollment = course.enrollment
  const summary = enrollment
    ? `${enrollment.completed_count} of ${enrollment.total_lessons} lessons done`
    : `${course.lessons.length} lessons`

  const list = <OutlineList course={course} currentLessonId={currentLessonId} showStatus={Boolean(enrollment)} />

  return (
    <>
      <nav aria-label="Course contents" className="lesson-outline lesson-outline-wide">
        <Text component="h2" fw={600} size="md" mb={4}>
          Course contents
        </Text>
        <Text size="sm" c="dimmed" mb={8}>
          {summary}
        </Text>
        {enrollment && <OutlineProgress percent={enrollment.progress_percent} />}
        {list}
      </nav>

      {/* Native <details>: keyboard and screen-reader support built in. */}
      <details className="lesson-outline lesson-outline-narrow">
        <summary>
          <Text component="span" fw={600}>
            Course contents
          </Text>
          <Text component="span" size="sm" c="dimmed">
            {' '}· {summary}
          </Text>
        </summary>
        <nav aria-label="Course contents">{list}</nav>
      </details>
    </>
  )
}

function OutlineProgress({ percent }) {
  // Decorative: the same information is in the text just above it.
  return (
    <div className="lesson-outline-progress" aria-hidden="true">
      <div style={{ width: `${percent}%` }} />
    </div>
  )
}

function OutlineList({ course, currentLessonId, showStatus }) {
  return (
    <ol className="lesson-outline-list">
      {course.lessons.map((lesson) => {
        const isCurrent = lesson.id === currentLessonId
        const Icon = lesson.is_completed ? IconCircleCheckFilled : IconCircle
        return (
          <li key={lesson.id}>
            <Link
              to={`/lessons/${lesson.id}`}
              className="lesson-outline-item"
              aria-current={isCurrent ? 'page' : undefined}
            >
              {showStatus && (
                <Icon
                  size={20}
                  aria-hidden="true"
                  className="lesson-outline-icon"
                  data-done={lesson.is_completed || undefined}
                />
              )}
              <span className="lesson-outline-text">
                <span className="lesson-outline-title">
                  {lesson.order}. {lesson.title}
                </span>
                {/* Status in words, so it's never shown by the icon alone. */}
                {showStatus && (
                  <span className="lesson-outline-status" data-done={lesson.is_completed || undefined}>
                    {lesson.is_completed ? 'Completed' : 'Not completed'}
                    {isCurrent && ' · You are here'}
                  </span>
                )}
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
