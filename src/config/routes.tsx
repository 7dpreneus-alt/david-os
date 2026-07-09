import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

// Lazy load components for better performance
const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Tasks = lazy(() => import('@/app/tasks/page'))
const Calendar = lazy(() => import('@/app/calendar/page'))

// Error pages
const NotFound = lazy(() => import('@/app/errors/not-found/page'))

// Settings pages
const UserSettings = lazy(() => import('@/app/settings/user/page'))
const AccountSettings = lazy(() => import('@/app/settings/account/page'))
const AppearanceSettings = lazy(() => import('@/app/settings/appearance/page'))
const NotificationSettings = lazy(() => import('@/app/settings/notifications/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  // Default route - redirect to mission control
  // Use relative path "dashboard" instead of "/dashboard" for basename compatibility
  {
    path: "/",
    element: <Navigate to="dashboard" replace />
  },

  // Mission Control
  {
    path: "/dashboard",
    element: <Dashboard />
  },

  // Application Routes
  {
    path: "/tasks",
    element: <Tasks />
  },
  {
    path: "/calendar",
    element: <Calendar />
  },

  // Settings Routes
  {
    path: "/settings/user",
    element: <UserSettings />
  },
  {
    path: "/settings/account",
    element: <AccountSettings />
  },
  {
    path: "/settings/appearance",
    element: <AppearanceSettings />
  },
  {
    path: "/settings/notifications",
    element: <NotificationSettings />
  },

  // Catch-all route for 404
  {
    path: "*",
    element: <NotFound />
  }
]
