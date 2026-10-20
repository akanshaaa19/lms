// A small rounded tile holding a content-type icon (course, lesson, quiz…).
// Types are told apart by the icon, not by colour. Decorative: the text
// next to it always says what it is.
export function IconTile({ icon: Icon, size = 40 }) {
  return (
    <span
      className="icon-tile"
      aria-hidden="true"
      style={{ width: size, height: size, background: 'var(--lms-tile-bg)', color: 'var(--lms-tile-fg)' }}
    >
      <Icon size={Math.round(size * 0.5)} stroke={1.8} />
    </span>
  )
}
