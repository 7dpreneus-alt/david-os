"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { EntityPicker } from "@/components/shared/entity-picker"
import { useNotesStore } from "../store"
import type { Note } from "../types"
import { Markdown } from "./markdown"

const PROJECT_TYPES = ["project"]

interface NoteEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  note?: Note
}

/** Write/Preview markdown editor. Saving is explicit; Esc discards. */
export function NoteEditorDialog({ open, onOpenChange, note }: NoteEditorDialogProps) {
  const { create, update } = useNotesStore()
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [tags, setTags] = React.useState("")
  const [projectId, setProjectId] = React.useState<string | undefined>()

  React.useEffect(() => {
    if (open) {
      setTitle(note?.title ?? "")
      setBody(note?.body ?? "")
      setTags(note?.tags.join(", ") ?? "")
      setProjectId(note?.projectId)
    }
  }, [open, note])

  const save = async () => {
    if (!title.trim()) return
    const fields = {
      title: title.trim(),
      body,
      projectId,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    }
    if (note) {
      await update(note.id, fields)
    } else {
      await create(fields)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {note ? "Edit note" : "New note"}
          </DialogTitle>
          <Input
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="border-none px-0 !text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        </DialogHeader>

        <Tabs defaultValue="write" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="min-h-0 flex-1">
            <Textarea
              placeholder="Write in markdown — headings, lists, tables, code…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="h-[320px] resize-none font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="preview" className="min-h-0 flex-1">
            <div className="h-[320px] overflow-y-auto rounded-md border px-4 py-3">
              {body.trim() ? (
                <Markdown>{body}</Markdown>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Project</p>
            <EntityPicker
              types={PROJECT_TYPES}
              value={projectId}
              onChange={setProjectId}
              placeholder="Link to a project…"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tags</p>
            <Input
              placeholder="comma, separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!title.trim()}>
            {note ? "Save note" : "Create note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
