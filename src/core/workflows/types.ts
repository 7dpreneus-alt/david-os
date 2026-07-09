import type { BaseEntity } from '@/core/entities'

/**
 * Workflow Engine — SPECIFICATION ONLY (ADR-017).
 *
 * These types fix the architecture: workflows are entities whose steps
 * invoke registered commands or agent runs, executed on the Command Engine
 * substrate. There is intentionally NO implementation here; it arrives in
 * the post-v1 roadmap slot. Do not add execution code before then.
 */
export interface WorkflowDef extends BaseEntity {
  type: 'workflow'
  trigger:
    | { kind: 'manual' }
    | { kind: 'event'; event: string }
    /** Scheduled triggers are a later addition. */
    | { kind: 'schedule'; cron: string }
  steps: WorkflowStep[]
}

export type WorkflowStep =
  | { kind: 'command'; commandId: string; args?: Record<string, unknown> }
  | { kind: 'agent'; agentId: string; prompt: string }
  | { kind: 'condition'; expr: string; then: WorkflowStep[]; else?: WorkflowStep[] }

export interface WorkflowRun extends BaseEntity {
  type: 'workflow-run'
  workflowId: string
  status: 'running' | 'succeeded' | 'failed' | 'cancelled'
  steps: Array<{
    index: number
    status: 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped'
    error?: string
  }>
}
