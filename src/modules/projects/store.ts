import { create } from 'zustand'

import { newId } from '@/lib/id'
import { events } from '@/core/events'
import { createRepository } from '@/core/storage'
import { projectSchema, type ProjectInput } from './schema'
import type { Project } from './types'

/** All persistence flows through the kernel repository (ADR-005). */
export const projectsRepository = createRepository<Project>(
  'projects',
  projectSchema
)

interface ProjectsState {
  projects: Project[]
  hydrated: boolean
  hydrate: () => Promise<void>
  create: (input: ProjectInput) => Promise<Project>
  update: (id: string, patch: Partial<Project>) => Promise<Project | undefined>
  complete: (id: string) => Promise<Project | undefined>
  archive: (id: string, archived?: boolean) => Promise<Project | undefined>
  remove: (id: string) => Promise<void>
}

let hydration: Promise<void> | undefined

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  hydrated: false,

  async hydrate() {
    hydration ??= projectsRepository.list().then((projects) => {
      set({ projects: sort(projects), hydrated: true })
    })
    return hydration
  },

  async create(input) {
    const now = new Date().toISOString()
    const project: Project = {
      id: newId(),
      type: 'project',
      title: input.title,
      createdAt: now,
      updatedAt: now,
      tags: input.tags ?? [],
      status: input.status ?? 'active',
      description: input.description,
      owner: input.owner,
      priority: input.priority,
      startDate: input.startDate,
      targetDate: input.targetDate,
      milestones: input.milestones ?? [],
      linkedIds: input.linkedIds ?? [],
      meta: input.meta,
    }
    const saved = await projectsRepository.put(project)
    set({ projects: sort([...get().projects, saved]) })
    return saved
  },

  async update(id, patch) {
    const current = get().projects.find((p) => p.id === id)
    if (!current) return undefined
    const saved = await projectsRepository.put({ ...current, ...patch, id })
    set({ projects: sort(get().projects.map((p) => (p.id === id ? saved : p))) })
    return saved
  },

  async complete(id) {
    const current = get().projects.find((p) => p.id === id)
    if (!current || current.status === 'completed') return current
    const saved = await get().update(id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
    if (saved) {
      events.emit('project.completed', { projectId: id, project: saved })
    }
    return saved
  },

  async archive(id, archived = true) {
    const saved = await get().update(id, { archived })
    if (saved && archived) {
      events.emit('project.archived', { projectId: id, project: saved })
    }
    return saved
  },

  async remove(id) {
    await projectsRepository.remove(id)
    set({ projects: get().projects.filter((p) => p.id !== id) })
  },
}))

function sort(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** Fire-and-forget hydration for non-React consumers. */
export function ensureProjectsHydrated(): void {
  void useProjectsStore.getState().hydrate()
}

/** Test helper — clears in-memory state so hydrate() re-reads storage. */
export function resetProjectsStore(): void {
  hydration = undefined
  useProjectsStore.setState({ projects: [], hydrated: false })
}
