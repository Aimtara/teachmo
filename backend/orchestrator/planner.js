/* eslint-env node */
import { generateCandidates } from './candidates.js';
import { optimizePlan } from './scoring_plan.js';
import { extractFeatures } from './features.js';
import { makeId, toIso } from './utils.js';

/**
 * Build a daily plan (top K actions under attention budget).
 * We use a "system_daily_tick" pseudo signal to reuse candidate generation logic.
 *
 * @param {{
 *   state: import('./types.js').OrchestratorState,
 *   recentSignals: import('./types.js').OrchestratorSignal[],
 *   now: Date,
 *   k?: number,
 *   horizonHours?: number
 * }} params
 * @returns {import('./types.js').DailyPlan}
 */
export function runDailyPlanner({ state, recentSignals, now, k = 3, horizonHours = 24 }) {
  const windowStart = now;
  const windowEnd = new Date(now.getTime() + horizonHours * 3600 * 1000);

  const upcoming = recentSignals
    .map((s) => ({ s, deadline: s?.payload?.deadline }))
    .filter((x) => typeof x.deadline === 'string')
    .map((x) => ({ ...x, d: new Date(x.deadline) }))
    // eslint-disable-next-line no-restricted-globals
    .filter((x) => !isNaN(x.d.getTime()))
    .filter((x) => x.d.getTime() >= now.getTime() && x.d.getTime() <= windowEnd.getTime())
    .slice(0, 10);

  const tickSignal = {
    familyId: state.familyId,
    source: 'system',
    type: 'system_daily_tick',
    timestamp: toIso(now),
    payload: {
      upcomingDeadlines: upcoming.map((x) => ({
        type: x.s.type,
        deadline: x.s.payload.deadline,
        title: x.s.payload?.title ?? x.s.type
      }))
    }
  };

  const tickFeatures = extractFeatures(tickSignal, { now });

  let candidates = generateCandidates({ state, signal: tickSignal, features: tickFeatures, now });

  for (const item of upcoming) {
    const synthetic = {
      familyId: state.familyId,
      source: item.s.source,
      type: item.s.type,
      timestamp: toIso(now),
      payload: { ...item.s.payload, deadline: item.s.payload.deadline, synthetic: true }
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
    rationale
  };
}
