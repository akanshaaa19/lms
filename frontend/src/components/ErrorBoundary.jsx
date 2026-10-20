import { Alert, Button, Stack, Text } from '@mantine/core'
import { Component } from 'react'

// Catches a crash while rendering, so one broken page shows a message
// instead of a blank screen. Error boundaries must be class components.
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <Alert color="danger" title="Something went wrong on this page" role="alert">
        <Stack gap="sm" align="flex-start">
          <Text>Try reloading. If it keeps happening, go back to the dashboard.</Text>
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
        </Stack>
      </Alert>
    )
  }
}
