import * as React from 'react'
import { Link } from 'react-router-dom'
import { Pin } from 'lucide-react'

import type { WidgetComponentProps } from '@/core/widgets'
import { useNotesStore } from '../store'

/** Pinned + recent notes, for Mission Control. */
export function RecentNotesWidget(_props: WidgetComponentProps) {
  const { notes, hydrated, hydrate } = useNotesStore()

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!hydrated) return null
  const recent = notes.filter((n) => !n.archived).slice(0, 5)

  if (recent.length === 0) {
    return <p className="text-sm text-muted-foreground">No notes yet.</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {recent.map((note) => (
        <Link
          key={note.id}
          to={`/notes?note=${note.id}`}
          className="flex items-center gap-1.5 text-sm hover:underline"
        >
          {note.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
          <span className="truncate">{note.title}</span>
        </Link>
      ))}
    </div>
  )
}
