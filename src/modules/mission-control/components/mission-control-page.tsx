"use client"

import { BaseLayout } from "@/components/layouts/base-layout"
import { allWidgets } from "@/core/widgets"
import { WidgetHost } from "./widget-host"

/**
 * v0 display order until Phase 3 workspaces own layout. Widgets not listed
 * here still render, appended in registration order — a new module's
 * widgets appear with zero changes to this file.
 */
const PREFERRED_ORDER = [
  'tasks.today',
  'projects.active',
  'goals.progress',
  'projects.health',
  'notes.recent',
  'projects.recent',
]

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Burning the midnight oil, David'
  if (hour < 12) return 'Good morning, David'
  if (hour < 18) return 'Good afternoon, David'
  return 'Good evening, David'
}

function dateline(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function MissionControlPage() {
  const widgets = allWidgets()
    .filter((w) => w.component)
    .sort((a, b) => {
      const ai = PREFERRED_ORDER.indexOf(a.id)
      const bi = PREFERRED_ORDER.indexOf(b.id)
      return (ai === -1 ? PREFERRED_ORDER.length : ai) -
        (bi === -1 ? PREFERRED_ORDER.length : bi)
    })

  return (
    <BaseLayout title={greeting()} description={dateline()}>
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgets.map((def) => (
            <WidgetHost key={def.id} def={def} />
          ))}
        </div>
      </div>
    </BaseLayout>
  )
}
