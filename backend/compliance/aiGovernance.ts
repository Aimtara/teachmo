/* eslint-env node */

import { randomUUID } from 'crypto';
import { requireConsent } from './consentLedger.ts';
import type { ConsentRecord } from './consentLedger.ts';
import { auditEvent } from './auditEvents.ts';
import { isPPRASensitive } from './dataClassification.ts';
import { redactPrompt, redactPII } from './redaction.ts';

export const AI_POLICY_CLASSES = Object.freeze([
  'low_risk',
  'educational_support',
  'student_sensitive',
  'ppra_sensitive',
  'high_stakes',
  'prohibited_without_human_review',
]);

export const HIGH_STAKES_AI_CATEGORIES = Object.freeze([
  'academic_placement',
  'discipline',
  'disability_accommodation',
  'mental_health_wellbeing',
  'safety_emergency',
  'risk_scoring',
  'intervention_recommendation',
  'student_ranking',
  'behavioral_profiling',
]);

export type AIPolicyClass = (typeof AI_POLICY_CLASSES)[number];
export type HighStakesAICategory = (typeof HIGH_STAKES_AI_CATEGORIES)[number];

type AIRecord = Record<string, unknown>;

interface AIContext extends AIRecord {
  intent?: string;
  ppraSensitive?: boolean;
  studentId?: string | null;
  childId?: string | null;
  highStakes?: boolean;
  finalDecision?: boolean;
  modelTrainingAuthorized?: boolean;
  consentLedger?: ConsentRecord[];
  ledger?: ConsentRecord[];
  organizationId?: string | null;
  schoolId?: string | null;
}

interface AIActor extends AIRecord {
  id?: string;
  userId?: string;
  organizationId?: string | null;
  districtId?: string | null;
  schoolId?: string | null;
}

interface AITraceInput {
  actor?: AIActor;
  input?: AIRecord;
  output?: AIRecord;
  context?: AIContext;
}

interface AIClassification {
  policyClass: AIPolicyClass;
  matchedHighStakesCategories: HighStakesAICategory[];
  ppraSensitive: boolean;
  hasStudentData: boolean;
  requiresHumanReview: boolean;
  advisoryOnly: true;
  modelTrainingAllowed: boolean;
}

const CATEGORY_PATTERNS = Object.freeze({
  academic_placement: /\b(placement|track|advanced class|remediation group)\b/i,
  discipline: /\b(discipline|suspension|expulsion|detention)\b/i,
  disability_accommodation: /\b(disability|accommodation|iep|504 plan)\b/i,
  mental_health_wellbeing: /\b(mental health|wellbeing|well-being|self[- ]?harm|depression|anxiety)\b/i,
  safety_emergency: /\b(safety|emergency|threat|violence|harm)\b/i,
  risk_scoring: /\b(risk score|risk scoring|predict risk|at risk)\b/i,
  intervention_recommendation: /\b(intervention|recommend action|support plan)\b/i,
  student_ranking: /\b(rank students?|leaderboard|top performers?|bottom performers?)\b/i,
  behavioral_profiling: /\b(behavioral profile|profiling|behavior score)\b/i,
});

export class AIGovernanceError extends Error {
  reason: string;
  metadata: Record<string, unknown>;
  statusCode: number;

  constructor(reason: string, metadata: Record<string, unknown> = {}) {
    super(reason);
    this.name = 'AIGovernanceError';
    this.reason = reason;
    this.metadata = metadata;
    this.statusCode = 403;
  }
}

