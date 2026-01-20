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

export const orchestratorPromptSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CHOICE'),
    title: z.string(),
    options: z.array(z.object({ label: z.string(), value: z.string() }))
  }),
  z.object({
    type: z.literal('FOLLOWUP_QUESTION'),
    title: z.string(),
    placeholder: z.string().optional()
  })
]);

export const orchestratorNeedsSchema = z.object({
  missing: z.array(z.string()),
  promptUser: orchestratorPromptSchema.optional()
});

export const orchestratorUiSchema = z.object({
  type: z.enum(['CARD', 'DEEPLINK', 'CHOICE', 'FOLLOWUP_QUESTION', 'ERROR']),
  title: z.string(),
  body: z.string().optional(),
  deepLink: z.string().optional(),
  primaryAction: z
    .object({
      label: z.string(),
      action: z.string()
    })
    .optional()
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
      schoolId: z.string().optional(),
      teacherId: z.string().optional(),
      threadId: z.string().optional(),
      recipientUserId: z.string().optional()
    })
    .optional(),
  metadata: z
    .object({
      locale: z.string().optional(),
      timezone: z.string().optional()
    })
    .optional(),
  recent: z
    .object({
      summary: z.string().optional()
    })
    .optional()
});

export const orchestratorResponseSchema = z.object({
  route: orchestratorRouteSchema,
  confidence: z.number(),
  safety: orchestratorSafetySchema,
  needs: orchestratorNeedsSchema.optional(),
  ui: orchestratorUiSchema,
  result: z.record(z.unknown()).optional(),
  sideEffects: z.array(z.string()).optional(),
  success: z.boolean().optional()
});

export type OrchestratorRequestInput = z.infer<typeof orchestratorRequestSchema>;
export type OrchestratorResponse = z.infer<typeof orchestratorResponseSchema>;
