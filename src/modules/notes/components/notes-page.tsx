"use client"

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, StickyNote } from "lucide-react"
import { toast } from "sonner"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNotesStore } from "../store"
import type { Note } from "../types"
import { NoteCard } from "./note-card"
import { NoteEditorDialog } from "./note-editor-dialog"

export default function NotesPage() {
  const { notes, hydrated, hydrate, togglePin, remove } = useNotesStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filter, setFilter] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingNote, setEditingNote] = React.useState<Note | undefined>()

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  React.useEffect(() => {
    if (searchParams.get("new")) {
      setEditingNote(undefined)
      setDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  React.useEffect(() => {
    const noteId = searchParams.get("note")
    if (noteId && hydrated) {
      const note = notes.find((n) => n.id === noteId)
      if (note) {
        setEditingNote(note)
        setDialogOpen(true)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, hydrated, notes])

  const visible = notes.filter((note) => {
    if (note.archived) return false
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      note.title.toLowerCase().includes(q) ||
      note.body.toLowerCase().includes(q) ||
      note.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })

  const showEmptyState = hydrated && notes.filter((n) => !n.archived).length === 0

  const openCreate = () => {
    setEditingNote(undefined)
    setDialogOpen(true)
  }

  return (
    <BaseLayout title="Notes" description="Capture thinking; link it to the work.">
      <div className="px-4 lg:px-6">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
            <StickyNote className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No notes yet</p>
              <p className="text-sm text-muted-foreground">
                Capture your first note — or press ⌘K and type "new note".
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus /> New note
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search notes…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-8 w-[200px] lg:w-[280px]"
              />
              <div className="ml-auto">
                <Button size="sm" onClick={openCreate}>
                  <Plus /> New note
                </Button>
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No notes match your search.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onOpen={(n) => {
                      setEditingNote(n)
                      setDialogOpen(true)
                    }}
                    onTogglePin={(n) => void togglePin(n.id)}
                    onDelete={(n) => {
                      void remove(n.id).then(() => toast(`Deleted "${n.title}"`))
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <NoteEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingNote(undefined)
        }}
        note={editingNote}
      />
    </BaseLayout>
  )
}
