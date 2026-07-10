import { registerModules, type ModuleManifest } from '@/core/modules'

import { missionControlModule } from '@/modules/mission-control/manifest'
import { projectsModule } from '@/modules/projects/manifest'
import { tasksModule } from '@/modules/tasks/manifest'
import { calendarModule } from '@/modules/calendar/manifest'
import { settingsModule } from '@/modules/settings/manifest'

/**
 * The installed-module list — the only file that changes when a module is
 * added or removed. Registration runs on first import; everything downstream
 * (routes, sidebar, command palette) reads from the kernel registries.
 */
export const installedModules: ModuleManifest[] = [
  missionControlModule,
  projectsModule,
  tasksModule,
  calendarModule,
  settingsModule,
]

registerModules(installedModules)
