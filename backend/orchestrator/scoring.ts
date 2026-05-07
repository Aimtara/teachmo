/* eslint-env node */
import { clamp01 } from './utils.ts';
import type { ActionType, OrchestratorAction, OrchestratorState } from './types.ts';

export interface ScoreWeights {
  kid: number;
  relationship: number;
  school: number;
  cognitive: number;
  emotional: number;
  time: number;
  fairness: number;
}

export interface ScoredActionTrace {
  actionId: string;
  type: ActionType;
  score: number;
  timeCostMin: number;
  cognitiveCost: number;
  emotionalCost: number;
  kidBenefit: number;
  relationshipBenefit: number;
  schoolResolutionBenefit: number;
  parentBurden: number;
  teacherBurden: number;
}

interface ActionUtilityOptions {
  weights?: Partial<ScoreWeights>;
}

interface OptimizeOptions extends ActionUtilityOptions {
  attentionBudgetMin?: number;
  allowNotifyNow?: boolean;
}

interface OptimizeResult {
  candidates: OrchestratorAction[];
  nextAction: OrchestratorAction | null;
  scored: ScoredActionTrace[];
}

export function fairnessPenalty(parentBurden: number, teacherBurden: number): number {
  const p = clamp01(parentBurden);
  const t = clamp01(teacherBurden);
  return Math.abs(p - t);
}

export function defaultWeights(): ScoreWeights {
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
 */
export function actionUtility(action: OrchestratorAction, opts: ActionUtilityOptions = {}): number {
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
 */
export function optimize(actions: OrchestratorAction[], state: OrchestratorState, opts: OptimizeOptions = {}): OptimizeResult {
  const attentionBudget = opts.attentionBudgetMin ?? state.dailyAttentionBudgetMin;
  const allowNotifyNow = opts.allowNotifyNow ?? true;
  const weights = opts.weights ?? {};

  const scored = actions
    .map((a) => ({ action: a, score: actionUtility(a, { weights }) }))
    .sort((a, b) => b.score - a.score);

  let remaining = attentionBudget;
  let nextAction: OrchestratorAction | null = null;

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
    nextAction,
    scored: scored.map((x) => ({
      actionId: x.action.id,
      type: x.action.type,
      score: x.score,
      timeCostMin: x.action.timeCostMin,
      cognitiveCost: x.action.cognitiveCost,
      emotionalCost: x.action.emotionalCost,
      kidBenefit: x.action.kidBenefit,
      relationshipBenefit: x.action.relationshipBenefit,
      schoolResolutionBenefit: x.action.schoolResolutionBenefit,
      parentBurden: x.action.parentBurden,
      teacherBurden: x.action.teacherBurden
    }))
  };
}
