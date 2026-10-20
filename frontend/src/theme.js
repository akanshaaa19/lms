/*
 * THE ONLY PLACE COLOURS ARE DEFINED.
 *
 * Palette: black and white with a sage-green accent.
 * To change the palette, edit these tokens and nothing else:
 *   ink      text, headings, filled (primary) buttons
 *   inkHover hover colour for filled buttons
 *   surface  cards, sidebar, canvas
 *   page     the off-white behind the canvas
 *   border   1px borders on cards and dividers
 *   inputBorder / inputBorderHover / inputFocusGlow   form fields (resting
 *            border must stay at least 3:1 on white)
 *   muted    secondary text (keep at least 4.5:1 on white)
 *   sage[0-9]  the accent. It's decorative only: never text on white,
 *              never a background behind white text.
 *       0, 1  soft fills (active nav pill, tags, icon tiles, selected answer)
 *       4     illustration shapes on the login panel
 *       5     progress rings, dots, active indicators (graphics only)
 *       7     links, tile icons, "Completed"/"Passed" text (6.0:1)
 *   success / warning / danger   status colours (text, dot, tint)
 *   avatars  initials-avatar backgrounds (ink text on each)
 * Components read these through CSS variables (var(--lms-*)) or Mantine
 * colours ("sage", "ink", "danger"), so nothing else hard-codes a colour.
 */
import { Button, createTheme, rem } from '@mantine/core'

export const tokens = {
  ink: '#111111',
  inkHover: '#2a2a2a',
  surface: '#ffffff',
  page: '#fafaf8',
  surfaceMuted: '#f6f6f3', // table headers, subtle panels
  border: '#e7e7e4',
  // Form fields: calm, but the resting border must keep 3:1 on white (WCAG 1.4.11).
  inputBorder: '#8e939b', // 3.1:1: don't go lighter
  inputBorderHover: '#5f6672',
  inputFocusGlow: '#e6ede1',
  muted: '#5f6672', // 5.8:1 on white: don't go lighter
  sage: [
    '#f1f5ee', // 0  sage-50
    '#e6ede1', // 1  sage-100
    '#cfdcc6',
    '#b6c8a8',
    '#9caf88', // 4  sage-400
    '#7d9471', // 5  sage-500
    '#66805c',
    '#4f6b47', // 7  sage-700
    '#3e5638',
    '#2e412a',
  ],
  success: { text: '#4f6b47', dot: '#7d9471', tint: '#f1f5ee' },
  warning: { text: '#8a5a00', dot: '#c98a04', tint: '#fff6e5' },
  danger: { text: '#b42318', dot: '#b42318', tint: '#fef3f2', glow: '#fee4e2' },
  neutral: { text: '#5f6672', dot: '#9a9fa8', tint: '#f6f6f3' },
  // Soft tints with ink initials (all above 12:1), picked by name.
  avatars: ['#e6ede1', '#efe8dc', '#e3eaf0', '#f1e6e6', '#ece7f1', '#e7e7e4'],
}

const { ink, inkHover, sage } = tokens

// Mantine colour tuples. Filled buttons use shade 7 and hover shade 8,
// so "ink" puts #111111 at 7 and the hover colour at 8.
const inkTuple = ['#f6f6f3', '#e7e7e4', '#d1d1cd', '#a3a3a0', '#737371', '#4a4a48', inkHover, ink, inkHover, '#000000']
const dangerTuple = ['#fef3f2', '#fde4e1', '#fbc9c3', '#f5a097', '#ec6f61', '#d9483a', '#c4321f', '#b42318', '#912018', '#6f1a14']

export const theme = createTheme({
  primaryColor: 'sage',
  primaryShade: 7, // radios, checkboxes, tabs, links: sage-700 passes as text
  colors: { sage, ink: inkTuple, danger: dangerTuple },
  autoContrast: true,
  white: tokens.surface,
  black: ink,
  fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(28), lineHeight: '1.25' },
      h2: { fontSize: rem(20), lineHeight: '1.3' },
      h3: { fontSize: rem(17), lineHeight: '1.35' },
    },
  },
  fontSizes: { sm: rem(14), md: rem(16) },
  radius: { sm: rem(6), md: rem(10), lg: rem(12), xl: rem(16) },
  defaultRadius: 'md',
  shadows: {
    xs: '0 1px 2px rgba(17, 17, 17, 0.04)',
    sm: '0 1px 3px rgba(17, 17, 17, 0.06), 0 1px 2px rgba(17, 17, 17, 0.04)',
    md: '0 8px 24px rgba(17, 17, 17, 0.07)',
  },
  components: {
    // Filled buttons are ink, not sage: white on sage is only 2.4:1.
    Button: Button.extend({
      defaultProps: { size: 'md', radius: 'md', color: 'ink' },
      vars: (_theme, props) => {
        if (props.variant === 'default') {
          return { root: { '--button-bd': `1px solid ${ink}`, '--button-color': ink } }
        }
        if (props.variant === 'subtle' && (!props.color || props.color === 'ink')) {
          return { root: { '--button-color': ink, '--button-hover': sage[0] } }
        }
        return { root: {} }
      },
    }),
  },
})

// Publishes the tokens as CSS variables and points Mantine's own text,
// dimmed text and border colours at them.
export function cssVariablesResolver() {
  const variables = {
    '--lms-ink': ink,
    '--lms-ink-hover': inkHover,
    '--lms-surface': tokens.surface,
    '--lms-page': tokens.page,
    '--lms-surface-muted': tokens.surfaceMuted,
    '--lms-border': tokens.border,
    '--lms-input-border': tokens.inputBorder,
    '--lms-input-border-hover': tokens.inputBorderHover,
    '--lms-input-focus-glow': tokens.inputFocusGlow,
    '--lms-danger-glow': tokens.danger.glow,
    '--lms-muted': tokens.muted,
    '--lms-tile-bg': sage[0],
    '--lms-tile-fg': sage[7],
  }
  sage.forEach((value, i) => {
    variables[`--lms-sage-${i}`] = value
  })
  for (const status of ['success', 'warning', 'danger', 'neutral']) {
    variables[`--lms-${status}`] = tokens[status].text
    variables[`--lms-${status}-dot`] = tokens[status].dot
    variables[`--lms-${status}-tint`] = tokens[status].tint
  }
  return {
    variables,
    light: {
      '--mantine-color-dimmed': tokens.muted,
      '--mantine-color-default-border': tokens.border,
      '--mantine-color-body': tokens.surface,
      '--mantine-color-text': ink,
      '--mantine-color-anchor': sage[7],
      // Field error text and invalid borders (Mantine's default red is too light).
      '--mantine-color-error': tokens.danger.text,
    },
    dark: {},
  }
}
