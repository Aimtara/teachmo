/* eslint-env node */
/**
 * Validation schemas for execution board API
 */
import { z } from 'zod';

// Status enums
export const statusEnum = z.enum(['Backlog', 'Planned', 'In progress', 'Done']);
export const gateStatusEnum = z.enum(['Backlog', 'Planned', 'In progress']);

// PATCH request validation schemas
export const epicPatchSchema = z.object({
  workstream: z.string().optional(),
  tag: z.string().optional(),
  railSegment: z.string().optional(),
  ownerRole: z.string().optional(),
  upstream: z.string().nullable().optional(),
  downstream: z.string().nullable().optional(),
  gates: z.string().nullable().optional(),
  status: statusEnum.optional(),
  nextMilestone: z.string().optional(),
  dod: z.string().optional(),
  notes: z.string().optional(),
  epicKey: z.string().optional(),
  railPriority: z.union([z.string(), z.number()]).optional(),
});

export const gatePatchSchema = z.object({
  purpose: z.string().optional(),
  checklist: z.string().optional(),
  ownerRole: z.string().optional(),
  dependsOn: z.string().optional(),
  targetWindow: z.string().optional(),
  status: gateStatusEnum.optional(),
});

export const slicePatchSchema = z.object({
  outcome: z.string().optional(),
  primaryEpic: z.string().optional(),
  gate: z.string().optional(),
  inputs: z.string().optional(),
  deliverables: z.string().optional(),
  acceptance: z.string().optional(),
  status: statusEnum.optional(),
  owner: z.string().optional(),
  storyKey: z.string().optional(),
  dependsOn: z.string().optional(),
});
