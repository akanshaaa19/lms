import { useAuth } from '../../auth/context.js'
import { Page } from '../../components/Page.jsx'
import { Async } from '../../components/States.jsx'
import { useApiData } from '../../hooks/useApiData.js'
import { greeting } from '../../utils/format.js'
import { InstructorDashboard } from './InstructorDashboard.jsx'
import { LearnerDashboard } from './LearnerDashboard.jsx'

// One route for both roles; the API returns a different shape for each.
export function DashboardPage() {
  const { user } = useAuth()
  const query = useApiData('/dashboard/')
  const isInstructor = user.role === 'instructor'

  return (
    <Async query={query} skeleton="dashboard">
      {(data) => (
        <Page
          title="Dashboard"
          heading={`${greeting()}, ${user.first_name || user.full_name}`}
          subtitle={
            isInstructor
              ? 'Here is how your courses and learners are doing.'
              : 'Pick up where you left off, or find something new to learn.'
          }
        >
          {data.role === 'instructor' ? <InstructorDashboard data={data} /> : <LearnerDashboard data={data} />}
        </Page>
      )}
    </Async>
  )
}
