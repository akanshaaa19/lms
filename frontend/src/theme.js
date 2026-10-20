import { Button, createTheme, rem } from '@mantine/core'

// Deep blue primary. Shade 7 (#0b4f8a) has about 8:1 contrast with white,
// so white button text and blue link text both pass WCAG AA comfortably.
const court = [
  '#e7f0f9',
  '#cbdcee',
  '#a3c1e0',
  '#78a3d1',
  '#5487c2',
  '#3170b2',
  '#1a5d9e',
  '#0b4f8a',
  '#083f6f',
  '#052f54',
]

export const theme = createTheme({
  primaryColor: 'court',
  primaryShade: 7,
  colors: { court },
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  // 17px body text: a little larger than the default for easier reading.
  fontSizes: { md: rem(17) },
  defaultRadius: 'md',
  focusRing: 'auto',
  headings: { fontWeight: '700' },
  components: {
    Button: Button.extend({ defaultProps: { size: 'md' } }),
  },
})
