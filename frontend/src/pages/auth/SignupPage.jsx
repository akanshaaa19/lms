import { Anchor, Button, Paper, PasswordInput, Radio, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { Link, useNavigate } from 'react-router-dom'

import { homePathFor, useAuth } from '../../auth/context.js'
import { ErrorSummary } from '../../components/ErrorSummary.jsx'
import { Page } from '../../components/Page.jsx'
import { useFormSubmit } from '../../hooks/useFormSubmit.js'
import { errorItems } from '../../utils/errors.js'

const FIELDS = [
  { name: 'first_name', id: 'signup-first-name' },
  { name: 'last_name', id: 'signup-last-name' },
  { name: 'email', id: 'signup-email' },
  { name: 'role', id: 'signup-role-learner' },
  { name: 'password', id: 'signup-password' },
  { name: 'confirm_password', id: 'signup-confirm-password' },
]

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const form = useForm({
    initialValues: {
      first_name: '',
      last_name: '',
      email: '',
      role: 'learner',
      password: '',
      confirm_password: '',
    },
    validate: {
      first_name: (v) => (v.trim() ? null : 'Enter your first name'),
      last_name: (v) => (v.trim() ? null : 'Enter your last name'),
      email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter your email address, like name@example.com'),
      role: (v) => (v ? null : 'Choose whether you are joining as a learner or an instructor'),
      password: (v) => (v.length >= 8 ? null : 'Your password must be at least 8 characters'),
      confirm_password: (v, values) => (v === values.password ? null : 'The two passwords do not match'),
    },
  })

  const { onSubmit, general, attempt, submitting } = useFormSubmit(form, async (values) => {
    // confirm_password is only checked here; the server doesn't need it.
    // eslint-disable-next-line no-unused-vars
    const { confirm_password, ...payload } = values
    const user = await signup(payload)
    notifications.show({
      message:
        user.role === 'pending_instructor'
          ? 'Your account has been created. Your instructor request is waiting for approval.'
          : `Welcome, ${user.first_name}. Your account has been created.`,
    })
    navigate(homePathFor(user.role), { replace: true })
  })

  return (
    <Page title="Create an account" subtitle="All fields are required.">
      <Paper withBorder p={{ base: 'lg', sm: 'xl' }} radius="lg" shadow="sm">
        <Stack gap="md">
          <ErrorSummary items={errorItems(form.errors, FIELDS)} general={general} focusKey={attempt} />
          <form onSubmit={onSubmit} noValidate>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  id="signup-first-name"
                  label="First name"
                  autoComplete="given-name"
                  required
                  {...form.getInputProps('first_name')}
                />
                <TextInput
                  id="signup-last-name"
                  label="Last name"
                  autoComplete="family-name"
                  required
                  {...form.getInputProps('last_name')}
                />
              </SimpleGrid>
              <TextInput
                id="signup-email"
                label="Email address"
                description="You will use this to log in."
                type="email"
                autoComplete="email"
                required
                {...form.getInputProps('email')}
              />
              {/* A radio group, not a checkbox: the choice is one of two.
                  Radio.Group gives the options a group label that screen
                  readers announce with each option. */}
              <Radio.Group label="I am joining as" required {...form.getInputProps('role')}>
                <Stack gap="sm" mt="xs">
                  <Paper withBorder p="md" radius="md">
                    <Radio id="signup-role-learner" value="learner" label="A learner — I want to take courses" />
                  </Paper>
                  <Paper withBorder p="md" radius="md">
                    <Radio
                      id="signup-role-instructor"
                      value="instructor"
                      label="An instructor — I want to create courses"
                      description="An administrator must approve this before you can publish courses."
                    />
                  </Paper>
                </Stack>
              </Radio.Group>
              <PasswordInput
                id="signup-password"
                label="Password"
                description="At least 8 characters. Avoid common passwords."
                autoComplete="new-password"
                required
                {...form.getInputProps('password')}
              />
              <PasswordInput
                id="signup-confirm-password"
                label="Confirm password"
                autoComplete="new-password"
                required
                {...form.getInputProps('confirm_password')}
              />
              <Button type="submit" loading={submitting} fullWidth>
                Create account
              </Button>
            </Stack>
          </form>
          <Text>
            Already have an account?{' '}
            <Anchor component={Link} to="/login">
              Log in
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Page>
  )
}
