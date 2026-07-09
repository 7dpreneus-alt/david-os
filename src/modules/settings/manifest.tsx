import { lazy } from 'react'
import { Bell, Palette, Settings, User } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'

const UserSettings = lazy(() => import('@/app/settings/user/page'))
const AccountSettings = lazy(() => import('@/app/settings/account/page'))
const AppearanceSettings = lazy(() => import('@/app/settings/appearance/page'))
const NotificationSettings = lazy(
  () => import('@/app/settings/notifications/page')
)

export const settingsModule: ModuleManifest = {
  id: 'settings',
  name: 'Settings',
  icon: Settings,
  navGroup: 'System',
  order: 90,
  routes: [
    { path: '/settings/user', element: <UserSettings /> },
    { path: '/settings/account', element: <AccountSettings /> },
    { path: '/settings/appearance', element: <AppearanceSettings /> },
    { path: '/settings/notifications', element: <NotificationSettings /> },
  ],
  navItems: [
    {
      title: 'Settings',
      url: '#',
      icon: Settings,
      items: [
        { title: 'Profile', url: '/settings/user', icon: User },
        { title: 'Account', url: '/settings/account', icon: Settings },
        { title: 'Appearance', url: '/settings/appearance', icon: Palette },
        { title: 'Notifications', url: '/settings/notifications', icon: Bell },
      ],
    },
  ],
  settingsPanels: [
    { id: 'profile', title: 'Profile', route: '/settings/user' },
    { id: 'account', title: 'Account', route: '/settings/account' },
    { id: 'appearance', title: 'Appearance', route: '/settings/appearance' },
    {
      id: 'notifications',
      title: 'Notifications',
      route: '/settings/notifications',
    },
  ],
}
