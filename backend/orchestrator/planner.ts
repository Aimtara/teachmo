/* eslint-env node */
import { generateCandidates } from './candidates.js';
import { optimizePlan } from './scoring_plan.js';
import { extractFeatures } from './features.js';
import { makeId, toIso } from './utils.js';
import type { DailyPlan, OrchestratorSignal, OrchestratorState } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deadlineFromSignal(signal: OrchestratorSignal): string | null {
  const payload = isRecord(signal.payload) ? signal.payload : {};
  return typeof payload.deadline === 'string' ? payload.deadline : null;
}

function titleFromSignal(signal: OrchestratorSignal): string {
  const payload = isRecord(signal.payload) ? signal.payload : {};
  return typeof payload.title === 'string' ? payload.title : signal.type;
}

/** Build a daily plan (top K actions under attention budget). */
export function runDailyPlanner({
  state,
  recentSignals,
  now,
  k = 3,
  horizonHours = 24,
}: {
  state: OrchestratorState;
  recentSignals: OrchestratorSignal[];
  now: Date;
  k?: number;
  horizonHours?: number;
}): DailyPlan {
  const windowStart = now;
  const windowEnd = new Date(now.getTime() + horizonHours * 3600 * 1000);

  const upcoming = recentSignals
    .map((s) => ({ s, deadline: deadlineFromSignal(s) }))
    .filter((x): x is { s: OrchestratorSignal; deadline: string } => typeof x.deadline === 'string')
    .map((x) => ({ ...x, d: new Date(x.deadline) }))
    .filter((x) => !Number.isNaN(x.d.getTime()))
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
        deadline: x.deadline,
        title: titleFromSignal(x.s),
      })),
    },
  };

  const tickFeatures = extractFeatures(tickSignal, { now });

  let candidates = generateCandidates({ state, signal: tickSignal, features: tickFeatures, now });

  for (const item of upcoming) {
    const payload = isRecord(item.s.payload) ? item.s.payload : {};
    const synthetic: OrchestratorSignal = {
      familyId: state.familyId,
      source: item.s.source,
      type: item.s.type,
      timestamp: toIso(now),
      payload: { ...payload, deadline: item.deadline, synthetic: true },
    };
    const f = extractFeatures(synthetic, { now });
    candidates = candidates.concat(generateCandidates({ state, signal: synthetic, features: f, now }));
  }

  const attentionBudgetMin =
    state.zone === 'red' ? Math.max(5, Math.floor(state.dailyAttentionBudgetMin * 0.5)) : state.dailyAttentionBudgetMin;

  const { chosen, rationale } = optimizePlan(candidates, state, {
    k,
    attentionBudgetMin,
    allowNotifyNow: state.zone !== 'red',
  });

  return {
    id: makeId('dplan'),
    familyId: state.familyId,
    createdAt: toIso(now),
    windowStart: toIso(windowStart),
    windowEnd: toIso(windowEnd),
    zoneAtPlanTime: state.zone,
    attentionBudgetMin,
    actions: chosen,
    rationale,
  };
}