function textFrom(input: unknown): string {
  if (typeof input === 'string') return input;
  if (!input || typeof input !== 'object') return '';
  const record = input as AIRecord;
  return [record.prompt, record.output, record.response, record.text, record.recommendation]
    .filter(Boolean)
    .join('\n');
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function classifyAIUseCase(input: AIRecord | string = {}, context: AIContext = {}): Readonly<AIClassification> {
  const text = textFrom(input);
  const inputRecord = typeof input === 'object' && input !== null ? input : {};
  const matchedHighStakesCategories = Object.entries(CATEGORY_PATTERNS)
    .filter(([, pattern]) => pattern.test(text) || pattern.test(context.intent || ''))
    .map(([category]) => category as HighStakesAICategory);
  const ppraSensitive = isPPRASensitive(text) || context.ppraSensitive === true;
  const hasStudentData = Boolean(context.studentId || context.childId || inputRecord.studentId || inputRecord.childId);
  const highStakes = matchedHighStakesCategories.length > 0 || context.highStakes === true;

  const policyClass = highStakes
    ? 'high_stakes'
    : ppraSensitive
      ? 'ppra_sensitive'
      : hasStudentData
        ? 'student_sensitive'
        : text
          ? 'educational_support'
          : 'low_risk';

  return Object.freeze({
    policyClass,
    matchedHighStakesCategories,
    ppraSensitive,
    hasStudentData,
    requiresHumanReview: highStakes || ppraSensitive,
    advisoryOnly: true,
    modelTrainingAllowed: context.modelTrainingAuthorized === true,
  });
}

export function requireHumanReview(aiOutput: AIRecord = {}, context: AIContext = {}) {
  const classification = classifyAIUseCase(aiOutput, context);
  if (!classification.requiresHumanReview) return { required: false, classification };
  return {
    required: true,
    status: 'pending_human_review',
    reason: classification.ppraSensitive ? 'ppra_sensitive_review_required' : 'high_stakes_review_required',
    classification,
  };
}

export function blockFinalDecisionAI(aiOutput: AIRecord = {}, context: AIContext = {}): true {
  const finalDecision =
    aiOutput?.finalDecision === true ||
    context.finalDecision === true ||
    /\b(final decision|automatically decide|must assign|must discipline|must place)\b/i.test(textFrom(aiOutput));
  if (finalDecision) throw new AIGovernanceError('ai_final_decision_blocked', { advisoryOnly: true });
  return true;
}

export function redactAITrace(trace: AIRecord): unknown {
  return redactPII({
    ...trace,
    prompt: trace.prompt ? redactPrompt(trace.prompt) : undefined,
    output: trace.output ? redactPrompt(trace.output) : undefined,
    response: trace.response ? redactPrompt(trace.response) : undefined,
  });
}

export async function recordAITrace({ actor = {}, input = {}, output = {}, context = {} }: AITraceInput = {}) {
  requireConsent(actor.id || actor.userId, 'ai_assistance', {
    ...context,
    ledger: context.consentLedger || context.ledger || [],
    childId: context.childId || stringOrNull(input.childId) || stringOrNull(input.studentId),
  });
  blockFinalDecisionAI(output, context);
  const review = requireHumanReview(output, {
    ...context,
    childId: context.childId || stringOrNull(input.childId) || stringOrNull(input.studentId),
  });
  const trace = Object.freeze({
    trace_id: randomUUID(),
    actor_id: actor.id || actor.userId,
    organization_id: context.organizationId || actor.organizationId || actor.districtId || null,
    school_id: context.schoolId || actor.schoolId || null,
    classification: review.classification,
    review,
    advisory_label: 'AI output is advisory and requires authorized human judgment for student-impacting use.',
    model_training_allowed: context.modelTrainingAuthorized === true,
    prompt: input.prompt ? redactPrompt(input.prompt) : undefined,
    output: output.text || output.response ? redactPrompt(output.text || output.response) : undefined,
    created_at: new Date().toISOString(),
  });
  await auditEvent(
    'ai.prompt_submitted',
    actor,
    { type: 'ai_interaction', id: trace.trace_id },
    context,
    redactAITrace(trace) as Record<string, unknown>
  );
  await auditEvent('ai.output_generated', actor, { type: 'ai_interaction', id: trace.trace_id }, context, {
    policyClass: trace.classification.policyClass,
    requiresHumanReview: review.required,
    modelTrainingAllowed: trace.model_training_allowed,
  });
  return trace;
}
