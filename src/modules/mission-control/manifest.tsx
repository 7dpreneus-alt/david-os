import { lazy } from 'react'
import { LayoutDashboard } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'

const Dashboard = lazy(() => import('@/app/dashboard/page'))

/**
 * Placeholder over the template dashboard until Phase 3 rebuilds this as
 * the widget host over live data.
 */
export const missionControlModule: ModuleManifest = {
  id: 'mission-control',
  name: 'Mission Control',
  icon: LayoutDashboard,
  navGroup: 'Overview',
  order: 0,
  routes: [{ path: '/dashboard', element: <Dashboard /> }],
  navItems: [
    { title: 'Mission Control', url: '/dashboard', icon: LayoutDashboard },
  ],
}
