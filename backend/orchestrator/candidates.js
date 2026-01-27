/* eslint-env node */
import { makeId, toIso, clamp01 } from './utils.js';

/**
 * Generate candidate actions given the current state + incoming signal.
 * This is intentionally heuristic and "small"; you can swap this for LLM-driven generation later.
 *
 * @param {{
 *   state: import('./types.js').OrchestratorState,
 *   signal: import('./types.js').OrchestratorSignal,
 *   features: import('./types.js').SignalFeatures,
 *   now: Date,
 * }} params
 * @returns {import('./types.js').OrchestratorAction[]}
 */
export function generateCandidates({ state, signal, features, now }) {
  const actions = [];
  const familyId = state.familyId;
  const createdAt = toIso(now);
  const payload = signal.payload ?? {};

  const add = (a) => actions.push(a);
  const baseMeta = { signalType: signal.type, signalSource: signal.source, payload };

  const isPriority = Boolean(payload.isSafety || payload.isCompliance || payload.priority === 'high');
  const dueSoon = features.urgency >= 0.75;
  const hot = features.emotionHeat >= 0.65;

  // Priority lane / due-soon
  if (isPriority || dueSoon) {
    add({
      id: makeId('act'),
      familyId,
      createdAt,
      type: 'notify_now',
      title: isPriority ? 'Time-sensitive school item' : 'Due soon',
      summary: isPriority
        ? 'A high-priority item needs attention. Teachmo can draft a concise response or create a micro-task.'
        : 'An upcoming deadline may need a quick plan to avoid last-minute scramble.',
      kidBenefit: clamp01(0.6 + 0.4 * features.impact),
      relationshipBenefit: clamp01(0.2 + 0.3 * (1 - features.emotionHeat)),
      schoolResolutionBenefit: clamp01(0.5 + 0.4 * features.urgency),
      cognitiveCost: 0.35,
      emotionalCost: clamp01(0.2 + 0.5 * features.emotionHeat),
      timeCostMin: 2,
      parentBurden: clamp01(features.parentBurden ?? 0.5),
      teacherBurden: clamp01(features.teacherBurden ?? 0.2),
      meta: { ...baseMeta, lane: 'priority' }
    });
  }

  // Brake behaviors when strained (baroreflex / GTO)
  if (state.zone === 'red' || state.zone === 'amber') {
    add({
      id: makeId('act'),
      familyId,
      createdAt,
      type: 'add_to_digest',
      title: 'Batch non-urgent items',
      summary: 'Reduce cognitive load by batching noncritical items into the next digest window.',
      kidBenefit: clamp01(0.2 + 0.3 * features.impact),
      relationshipBenefit: clamp01(0.4 + 0.2 * (1 - features.emotionHeat)),
      schoolResolutionBenefit: clamp01(0.2 + 0.3 * (1 - features.urgency)),
      cognitiveCost: 0.05,
      emotionalCost: 0.05,
      timeCostMin: 0,
      parentBurden: 0.05,
      teacherBurden: 0.05,
      meta: { ...baseMeta, lane: 'brake' }
    });

    if (hot && signal.source === 'school') {
      add({
        id: makeId('act'),
        familyId,
        createdAt,
        type: 'draft_message',
        title: 'Draft a calm, collaborative reply',
        summary:
          'Generate a short, factual, non-accusatory response that clarifies next steps and reduces back-and-forth.',
        kidBenefit: clamp01(0.3 + 0.3 * features.impact),
        relationshipBenefit: clamp01(0.55 + 0.25 * (1 - features.emotionHeat)),
        schoolResolutionBenefit: clamp01(0.35 + 0.25 * features.blocking),
        cognitiveCost: 0.2,
        emotionalCost: clamp01(0.15 + 0.35 * features.emotionHeat),
        timeCostMin: 3,
        parentBurden: clamp01((features.parentBurden ?? 0.5) * 0.6),
        teacherBurden: clamp01((features.teacherBurden ?? 0.2) * 0.4),
        meta: { ...baseMeta, lane: 'deescalate' }
      });
    }
  }

  // Default micro-actions
  if (signal.type === 'form_request' || signal.type === 'assignment_deadline') {
    add({
      id: makeId('act'),
      familyId,
      createdAt,
      type: 'create_micro_task',
      title: 'Make a 5-minute micro-task',
      summary: 'Turn this into a single, concrete next step with an estimated time and a stopping point.',
      kidBenefit: clamp01(0.55 + 0.35 * features.impact),
      relationshipBenefit: clamp01(0.2 + 0.2 * (1 - features.emotionHeat)),
      schoolResolutionBenefit: clamp01(0.6 + 0.3 * features.blocking),
      cognitiveCost: 0.25,
      emotionalCost: clamp01(0.1 + 0.3 * features.emotionHeat),
      timeCostMin: 5,
      parentBurden: clamp01(features.parentBurden ?? 0.6),
      teacherBurden: clamp01(features.teacherBurden ?? 0.1),
      meta: { ...baseMeta, lane: 'execute' }
    });
  }

  // Slack controller (gentle activation)
  const slacky = state.slack >= 0.65;
  if (slacky && state.zone === 'green') {
    add({
      id: makeId('act'),
      familyId,
      createdAt,
      type: 'propose_meeting',
      title: 'Nudge a low-friction touchpoint',
      summary: 'Suggest a brief check-in or office-hours slot to prevent drift without creating pressure.',
      kidBenefit: clamp01(0.3 + 0.3 * state.childRisk),
      relationshipBenefit: 0.55,
      schoolResolutionBenefit: 0.25,
      cognitiveCost: 0.15,
      emotionalCost: 0.1,
      timeCostMin: 2,
      parentBurden: 0.25,
      teacherBurden: 0.25,
      meta: { ...baseMeta, lane: 'slack' }
    });

    add({
      id: makeId('act'),
      familyId,
      createdAt,
      type: 'suggest_connection_moment',
      title: 'Suggest a 2-minute connection moment',
      summary: 'Offer a tiny parent–child moment aligned to the week (e.g., curiosity question, empathy script).',
      kidBenefit: clamp01(0.35 + 0.25 * state.childRisk),
      relationshipBenefit: 0.35,
      schoolResolutionBenefit: 0.05,
      cognitiveCost: 0.05,
      emotionalCost: 0.05,
      timeCostMin: 2,
      parentBurden: 0.1,
      teacherBurden: 0.0,
      meta: { ...baseMeta, lane: 'connection' }
    });
  }

  // Always include restraint
  add({
    id: makeId('act'),
    familyId,
    createdAt,
    type: 'do_nothing',
    title: 'No action right now',
    summary: 'Defer action until the next digest window or a clearer signal arrives.',
    kidBenefit: 0.0,
    relationshipBenefit: 0.15,
    schoolResolutionBenefit: 0.0,
    cognitiveCost: 0.0,
    emotionalCost: 0.0,
    timeCostMin: 0,
    parentBurden: 0.0,
    teacherBurden: 0.0,
    meta: { ...baseMeta, lane: 'restraint' }
  });

  return actions;
}
