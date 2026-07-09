import { z } from 'zod'

/** Base schema every entity schema extends. */
export const baseEntitySchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  archived: z.boolean().optional(),
})

export const entityLinkSchema = z.object({
  id: z.string().min(1),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  kind: z.string().min(1),
  createdAt: z.string(),
})
