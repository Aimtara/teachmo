/* eslint-env node */
import { clamp01 } from './utils.js';

export function fairnessPenalty(parentBurden, teacherBurden) {
  const p = clamp01(parentBurden);
  const t = clamp01(teacherBurden);
  return Math.abs(p - t);
}

export function defaultWeights() {
  return {
    kid: 0.45,
    relationship: 0.25,
    school: 0.3,
    cognitive: 0.25,
    emotional: 0.25,
    time: 0.2,
    fairness: 0.15
  };
}

/**
 * Compute a single scalar utility for an action.
 * @param {import('./types.js').OrchestratorAction} action
 * @param {{ weights?: Partial<ReturnType<typeof defaultWeights>> }} [opts]
 */
export function actionUtility(action, opts = {}) {
  const w = { ...defaultWeights(), ...(opts.weights ?? {}) };
  const fair = fairnessPenalty(action.parentBurden, action.teacherBurden);

  const benefit =
    w.kid * action.kidBenefit +
    w.relationship * action.relationshipBenefit +
    w.school * action.schoolResolutionBenefit;

  const cost =
    w.cognitive * action.cognitiveCost +
    w.emotional * action.emotionalCost +
    w.time * clamp01(action.timeCostMin / 30);

  return benefit - cost - w.fairness * fair;
}

/**
 * Greedy optimizer under attention budget + notification constraints.
 * @param {import('./types.js').OrchestratorAction[]} actions
 * @param {import('./types.js').OrchestratorState} state
 * @param {{ weights?: Partial<ReturnType<typeof defaultWeights>>, attentionBudgetMin?: number, allowNotifyNow?: boolean }} [opts]
 */
export function optimize(actions, state, opts = {}) {
  const attentionBudget = opts.attentionBudgetMin ?? state.dailyAttentionBudgetMin;
  const allowNotifyNow = opts.allowNotifyNow ?? true;
  const weights = opts.weights ?? {};

  const scored = actions
    .map((a) => ({ action: a, score: actionUtility(a, { weights }) }))
    .sort((a, b) => b.score - a.score);

  let remaining = attentionBudget;
  let nextAction = null;

  for (const s of scored) {
    const a = s.action;
    if (!allowNotifyNow && a.type === 'notify_now') continue;
    if (a.timeCostMin > remaining) continue;
    if (a.type === 'notify_now' && remaining < 2) continue;
    nextAction = a;
    break;
  }

  return {
    candidates: scored.map((x) => x.action),
    nextAction
  };
}
