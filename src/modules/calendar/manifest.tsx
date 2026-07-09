import { lazy } from 'react'
import { Calendar } from 'lucide-react'

import type { ModuleManifest } from '@/core/modules'

const CalendarPage = lazy(() => import('@/app/calendar/page'))

export const calendarModule: ModuleManifest = {
  id: 'calendar',
  name: 'Calendar',
  icon: Calendar,
  navGroup: 'Work',
  order: 20,
  routes: [{ path: '/calendar', element: <CalendarPage /> }],
  navItems: [{ title: 'Calendar', url: '/calendar', icon: Calendar }],
}
