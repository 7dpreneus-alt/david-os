import { z } from 'zod';

/** Shared Zod primitives. Every external boundary validates through these. */

export const uuid = z.string().uuid();

export const boundedText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

export const isoInstant = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date and time.');

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD.');

export const ianaTimezone = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch (error) {
    void error;
    return false;
  }
}, 'Enter a valid IANA timezone, for example America/New_York.');

export const energyRequirement = z.enum(['low', 'medium', 'high', 'any']);
export const energyLevel = z.enum(['very_low', 'low', 'normal', 'high', 'very_high']);
export const flexibility = z.enum(['fixed', 'low', 'medium', 'high']);
export const taskStatus = z.enum([
  'inbox',
  'ready',
  'planned',
  'in_progress',
  'blocked',
  'missed',
  'completed',
  'canceled',
  'archived',
]);
export const projectStatus = z.enum([
  'proposed',
  'active',
  'paused',
  'completed',
  'canceled',
  'archived',
]);
export const completionType = z.enum([
  'full',
  'minimum_viable',
  'partial',
  'delegated',
  'canceled',
  'intentional_skip',
]);
export const recoveryRootCause = z.enum([
  'avoidance',
  'bad_estimate',
  'unexpected_interruption',
  'low_energy',
  'missing_resource',
  'calendar_conflict',
  'financial_constraint',
  'deliberate_reprioritization',
  'travel_or_location',
  'provider_or_system_failure',
  'health_or_safety_constraint',
  'unknown',
]);

/** Convert a ZodError into the fieldErrors shape of the API error envelope. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    const existing = out[key];
    if (existing === undefined) {
      out[key] = [issue.message];
    } else {
      existing.push(issue.message);
    }
  }
  return out;
}
