import { z } from 'zod';
import {
  boundedText,
  completionType,
  energyRequirement,
  flexibility,
  isoDate,
  isoInstant,
  optionalText,
  projectStatus,
  taskStatus,
  uuid,
} from '@/lib/validation/common';

/**
 * Task, project, goal, and inbox request schemas — API_CONTRACTS.md §3.
 *
 * Only `title` is required to create a task. Missing planning fields lower the
 * task's confidence and produce clarification warnings; they never block
 * capture (DECISION_LOG D-014).
 */

export const createTaskSchema = z
  .object({
    title: boundedText(300, 'Title'),
    description: optionalText(4000),
    projectId: uuid.nullable().optional(),
    goalId: uuid.nullable().optional(),
    lifeAreaId: uuid.nullable().optional(),
    dueAt: isoInstant.nullable().optional(),
    dueTimezone: z.string().max(64).nullable().optional(),
    preferredDate: isoDate.nullable().optional(),
    earliestStartAt: isoInstant.nullable().optional(),
    estimatedMinutes: z.number().int().min(1).max(2880).nullable().optional(),
    minimumMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    energyRequirement: energyRequirement.default('any'),
    locationLabel: optionalText(120),
    costCents: z.number().int().min(0).nullable().optional(),
    consequenceLevel: z.number().int().min(0).max(100).default(25),
    consequenceReason: optionalText(500),
    flexibility: flexibility.default('medium'),
    minimumViableDefinition: optionalText(500),
    recoveryWindowHours: z.number().int().min(0).max(2160).nullable().optional(),
    definitionOfDone: optionalText(1000),
    status: taskStatus.default('ready'),
    dependsOnTaskIds: z.array(uuid).max(25).default([]),
  })
  .refine(
    (value) =>
      value.minimumMinutes == null ||
      value.estimatedMinutes == null ||
      value.minimumMinutes <= value.estimatedMinutes,
    {
      message: 'Minimum duration cannot exceed the estimate.',
      path: ['minimumMinutes'],
    },
  )
  .refine(
    (value) => value.consequenceLevel < 90 || (value.consequenceReason ?? '') !== '',
    {
      message: 'A severe consequence needs a short reason.',
      path: ['consequenceReason'],
    },
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** PATCH /tasks/:id requires the client's last-known version (optimistic lock). */
export const updateTaskSchema = z.object({
  version: z.number().int().min(1),
  title: boundedText(300, 'Title').optional(),
  description: optionalText(4000),
  projectId: uuid.nullable().optional(),
  goalId: uuid.nullable().optional(),
  lifeAreaId: uuid.nullable().optional(),
  dueAt: isoInstant.nullable().optional(),
  dueTimezone: z.string().max(64).nullable().optional(),
  preferredDate: isoDate.nullable().optional(),
  earliestStartAt: isoInstant.nullable().optional(),
  estimatedMinutes: z.number().int().min(1).max(2880).nullable().optional(),
  minimumMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  energyRequirement: energyRequirement.optional(),
  locationLabel: optionalText(120),
  costCents: z.number().int().min(0).nullable().optional(),
  consequenceLevel: z.number().int().min(0).max(100).optional(),
  consequenceReason: optionalText(500),
  flexibility: flexibility.optional(),
  minimumViableDefinition: optionalText(500),
  recoveryWindowHours: z.number().int().min(0).max(2160).nullable().optional(),
  definitionOfDone: optionalText(1000),
  status: taskStatus.optional(),
  manualPriority: z.number().int().min(0).max(100).nullable().optional(),
  manualPriorityExpiresAt: isoInstant.nullable().optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const completeTaskSchema = z.object({
  completionType: completionType.default('full'),
  actualMinutes: z.number().int().min(0).max(2880).nullable().optional(),
  note: optionalText(1000),
});

export const taskListQuerySchema = z.object({
  status: z.array(taskStatus).optional(),
  projectId: uuid.optional(),
  lifeAreaId: uuid.optional(),
  search: z.string().trim().max(200).optional(),
  includeArchived: z.boolean().default(false),
  sort: z
    .enum(['due_at', 'created_at', 'updated_at', 'title', 'consequence'])
    .default('created_at'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export const createProjectSchema = z.object({
  title: boundedText(300, 'Title'),
  outcome: boundedText(500, 'Desired outcome'),
  goalId: uuid.nullable().optional(),
  lifeAreaId: uuid.nullable().optional(),
  status: projectStatus.default('active'),
  targetDate: isoDate.nullable().optional(),
  budgetCents: z.number().int().min(0).nullable().optional(),
});

export const updateProjectSchema = z.object({
  title: boundedText(300, 'Title').optional(),
  outcome: boundedText(500, 'Desired outcome').optional(),
  goalId: uuid.nullable().optional(),
  lifeAreaId: uuid.nullable().optional(),
  status: projectStatus.optional(),
  targetDate: isoDate.nullable().optional(),
  budgetCents: z.number().int().min(0).nullable().optional(),
  nextActionTaskId: uuid.nullable().optional(),
});

export const createGoalSchema = z.object({
  title: boundedText(300, 'Title'),
  description: optionalText(2000),
  lifeAreaId: uuid.nullable().optional(),
  targetDate: isoDate.nullable().optional(),
  isProtected: z.boolean().default(false),
});

export const createInboxItemSchema = z.object({
  rawText: boundedText(2000, 'Capture text'),
  /**
   * Client-generated id that makes offline capture replay idempotent
   * (ACCEPTANCE_CRITERIA.md "Offline capture queues and saves once").
   */
  clientCaptureId: uuid.optional(),
});

export const convertInboxItemSchema = z.object({
  target: z.enum(['task', 'project', 'goal', 'note']),
  title: boundedText(300, 'Title').optional(),
  outcome: boundedText(500, 'Desired outcome').optional(),
  estimatedMinutes: z.number().int().min(1).max(2880).nullable().optional(),
  dueAt: isoInstant.nullable().optional(),
});

export const createLifeAreaSchema = z.object({
  name: boundedText(80, 'Name'),
  isProtected: z.boolean().default(false),
});
