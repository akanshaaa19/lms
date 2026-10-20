import { Button, Group, Paper, SimpleGrid, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'

import { api } from '../api.js'
import { useAuth } from '../auth/context.js'
import { ErrorSummary } from '../components/ErrorSummary.jsx'
import { Page } from '../components/Page.jsx'
import { Async } from '../components/States.jsx'
import { useApiData } from '../hooks/useApiData.js'
import { useFormSubmit } from '../hooks/useFormSubmit.js'
import { errorItems } from '../utils/errors.js'

export function ProfilePage() {
  const query = useApiData('/auth/profile/')
  return <Async query={query}>{(profile) => <ProfileForm profile={profile} />}</Async>
}

function ProfileForm({ profile }) {
  const { refresh } = useAuth()
  const isInstructor = profile.role === 'instructor'

  const initialValues = isInstructor
    ? { first_name: profile.first_name, last_name: profile.last_name, bio: profile.bio ?? '' }
    : {
        first_name: profile.first_name,
        last_name: profile.last_name,
        designation: profile.designation ?? '',
        department: profile.department ?? '',
      }

  const form = useForm({
    initialValues,
    validate: {
      first_name: (v) => (v.trim() ? null : 'Enter your first name'),
      last_name: (v) => (v.trim() ? null : 'Enter your last name'),
    },
  })

  const fields = [
    { name: 'first_name', id: 'profile-first-name' },
    { name: 'last_name', id: 'profile-last-name' },
    { name: 'bio', id: 'profile-bio' },
    { name: 'designation', id: 'profile-designation' },
    { name: 'department', id: 'profile-department' },
  ]

  const { onSubmit, general, attempt, submitting } = useFormSubmit(form, async (values) => {
    await api.patch('/auth/profile/', values)
    await refresh() // update the name shown in the header
    form.resetDirty()
    notifications.show({ message: 'Your profile has been saved.' })
  })

  return (
    <Page title="Your profile">
      <Paper withBorder p="xl" radius="md" maw={640}>
        <Stack gap="md">
          <Text>
            Signed in as <strong>{profile.email}</strong> ({isInstructor ? 'instructor' : 'learner'}).
          </Text>
          <ErrorSummary items={errorItems(form.errors, fields)} general={general} focusKey={attempt} />
          <form onSubmit={onSubmit} noValidate>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  id="profile-first-name"
                  label="First name"
                  autoComplete="given-name"
                  required
                  {...form.getInputProps('first_name')}
                />
                <TextInput
                  id="profile-last-name"
                  label="Last name"
                  autoComplete="family-name"
                  required
                  {...form.getInputProps('last_name')}
                />
              </SimpleGrid>
              {isInstructor ? (
                <Textarea
                  id="profile-bio"
                  label="About you"
                  description="Optional. Shown to learners on your courses."
                  autosize
                  minRows={4}
                  {...form.getInputProps('bio')}
                />
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    id="profile-designation"
                    label="Designation"
                    description="Optional. For example, Court clerk."
                    autoComplete="organization-title"
                    {...form.getInputProps('designation')}
                  />
                  <TextInput
                    id="profile-department"
                    label="Department"
                    description="Optional. For example, District Court."
                    {...form.getInputProps('department')}
                  />
                </SimpleGrid>
              )}
              <Group>
                <Button type="submit" loading={submitting}>
                  Save profile
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Page>
  )
}
