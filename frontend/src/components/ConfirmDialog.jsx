import { Button, Group, Modal, Stack } from '@mantine/core'

// Mantine's Modal traps focus inside the dialog, closes on Escape, and
// returns focus to the button that opened it.
export function ConfirmDialog({ opened, onClose, title, confirmLabel, onConfirm, loading, danger, children }) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered size="lg">
      <Stack gap="md">
        {children}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button color={danger ? 'red.8' : undefined} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
