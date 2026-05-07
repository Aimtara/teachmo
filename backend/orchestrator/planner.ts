/* eslint-env node */
import { generateCandidates } from './candidates.ts';
import { optimizePlan } from './scoring_plan.js';
import { extractFeatures } from './features.ts';
import { makeId, toIso } from './utils.ts';
import type { DailyPlan, OrchestratorAction, OrchestratorSignal, OrchestratorState } from './types.ts';

interface DailyPlannerParams {
  state: OrchestratorState;
  recentSignals: OrchestratorSignal[];
  now: Date;
  k?: number;
  horizonHours?: number;
}

interface UpcomingSignal {
  s: OrchestratorSignal;
  deadline: string;
  d: Date;
}

interface OptimizePlanResult {
  chosen: OrchestratorAction[];
  rationale: string;
}

function payloadString(signal: OrchestratorSignal, key: string): string | undefined {
  const value = signal.payload?.[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Build a daily plan (top K actions under attention budget).
 * We use a "system_daily_tick" pseudo signal to reuse candidate generation logic.
 *
 */
export function runDailyPlanner({ state, recentSignals, now, k = 3, horizonHours = 24 }: DailyPlannerParams): DailyPlan {
  const windowStart = now;
  const windowEnd = new Date(now.getTime() + horizonHours * 3600 * 1000);

  const upcoming = recentSignals
    .map((s) => ({ s, deadline: payloadString(s, 'deadline') }))
    .filter((x): x is { s: OrchestratorSignal; deadline: string } => typeof x.deadline === 'string')
    .map((x) => ({ ...x, d: new Date(x.deadline) }))
    .filter((x): x is UpcomingSignal => !Number.isNaN(x.d.getTime()))
    .filter((x) => x.d.getTime() >= now.getTime() && x.d.getTime() <= windowEnd.getTime())
    .slice(0, 10);

  const tickSignal: OrchestratorSignal = {
    familyId: state.familyId,
    source: 'system',
    type: 'system_daily_tick',
    timestamp: toIso(now),
    payload: {
      upcomingDeadlines: upcoming.map((x) => ({
        type: x.s.type,
        deadline: payloadString(x.s, 'deadline'),
        title: payloadString(x.s, 'title') ?? x.s.type
      }))
    }
  };

  const tickFeatures = extractFeatures(tickSignal, { now });

  let candidates: OrchestratorAction[] = generateCandidates({ state, signal: tickSignal, features: tickFeatures, now });

  for (const item of upcoming) {
    const synthetic = {
      familyId: state.familyId,
      source: item.s.source,
      type: item.s.type,
      timestamp: toIso(now),
      payload: { ...(item.s.payload ?? {}), deadline: item.deadline, synthetic: true }
    };
    const f = extractFeatures(synthetic, { now });
    candidates = candidates.concat(generateCandidates({ state, signal: synthetic, features: f, now }));
  }

  const attentionBudgetMin =
    state.zone === 'red' ? Math.max(5, Math.floor(state.dailyAttentionBudgetMin * 0.5)) : state.dailyAttentionBudgetMin;

  const { chosen, rationale } = optimizePlan(candidates, state, {
    k,
    attentionBudgetMin,
    allowNotifyNow: state.zone !== 'red'
  }) as OptimizePlanResult;

  return {
    id: makeId('dplan'),
    familyId: state.familyId,
    createdAt: toIso(now),
    windowStart: toIso(windowStart),
    windowEnd: toIso(windowEnd),
    zoneAtPlanTime: state.zone,
    attentionBudgetMin,
    actions: chosen,
    rationale
  };
}
