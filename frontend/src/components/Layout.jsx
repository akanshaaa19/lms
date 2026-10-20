import { Anchor, Box, Button, Container, Group, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/context.js'

const NAV_ITEMS = {
  learner: [
    { to: '/courses', label: 'Courses', end: true },
    { to: '/my-courses', label: 'My courses' },
    { to: '/profile', label: 'Profile' },
  ],
  instructor: [
    { to: '/teach', label: 'My teaching' },
    { to: '/profile', label: 'Profile' },
  ],
  admin: [{ to: '/admin-home', label: 'Admin' }],
  pending_instructor: [],
  guest: [
    { to: '/login', label: 'Log in' },
    { to: '/signup', label: 'Sign up' },
  ],
}

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const items = NAV_ITEMS[user ? user.role : 'guest'] ?? []

  async function handleLogout() {
    try {
      await logout()
      notifications.show({ message: 'You have logged out.' })
      navigate('/login')
    } catch (error) {
      notifications.show({ color: 'red', title: 'Could not log out', message: error.message })
    }
  }

  return (
    <>
      {/* First focusable element: lets keyboard users jump past the navigation. */}
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <Box component="header" bg="court.7" c="white">
        <Container size="lg" py="sm">
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Anchor component={Link} to="/" c="white" fw={700} fz="lg" underline="hover">
              Court Staff Learning
            </Anchor>
            <Group gap="lg" wrap="wrap">
              {items.length > 0 && (
                <nav aria-label="Main">
                  <Group component="ul" gap="md" wrap="wrap" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {items.map((item) => (
                      <li key={item.to}>
                        {/* NavLink sets aria-current="page" on the current page's link. */}
                        <NavLink to={item.to} end={item.end} className="nav-link">
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </Group>
                </nav>
              )}
              {user && (
                <Group gap="sm" wrap="nowrap">
                  <Text size="sm" c="white" visibleFrom="xs">
                    {user.full_name || user.email}
                  </Text>
                  <Button variant="white" size="sm" onClick={handleLogout}>
                    Log out
                  </Button>
                </Group>
              )}
            </Group>
          </Group>
        </Container>
      </Box>

      <Container component="main" id="main" tabIndex={-1} size="lg" py="xl">
        {/* The key remounts the page on every URL change, so each page
            moves focus to its own heading (see Page.jsx). */}
        <div key={location.pathname}>
          <Outlet />
        </div>
      </Container>
    </>
  )
}
