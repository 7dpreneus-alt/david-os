"use client"

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { Archive, FolderKanban, Plus } from "lucide-react"
import { toast } from "sonner"

import { BaseLayout } from "@/components/layouts/base-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjectsStore } from "../store"
import type { Project } from "../types"
import { ProjectCard } from "./project-card"
import { ProjectFormDialog } from "./project-form-dialog"

export default function ProjectsPage() {
  const { projects, hydrated, hydrate, complete, archive, remove } =
    useProjectsStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [filter, setFilter] = React.useState("")
  const [showArchived, setShowArchived] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingProject, setEditingProject] = React.useState<Project | undefined>()

  React.useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Palette deep links: ?new=1 opens create, ?project=<id> opens edit.
  React.useEffect(() => {
    if (searchParams.get("new")) {
      setEditingProject(undefined)
      setDialogOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  React.useEffect(() => {
    const projectId = searchParams.get("project")
    if (projectId && hydrated) {
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        setEditingProject(project)
        setDialogOpen(true)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, hydrated, projects])

  const visible = projects.filter((project) => {
    if (!showArchived && project.archived) return false
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      project.title.toLowerCase().includes(q) ||
      project.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      (project.owner ?? "").toLowerCase().includes(q)
    )
  })

  const showEmptyState = hydrated && projects.filter((p) => !p.archived).length === 0

  const openCreate = () => {
    setEditingProject(undefined)
    setDialogOpen(true)
  }

  return (
    <BaseLayout
      title="Projects"
      description="Orchestrate tasks, goals, notes, and documents toward outcomes."
    >
      <div className="px-4 lg:px-6">
        {showEmptyState && !showArchived ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first project — or press ⌘K and type "new project".
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus /> New project
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Filter projects…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="h-8 w-[200px] lg:w-[280px]"
              />
              <Button
                variant={showArchived ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowArchived((v) => !v)}
              >
                <Archive /> {showArchived ? "Hide archived" : "Show archived"}
              </Button>
              <div className="ml-auto">
                <Button size="sm" onClick={openCreate}>
                  <Plus /> New project
                </Button>
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No projects match the current filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={(p) => {
                      setEditingProject(p)
                      setDialogOpen(true)
                    }}
                    onComplete={(p) => {
                      void complete(p.id).then(() =>
                        toast(`Completed "${p.title}"`)
                      )
                    }}
                    onArchive={(p) => {
                      void archive(p.id, !p.archived).then(() =>
                        toast(p.archived ? `Unarchived "${p.title}"` : `Archived "${p.title}"`)
                      )
                    }}
                    onDelete={(p) => {
                      void remove(p.id).then(() => toast(`Deleted "${p.title}"`))
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingProject(undefined)
        }}
        project={editingProject}
      />
    </BaseLayout>
  )
}
