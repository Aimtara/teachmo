/* eslint-env node */

import { randomUUID } from 'crypto';
import { requireConsent } from './consentLedger.js';
import { auditEvent } from './auditEvents.js';
import { isPPRASensitive } from './dataClassification.js';
import { redactPrompt, redactPII } from './redaction.js';

export const AI_POLICY_CLASSES = [
  'low_risk',
  'educational_support',
  'student_sensitive',
  'ppra_sensitive',
  'high_stakes',
  'prohibited_without_human_review',
] as const;

export const HIGH_STAKES_AI_CATEGORIES = [
  'academic_placement',
  'discipline',
  'disability_accommodation',
  'mental_health_wellbeing',
  'safety_emergency',
  'risk_scoring',
  'intervention_recommendation',
  'student_ranking',
  'behavioral_profiling',
] as const;

export type AIPolicyClass = (typeof AI_POLICY_CLASSES)[number];
export type HighStakesAICategory = (typeof HIGH_STAKES_AI_CATEGORIES)[number];

const CATEGORY_PATTERNS: Readonly<Record<HighStakesAICategory, RegExp>> = Object.freeze({
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

interface AITracePayload extends Record<string, unknown> {
  prompt?: string;
  output?: string;
  response?: string;
  text?: string;
  recommendation?: string;
  studentId?: string;
  childId?: string;
  finalDecision?: boolean;
}

interface AIContext extends Record<string, unknown> {
  intent?: string;
  ppraSensitive?: boolean;
  studentId?: string;
  childId?: string;
  highStakes?: boolean;
  finalDecision?: boolean;
  modelTrainingAuthorized?: boolean;
  consentLedger?: Record<string, unknown>[];
  ledger?: Record<string, unknown>[];
  organizationId?: string;
  schoolId?: string;
}

interface AIActor extends Record<string, unknown> {
  id?: string;
  userId?: string;
  organizationId?: string;
  districtId?: string;
  schoolId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asPayload(input: unknown): AITracePayload {
  return isRecord(input) ? input : {};
}

function stringField(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === 'string' ? value : '';
}

function textFrom(input: unknown): string {
  if (typeof input === 'string') return input;
  const payload = asPayload(input);
  return [payload.prompt, payload.output, payload.response, payload.text, payload.recommendation]
    .filter(Boolean)
    .join('\n');
}

export function classifyAIUseCase(input: unknown, context: AIContext = {}) {
  const text = textFrom(input);
  const matchedHighStakesCategories = Object.entries(CATEGORY_PATTERNS)
    .filter(([, pattern]) => pattern.test(text) || pattern.test(context.intent || ''))
    .map(([category]) => category as HighStakesAICategory);
  const ppraSensitive = isPPRASensitive(text) || context.ppraSensitive === true;
  const payload = asPayload(input);
  const hasStudentData = Boolean(context.studentId || context.childId || payload.studentId || payload.childId);
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

export function requireHumanReview(aiOutput: unknown, context: AIContext = {}) {
  const classification = classifyAIUseCase(aiOutput, context);
  if (!classification.requiresHumanReview) return { required: false, classification };
  return {
    required: true,
    status: 'pending_human_review',
    reason: classification.ppraSensitive ? 'ppra_sensitive_review_required' : 'high_stakes_review_required',
    classification,
  };
}

export function blockFinalDecisionAI(aiOutput: unknown, context: AIContext = {}): true {
  const finalDecision =
    asPayload(aiOutput).finalDecision === true ||
    context.finalDecision === true ||
    /\b(final decision|automatically decide|must assign|must discipline|must place)\b/i.test(textFrom(aiOutput));
  if (finalDecision) throw new AIGovernanceError('ai_final_decision_blocked', { advisoryOnly: true });
  return true;
}

export function redactAITrace(trace: unknown) {
  return redactPII({
    ...asPayload(trace),
    prompt: stringField(asPayload(trace), 'prompt') ? redactPrompt(stringField(asPayload(trace), 'prompt')) : undefined,
    output: stringField(asPayload(trace), 'output') ? redactPrompt(stringField(asPayload(trace), 'output')) : undefined,
    response: stringField(asPayload(trace), 'response') ? redactPrompt(stringField(asPayload(trace), 'response')) : undefined,
  });
}

export async function recordAITrace({ actor = {}, input = {}, output = {}, context = {} }: { actor?: AIActor; input?: AITracePayload; output?: AITracePayload; context?: AIContext } = {}) {
  requireConsent(actor.id || actor.userId, 'ai_assistance', {
    ...context,
    ledger: context.consentLedger || context.ledger || [],
    childId: context.childId || input.childId || input.studentId,
  });
  blockFinalDecisionAI(output, context);
  const review = requireHumanReview(output, { ...context, childId: context.childId || input.childId || input.studentId });
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
  await auditEvent('ai.prompt_submitted', actor, { type: 'ai_interaction', id: trace.trace_id }, context, redactAITrace(trace));
  await auditEvent('ai.output_generated', actor, { type: 'ai_interaction', id: trace.trace_id }, context, {
    policyClass: trace.classification.policyClass,
    requiresHumanReview: review.required,
    modelTrainingAllowed: trace.model_training_allowed,
  });
  return trace;
}
