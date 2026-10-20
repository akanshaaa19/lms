import { Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { homePathFor, useAuth } from '../../auth/context.js'
import { ErrorSummary } from '../../components/ErrorSummary.jsx'
import { Page } from '../../components/Page.jsx'
import { useFormSubmit } from '../../hooks/useFormSubmit.js'
import { errorItems } from '../../utils/errors.js'

const FIELDS = [
  { name: 'email', id: 'login-email' },
  { name: 'password', id: 'login-password' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'Enter your email address, like name@example.com'),
      password: (value) => (value ? null : 'Enter your password'),
    },
  })

  const { onSubmit, general, attempt, submitting } = useFormSubmit(form, async (values) => {
    const user = await login(values.email, values.password)
    notifications.show({ message: `Welcome back, ${user.first_name || user.email}.` })
    const from = location.state?.from
    navigate(from && user.role !== 'pending_instructor' ? from : homePathFor(user.role), { replace: true })
  })

  return (
    <Page title="Log in">
      <Paper withBorder p="xl" radius="md" maw={480}>
        <Stack gap="md">
          <Text>Log in with the email address you signed up with.</Text>
          <ErrorSummary items={errorItems(form.errors, FIELDS)} general={general} focusKey={attempt} />
          <form onSubmit={onSubmit} noValidate>
            <Stack gap="md">
              <TextInput
                id="login-email"
                label="Email address"
                type="email"
                autoComplete="email"
                required
                {...form.getInputProps('email')}
              />
              <PasswordInput
                id="login-password"
                label="Password"
                autoComplete="current-password"
                required
                {...form.getInputProps('password')}
              />
              <Button type="submit" loading={submitting}>
                Log in
              </Button>
            </Stack>
          </form>
          <Text>
            New here?{' '}
            <Anchor component={Link} to="/signup">
              Create an account
            </Anchor>
          </Text>
        </Stack>
      </Paper>
    </Page>
  )
}
