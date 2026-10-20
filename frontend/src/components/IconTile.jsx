// Decorative: types differ by icon, not colour, and the text beside it says what it is.
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
