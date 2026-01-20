import { z } from 'zod';

export const orchestratorChannelSchema = z.enum(['CHAT', 'PUSH', 'EMAIL', 'UI_ACTION', 'SYSTEM_EVENT']);

export const orchestratorRouteSchema = z.enum([
  'HUB_MESSAGE_SEND',
  'HUB_THREAD_SUMMARIZE',
  'WEEKLY_BRIEF_GENERATE',
  'OFFICE_HOURS_BOOK',
  'HOMEWORK_HELP',
  'EXPLORE_DEEP_LINK',
  'SAFETY_ESCALATE',
  'UNKNOWN_CLARIFY'
]);

export const orchestratorSafetySchema = z.object({
  level: z.enum(['NONE', 'SENSITIVE', 'URGENT', 'BLOCKED']),
  reasons: z.array(z.string())
});

export const orchestratorPromptSchema = z.object({
  type: z.literal('FOLLOWUP_QUESTION'),
  question: z.string(),
  placeholder: z.string().optional()
});

export const orchestratorNeedsSchema = z.object({
  missing: z.array(z.string()),
  promptUser: orchestratorPromptSchema.optional()
});

export const orchestratorUiActionSchema = z.object({
  label: z.string(),
  action: z.string(),
  payload: z.record(z.unknown()).optional()
});

export const orchestratorUiOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  description: z.string().optional()
});

export const orchestratorUiSchema = z.object({
  type: z.enum(['CARD', 'DEEPLINK', 'CHOICE', 'ERROR']),
  title: z.string(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  message: z.string().optional(),
  deepLink: z.string().optional(),
  options: z.array(orchestratorUiOptionSchema).optional(),
  primaryAction: orchestratorUiActionSchema.optional(),
  secondaryAction: orchestratorUiActionSchema.optional()
});

export const orchestratorArtifactSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['MESSAGE_DRAFT', 'BRIEF', 'SUMMARY', 'DEEPLINK', 'OTHER']),
  payload: z.record(z.unknown()),
  expiresAt: z.string().nullable().optional()
});

export const orchestratorRequestSchema = z.object({
  requestId: z.string(),
  actor: z.object({
    userId: z.string(),
    role: z.string()
  }),
  channel: orchestratorChannelSchema,
  text: z.string().optional(),
  selected: z
    .object({
      childId: z.string().optional(),
      schoolId: z.string().optional()
    })
    .optional(),
  metadata: z
    .object({
      locale: z.string().optional(),
      timezone: z.string().optional()
    })
    .optional()
});

export const orchestratorResponseSchema = z.object({
  route: orchestratorRouteSchema,
  confidence: z.number(),
  safety: orchestratorSafetySchema,
  needs: orchestratorNeedsSchema.optional(),
  ui: orchestratorUiSchema,
  artifact: orchestratorArtifactSchema.optional(),
  debug: z
    .object({
      extractedEntities: z.record(z.unknown())
    })
    .optional()
});

export type OrchestratorRequestInput = z.infer<typeof orchestratorRequestSchema>;
export type OrchestratorResponse = z.infer<typeof orchestratorResponseSchema>;
