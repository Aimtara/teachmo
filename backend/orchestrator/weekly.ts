/* eslint-env node */
import { makeId, toIso, clamp01 } from './utils.js';
import type { OrchestratorSignal, OrchestratorState, WeeklyBrief } from './types.js';

export interface WeeklyRegulatorResult {
  brief: WeeklyBrief;
  setpoints: WeeklyBrief['setpointAdjustments'];
}

function emptySetpointAdjustments(): NonNullable<WeeklyBrief['setpointAdjustments']> {
  return {};
}

/** Generate a deterministic weekly brief. */
export function runWeeklyRegulator({
  state,
  recentSignals,
  now,
}: {
  state: OrchestratorState;
  recentSignals: OrchestratorSignal[];
  now: Date;
}): WeeklyRegulatorResult {
  const weekEnd = now;
  const weekStart = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const counts: Record<string, number> = {};
  for (const s of recentSignals) {
    counts[s.type] = (counts[s.type] ?? 0) + 1;
  }

  const highlights: string[] = [];
  const risks: string[] = [];

  if ((counts.assignment_deadline ?? 0) > 3) highlights.push('Multiple deadlines landed this week — structure helps more than reminders.');
  if ((counts.form_request ?? 0) > 1) highlights.push('Paperwork week: batching forms into one sitting reduces context switching.');
  if (state.relationshipStrain > 0.55) risks.push('Tone/heat risk: keep messages factual + short to avoid escalation loops.');
  if (state.childRisk > 0.6) risks.push('Child risk signals are elevated: prioritize one supportive action over many small nudges.');
  if (state.tension > 0.7) risks.push('High load week: reduce notifications, lean on digest, focus on minimum viable follow-through.');
  if (state.slack > 0.65 && state.zone === 'green') {
    risks.push('Low-touch drift risk: a brief check-in can prevent surprises later.');
  }

  const recommendedNextSteps: string[] = [];
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
  const whyNow = buildWhyNow(state);

  const brief: WeeklyBrief = {
    id: makeId('wbrief'),
    familyId: state.familyId,
    createdAt: toIso(now),
    weekStart: toIso(weekStart),
    weekEnd: toIso(weekEnd),
    zoneSummary: {
      currentZone: state.zone,
      tension: clamp01(state.tension),
      slack: clamp01(state.slack),
      cooldownActive: Boolean(state.cooldownUntil),
    },
    signalCounts: counts,
    highlights: highlights.length ? highlights : ['Steady week: keep systems simple and predictable.'],
    risks: risks.length ? risks : ['No major risks detected — stay consistent and avoid over-optimizing.'],
    recommendedNextSteps,
    whyNow,
    setpointAdjustments: setpoints,
  };

  return { brief, setpoints };
}

function tuneSetpoints(state: OrchestratorState): NonNullable<WeeklyBrief['setpointAdjustments']> {
  const adj = emptySetpointAdjustments();

  if (state.zone === 'red' || state.tension > 0.75) {
    adj.dailyAttentionBudgetMin = Math.max(5, Math.floor(state.dailyAttentionBudgetMin * 0.8));
    adj.maxNotificationsPerHour = Math.max(1, state.maxNotificationsPerHour - 1);
  } else if (state.zone === 'green' && state.slack > 0.7) {
    adj.maxNotificationsPerHour = Math.min(5, state.maxNotificationsPerHour + 1);
  }

  return adj;
}

function buildWhyNow(state: OrchestratorState): string {
  if (state.zone === 'red' || state.tension > 0.75) {
    return 'Because this week is high-load, one focused step plus batching will reduce stress without dropping the ball.';
  }
  if (state.slack > 0.7 && state.zone === 'green') {
    return 'Because touchpoints have been light, a small check-in now prevents surprises later with very little effort.';
  }
  if (state.relationshipStrain > 0.55) {
    return 'Because communication heat is rising, a calm, brief approach keeps the relationship strong while solving the issue.';
  }
  return 'Because steady routines beat heroic effort, the next small step keeps home and school aligned without overload.';
}
