import { lazy } from 'react'
import { LayoutDashboard } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'

const MissionControlPage = lazy(() => import('./components/mission-control-page'))

/**
 * Mission Control v0: hosts every widget registered in the kernel widget
 * registry — live data only. Phase 3 layers workspace-owned instances
 * (position/pin/hide/config) onto this host.
 */
export const missionControlModule: ModuleManifest = {
  id: 'mission-control',
  name: 'Mission Control',
  icon: LayoutDashboard,
  navGroup: 'Overview',
  order: 0,
  routes: [{ path: '/dashboard', element: <MissionControlPage /> }],
  navItems: [
    { title: 'Mission Control', url: '/dashboard', icon: LayoutDashboard },
  ],
}
