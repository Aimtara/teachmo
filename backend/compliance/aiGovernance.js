/* eslint-env node */

import { randomUUID } from 'crypto';
import { requireConsent } from './consentLedger.js';
import { auditEvent } from './auditEvents.js';
import { isPPRASensitive } from './dataClassification.js';
import { redactPrompt, redactPII } from './redaction.js';

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
  constructor(reason, metadata = {}) {
    super(reason);
    this.name = 'AIGovernanceError';
    this.reason = reason;
    this.metadata = metadata;
    this.statusCode = 403;
  }
}

function textFrom(input) {
  if (typeof input === 'string') return input;
  if (!input) return '';
  return [input.prompt, input.output, input.response, input.text, input.recommendation]
    .filter(Boolean)
    .join('\n');
}

export function classifyAIUseCase(input, context = {}) {
  const text = textFrom(input);
  const matchedHighStakesCategories = Object.entries(CATEGORY_PATTERNS)
    .filter(([, pattern]) => pattern.test(text) || pattern.test(context.intent || ''))
    .map(([category]) => category);
  const ppraSensitive = isPPRASensitive(text) || context.ppraSensitive === true;
  const hasStudentData = Boolean(context.studentId || context.childId || input?.studentId || input?.childId);
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

export function requireHumanReview(aiOutput, context = {}) {
  const classification = classifyAIUseCase(aiOutput, context);
  if (!classification.requiresHumanReview) return { required: false, classification };
  return {
    required: true,
    status: 'pending_human_review',
    reason: classification.ppraSensitive ? 'ppra_sensitive_review_required' : 'high_stakes_review_required',
    classification,
  };
}

export function blockFinalDecisionAI(aiOutput, context = {}) {
  const finalDecision =
    aiOutput?.finalDecision === true ||
    context.finalDecision === true ||
    /\b(final decision|automatically decide|must assign|must discipline|must place)\b/i.test(textFrom(aiOutput));
  if (finalDecision) throw new AIGovernanceError('ai_final_decision_blocked', { advisoryOnly: true });
  return true;
}

export function redactAITrace(trace) {
  return redactPII({
    ...trace,
    prompt: trace?.prompt ? redactPrompt(trace.prompt) : undefined,
    output: trace?.output ? redactPrompt(trace.output) : undefined,
    response: trace?.response ? redactPrompt(trace.response) : undefined,
  });
}

export async function recordAITrace({ actor = {}, input = {}, output = {}, context = {} } = {}) {
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
