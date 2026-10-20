import { Box, Burger, Button, Drawer, Group, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconBooks,
  IconLogin,
  IconLogout,
  IconChalkboard,
  IconExternalLink,
  IconLayoutDashboard,
  IconSchool,
  IconSettings,
  IconUserCircle,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { API_URL } from '../api.js'
import { useAuth } from '../auth/context.js'
import { Logo } from './Logo.jsx'
import { UserAvatar } from './UserAvatar.jsx'

// Grouped navigation for each role. Every item has a visible label.
const NAV_SECTIONS = {
  learner: [
    {
      label: 'Learning',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
        { to: '/courses', label: 'Browse courses', icon: IconBooks, end: true },
        { to: '/my-courses', label: 'My courses', icon: IconSchool },
      ],
    },
    { label: 'Account', items: [{ to: '/profile', label: 'Profile', icon: IconUserCircle }] },
  ],
  instructor: [
    {
      label: 'Teaching',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
        { to: '/teach', label: 'My courses', icon: IconChalkboard },
      ],
    },
    { label: 'Account', items: [{ to: '/profile', label: 'Profile', icon: IconUserCircle }] },
  ],
  admin: [
    {
      label: 'Administration',
      items: [
        { to: '/manage', label: 'Overview', icon: IconLayoutDashboard, end: true },
        { to: '/manage/instructors', label: 'Instructors', icon: IconChalkboard },
        { to: '/manage/users', label: 'Users', icon: IconUsers },
        { to: '/manage/courses', label: 'Courses', icon: IconBooks },
      ],
    },
    {
      label: 'Account',
      items: [
        { to: '/profile', label: 'Profile', icon: IconUserCircle },
        // The Django admin is a separate server-rendered site, so it's a plain link.
        { href: `${API_URL}/admin/`, label: 'Open Django admin', icon: IconSettings, external: true },
      ],
    },
  ],
  pending_instructor: [],
  guest: [
    {
      label: 'Account',
      items: [
        { to: '/login', label: 'Log in', icon: IconLogin },
        { to: '/signup', label: 'Sign up', icon: IconUserPlus },
      ],
    },
  ],
}

const ROLE_LABELS = {
  learner: 'Learner',
  instructor: 'Instructor',
  pending_instructor: 'Instructor (pending approval)',
  admin: 'Administrator',
}

// Tabs on the course manage page share one page; strip the tab segment so
// switching tabs doesn't remount the page (and steal focus from the tabs).
function pageKey(pathname) {
  return pathname.replace(/^(\/teach\/courses\/\d+)\/(lessons|quiz|learners)\/?$/, '$1')
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const sections = NAV_SECTIONS[user ? user.role : 'guest'] ?? []

  async function handleLogout() {
    try {
      await logout()
      notifications.show({ message: 'You have logged out.' })
      navigate('/login')
    } catch (error) {
      notifications.show({ color: 'danger', title: 'Could not log out', message: error.message })
    }
  }

  return (
    <Stack justify="space-between" h="100%" gap="md">
      <div>
        <Box px={12} mb="xs" onClick={onNavigate}>
          <Logo />
        </Box>
        {sections.length > 0 && (
          <nav aria-label="Main">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="nav-section-label" id={`nav-${section.label}`}>
                  {section.label}
                </p>
                <ul className="lesson-list" aria-labelledby={`nav-${section.label}`}>
                  {section.items.map(({ to, href, label, icon: Icon, end, external }) => (
                    <li key={to ?? href}>
                      {external ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="nav-item">
                          <Icon size={20} stroke={1.8} aria-hidden="true" />
                          {label}
                          <IconExternalLink size={16} stroke={1.8} aria-hidden="true" style={{ marginLeft: 'auto' }} />
                          <span className="visually-hidden"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        // NavLink sets aria-current="page" on the current page's link.
                        <NavLink to={to} end={end} className="nav-item" onClick={onNavigate}>
                          <Icon size={20} stroke={1.8} aria-hidden="true" />
                          {label}
                        </NavLink>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}
      </div>

      {user && (
        <Stack gap="sm" pt="md" style={{ borderTop: '1px solid var(--lms-border)' }}>
          <Group gap="sm" wrap="nowrap" px={4}>
            <UserAvatar name={user.full_name || user.email} size={40} />
            <div style={{ minWidth: 0 }}>
              <Text fw={600} size="sm" truncate>
                {user.full_name || user.email}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {ROLE_LABELS[user.role] ?? ''}
              </Text>
            </div>
          </Group>
          <Button
            variant="subtle"
            justify="flex-start"
            leftSection={<IconLogout size={18} aria-hidden="true" />}
            onClick={handleLogout}
            fullWidth
          >
            Log out
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

export function AppLayout() {
  const location = useLocation()
  const [opened, { toggle, close }] = useDisclosure(false)

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="shell">
        <div className="shell-canvas">
          <Box className="sidebar-col" visibleFrom="md">
            <aside className="sidebar" aria-label="Sidebar">
              <SidebarContent />
            </aside>
          </Box>

          <div className="main-area">
            <Group className="mobile-bar" hiddenFrom="md" justify="space-between" wrap="nowrap">
              <Logo />
              <Burger
                opened={opened}
                onClick={toggle}
                size="sm"
                aria-label={opened ? 'Close menu' : 'Open menu'}
                aria-expanded={opened}
                style={{ minWidth: 44, minHeight: 44 }}
              />
            </Group>
            <Drawer opened={opened} onClose={close} size={288} title="Menu" padding="md">
              <SidebarContent onNavigate={close} />
            </Drawer>

            <main id="main" tabIndex={-1} className="main-content">
              {/* The key remounts the page when the URL changes, so each
                  page moves focus to its own heading (see Page.jsx). */}
              <div key={pageKey(location.pathname)}>
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  )
}

export function AuthLayout() {
  const location = useLocation()
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="auth-shell">
        <Box className="brand-panel" visibleFrom="md">
          <span className="shape shape-1" aria-hidden="true" />
          <span className="shape shape-2" aria-hidden="true" />
          <span className="shape shape-3" aria-hidden="true" />
          <Logo inverted />
          <Stack gap="md" maw={420} style={{ position: 'relative' }}>
            <Text fz={34} fw={600} lh={1.2}>
              Learn new court processes, one short course at a time.
            </Text>
            <Text fz="lg" style={{ opacity: 0.85 }}>
              Short lessons, a quick quiz, and a clear record of what you have completed.
            </Text>
          </Stack>
          <Text size="sm" style={{ opacity: 0.75, position: 'relative' }}>
            For court and legal services staff
          </Text>
        </Box>
        <main id="main" tabIndex={-1} className="auth-form-area">
          <Box w="100%" maw={480}>
            <Box hiddenFrom="md" mb="xl">
              <Logo />
            </Box>
            <div key={location.pathname}>
              <Outlet />
            </div>
          </Box>
        </main>
      </div>
    </>
  )
}
