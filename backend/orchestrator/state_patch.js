/* eslint-env node */
import { z } from 'zod';

export const OrchestratorStatePatchSchema = z
  .object({
    parentBandwidth: z.number().min(0).max(1).optional(),
    dailyAttentionBudgetMin: z.number().int().min(0).optional(),
    maxNotificationsPerHour: z.number().int().min(0).optional(),
    quietHoursLocal: z
      .object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/)
      })
      .nullable()
      .optional()
  })
  .strict();
