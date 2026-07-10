"use client"

import { MoreHorizontal, Pin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EntityChip } from "@/components/shared/entity-chip"
import type { Note } from "../types"

interface NoteCardProps {
  note: Note
  onOpen: (note: Note) => void
  onTogglePin: (note: Note) => void
  onDelete: (note: Note) => void
}

export function NoteCard({ note, onOpen, onTogglePin, onDelete }: NoteCardProps) {
  return (
    <Card
      className="flex cursor-pointer flex-col transition-colors hover:border-primary/40"
      onClick={() => onOpen(note)}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {note.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate">{note.title}</span>
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" className="h-8 w-8 shrink-0 p-0">
              <MoreHorizontal />
              <span className="sr-only">Note actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[150px]"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onClick={() => onOpen(note)}>Open</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTogglePin(note)}>
              {note.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(note)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {note.body ? (
          <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {note.body}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">Empty note</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {note.projectId && <EntityChip id={note.projectId} />}
          {note.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
