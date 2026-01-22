/* eslint-env node */
// Teachmo Orchestrator: shared types + validation (Zod).
// Keep this module dependency-light so it can be imported from routes, jobs, tests.

import { z } from 'zod';

// --- Enums ---

export const SignalSourceEnum = z.enum(['school', 'home', 'system']);

// Keep this list tight. Expand as integrations come online.
export const SignalTypeEnum = z.enum([
  // School-side
  'school_message',
  'assignment_deadline',
  'event_invite',
  'attendance_flag',
  'behavior_note',
  'form_request',
  'grade_flag',

  // Home-side
  'parent_capacity_update',
  'calendar_density_update',
  'routine_change',
  'child_context_update',
  'parent_preference_update',

  // System
  'digest_delivered',
  'action_completed',
  'notification_opened',
  'cooldown_started',
  'cooldown_ended',

  // Planner ticks
  'system_daily_tick',
  'system_weekly_tick'
]);

export const OrchestratorZoneEnum = z.enum(['green', 'amber', 'red']);
export const ActionTypeEnum = z.enum([
  'notify_now',
  'add_to_digest',
  'create_micro_task',
  'draft_message',
  'propose_meeting',
  'suggest_connection_moment',
  'do_nothing'
]);

// --- Feature shapes ---

export const SignalFeaturesSchema = z
  .object({
    urgency: z.number().min(0).max(1),
    impact: z.number().min(0).max(1),
    effort: z.number().min(0).max(1),
    emotionHeat: z.number().min(0).max(1),
    blocking: z.number().min(0).max(1),
    // Optional split burdens for fairness-aware optimization
    parentBurden: z.number().min(0).max(1).optional(),
    teacherBurden: z.number().min(0).max(1).optional()
  })
  .strict();

export const OrchestratorSignalSchema = z
  .object({
    id: z.string().optional(),
    familyId: z.string().min(1),
    childId: z.string().optional(),
    source: SignalSourceEnum,
    type: SignalTypeEnum,
    // ISO string is easiest to send over HTTP. Internally we convert to Date.
    timestamp: z.string().datetime().optional(),
    // Optional precomputed features. If absent, orchestrator will infer heuristically.
    features: SignalFeaturesSchema.partial().optional(),
    // Any raw payload for downstream UI or integrations.
    payload: z.record(z.any()).optional()
  })
  .strict();

export const OrchestratorStateSchema = z
  .object({
    familyId: z.string().min(1),
    updatedAt: z.string().datetime(),

    // Core "homeostasis" variables (0..1)
    parentBandwidth: z.number().min(0).max(1),
    schoolPressure: z.number().min(0).max(1),
    backlogLoad: z.number().min(0).max(1),
    relationshipStrain: z.number().min(0).max(1),
    childRisk: z.number().min(0).max(1),
    engagementSlack: z.number().min(0).max(1),
    scheduleDensity: z.number().min(0).max(1),

    // Derived indices
    tension: z.number().min(0).max(1),
    slack: z.number().min(0).max(1),
    zone: OrchestratorZoneEnum,

    // Hysteresis/cooldown
    zoneSince: z.string().datetime(),
    cooldownUntil: z.string().datetime().nullable(),

    // Budgets / constraints
    dailyAttentionBudgetMin: z.number().int().min(0),
    maxNotificationsPerHour: z.number().int().min(0),
    quietHoursLocal: z
      .object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/)
      })
      .nullable()
  })
  .strict();

export const OrchestratorActionSchema = z
  .object({
    id: z.string(),
    familyId: z.string().min(1),
    createdAt: z.string().datetime(),
    type: ActionTypeEnum,
    title: z.string(),
    summary: z.string(),

    // Optimization bookkeeping
    kidBenefit: z.number().min(0).max(1),
    relationshipBenefit: z.number().min(0).max(1),
    schoolResolutionBenefit: z.number().min(0).max(1),
    cognitiveCost: z.number().min(0).max(1),
    emotionalCost: z.number().min(0).max(1),
    timeCostMin: z.number().min(0),
    parentBurden: z.number().min(0).max(1),
    teacherBurden: z.number().min(0).max(1),

    // Any extra details for UI/LLM templates
    meta: z.record(z.any()).optional()
  })
  .strict();

export const OrchestratorDecisionSchema = z
  .object({
    state: OrchestratorStateSchema,
    nextAction: OrchestratorActionSchema.nullable(),
    candidates: z.array(OrchestratorActionSchema),
    suppressedReason: z.string().nullable()
  })
  .strict();

export const DigestItemSchema = z
  .object({
    id: z.string(),
    familyId: z.string().min(1),
    createdAt: z.string().datetime(),
    signalType: SignalTypeEnum,
    title: z.string(),
    summary: z.string(),
    urgency: z.number().min(0).max(1),
    impact: z.number().min(0).max(1),
    meta: z.record(z.any()).optional(),
    status: z.enum(['queued', 'delivered', 'dismissed']).default('queued')
  })
  .strict();

export const DailyPlanSchema = z
  .object({
    id: z.string(),
    familyId: z.string().min(1),
    createdAt: z.string().datetime(),
    windowStart: z.string().datetime(),
    windowEnd: z.string().datetime(),
    zoneAtPlanTime: OrchestratorZoneEnum,
    attentionBudgetMin: z.number().int().min(0),
    actions: z.array(OrchestratorActionSchema),
    rationale: z.string()
  })
  .strict();

export const WeeklyBriefSchema = z
  .object({
    id: z.string(),
    familyId: z.string().min(1),
    createdAt: z.string().datetime(),
    weekStart: z.string().datetime(),
    weekEnd: z.string().datetime(),
    zoneSummary: z.object({
      currentZone: OrchestratorZoneEnum,
      tension: z.number().min(0).max(1),
      slack: z.number().min(0).max(1),
      cooldownActive: z.boolean()
    }),
    signalCounts: z.record(z.number().int().min(0)),
    highlights: z.array(z.string()),
    risks: z.array(z.string()),
    recommendedNextSteps: z.array(z.string()),
    whyNow: z.string().min(1).max(240).optional(),
    setpointAdjustments: z
      .object({
        dailyAttentionBudgetMin: z.number().int().min(0).optional(),
        maxNotificationsPerHour: z.number().int().min(0).optional()
      })
      .optional()
  })
  .strict();

// --- Convenience types (JSDoc for JS consumers) ---

/** @typedef {z.infer<typeof OrchestratorSignalSchema>} OrchestratorSignal */
/** @typedef {z.infer<typeof SignalFeaturesSchema>} SignalFeatures */
/** @typedef {z.infer<typeof OrchestratorStateSchema>} OrchestratorState */
/** @typedef {z.infer<typeof OrchestratorActionSchema>} OrchestratorAction */
/** @typedef {z.infer<typeof OrchestratorDecisionSchema>} OrchestratorDecision */
/** @typedef {z.infer<typeof DigestItemSchema>} DigestItem */
/** @typedef {z.infer<typeof DailyPlanSchema>} DailyPlan */
/** @typedef {z.infer<typeof WeeklyBriefSchema>} WeeklyBrief */
