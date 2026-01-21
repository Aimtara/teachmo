/* eslint-env node */
import { makeId, toIso, clamp01 } from './utils.js';

/**
 * Generate a deterministic weekly brief.
 * (Later: replace highlights/risks with LLM, but keep the structure locked.)
 *
 * @param {{
 *  state: import('./types.js').OrchestratorState,
 *  recentSignals: import('./types.js').OrchestratorSignal[],
 *  now: Date,
 * }} params
 * @returns {{ brief: import('./types.js').WeeklyBrief, setpoints: { dailyAttentionBudgetMin?: number, maxNotificationsPerHour?: number } }}
 */
export function runWeeklyRegulator({ state, recentSignals, now }) {
  const weekEnd = now;
  const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const counts = {};
  for (const s of recentSignals) {
    counts[s.type] = (counts[s.type] ?? 0) + 1;
  }

  const highlights = [];
  const risks = [];

  if ((counts.assignment_deadline ?? 0) > 3) highlights.push('Multiple deadlines landed this week — structure helps more than reminders.');
  if ((counts.form_request ?? 0) > 1) highlights.push('Paperwork week: batching forms into one sitting reduces context switching.');
  if (state.relationshipStrain > 0.55) risks.push('Tone/heat risk: keep messages factual + short to avoid escalation loops.');
  if (state.childRisk > 0.6) risks.push('Child risk signals are elevated: prioritize one supportive action over many small nudges.');
  if (state.tension > 0.7) risks.push('High load week: reduce notifications, lean on digest, focus on minimum viable follow-through.');
  if (state.slack > 0.65 && state.zone === 'green')
    risks.push('Low-touch drift risk: a brief check-in can prevent surprises later.');

  const recommendedNextSteps = [];
  if (state.zone === 'red') {
    recommendedNextSteps.push('Batch non-urgent school messages into a digest.');
    recommendedNextSteps.push('Pick one “must do” action and explicitly defer the rest.');
  } else if (state.slack > 0.65) {
    recommendedNextSteps.push('Schedule a 10-minute touchpoint (office hours or quick message) to stay aligned.');
    recommendedNextSteps.push('Do one 2-minute parent-child connection moment to surface hidden worries early.');
  } else {
    recommendedNextSteps.push('Keep the “one next action” rhythm: do the highest impact step, then stop.');
  }

  const setpoints = tuneSetpoints(state);

  const brief = {
    id: makeId('wbrief'),
    familyId: state.familyId,
    createdAt: toIso(now),
    weekStart: toIso(weekStart),
    weekEnd: toIso(weekEnd),
    zoneSummary: {
      currentZone: state.zone,
      tension: clamp01(state.tension),
      slack: clamp01(state.slack),
      cooldownActive: Boolean(state.cooldownUntil)
    },
    signalCounts: counts,
    highlights: highlights.length ? highlights : ['Steady week: keep systems simple and predictable.'],
    risks: risks.length ? risks : ['No major risks detected — stay consistent and avoid over-optimizing.'],
    recommendedNextSteps,
    setpointAdjustments: setpoints
  };

  return { brief, setpoints };
}

/**
 * Conservative tuning only.
 * (Never do big swings without strong evidence.)
 */
function tuneSetpoints(state) {
  const adj = {};

  if (state.zone === 'red' || state.tension > 0.75) {
    adj.dailyAttentionBudgetMin = Math.max(5, Math.floor(state.dailyAttentionBudgetMin * 0.8));
    adj.maxNotificationsPerHour = Math.max(1, state.maxNotificationsPerHour - 1);
  } else if (state.zone === 'green' && state.slack > 0.7) {
    adj.maxNotificationsPerHour = Math.min(5, state.maxNotificationsPerHour + 1);
  }

  return adj;
}
