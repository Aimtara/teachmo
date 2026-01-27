/* eslint-env node */
import { clamp01 } from './utils.js';

/**
 * Heuristic feature extraction.
 * In production, you can replace this with richer models (LLM classifier, rules, integrations).
 *
 * @param {import('./types.js').OrchestratorSignal} signal
 * @param {{ now?: Date }} [opts]
 * @returns {import('./types.js').SignalFeatures}
 */
export function extractFeatures(signal, opts = {}) {
  const now = opts.now ?? new Date();
  const payload = signal.payload ?? {};
  const base = {
    urgency: 0.2,
    impact: 0.3,
    effort: 0.2,
    emotionHeat: 0.1,
    blocking: 0.1,
    parentBurden: 0.2,
    teacherBurden: 0.2
  };

  // Optional structured hints from upstream.
  const deadlineIso = typeof payload.deadline === 'string' ? payload.deadline : undefined;
  const sentiment = typeof payload.sentiment === 'number' ? payload.sentiment : undefined; // -1..1
  const minutes = typeof payload.estimatedMinutes === 'number' ? payload.estimatedMinutes : undefined;

  // deadline -> urgency
  if (deadlineIso) {
    const d = new Date(deadlineIso);
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(d.getTime())) {
      const hours = Math.max(0, (d.getTime() - now.getTime()) / 36e5);
      // Within 0h => 1. Within 72h => ~0.3. Beyond => small.
      const u = hours <= 0 ? 1 : 1 / (1 + hours / 12);
      base.urgency = clamp01(u);
    }
  }

  // sentiment -> emotion heat (negative = hotter)
  if (typeof sentiment === 'number') {
    base.emotionHeat = clamp01((-sentiment + 1) / 2); // -1 => 1, +1 => 0
  }

  // minutes -> effort
  if (typeof minutes === 'number') {
    base.effort = clamp01(minutes / 30); // 30m+ => 1
  }

  switch (signal.type) {
    case 'school_message': {
      base.impact = 0.4;
      base.effort = Math.max(base.effort, 0.2);
      base.parentBurden = 0.3;
      base.teacherBurden = 0.2;
      break;
    }
    case 'assignment_deadline': {
      base.impact = 0.6;
      base.blocking = 0.5;
      base.parentBurden = 0.4;
      base.teacherBurden = 0.1;
      break;
    }
    case 'grade_flag': {
      base.impact = 0.7;
      base.emotionHeat = Math.max(base.emotionHeat, 0.3);
      base.parentBurden = 0.4;
      base.teacherBurden = 0.1;
      break;
    }
    case 'attendance_flag': {
      base.impact = 0.75;
      base.urgency = Math.max(base.urgency, 0.6);
      base.emotionHeat = Math.max(base.emotionHeat, 0.4);
      base.parentBurden = 0.5;
      base.teacherBurden = 0.1;
      break;
    }
    case 'behavior_note': {
      base.impact = 0.8;
      base.emotionHeat = Math.max(base.emotionHeat, 0.5);
      base.parentBurden = 0.5;
      base.teacherBurden = 0.2;
      break;
    }
    case 'form_request': {
      base.impact = 0.65;
      base.urgency = Math.max(base.urgency, 0.4);
      base.effort = Math.max(base.effort, 0.4);
      base.blocking = Math.max(base.blocking, 0.6);
      base.parentBurden = 0.6;
      base.teacherBurden = 0.1;
      break;
    }
    case 'event_invite': {
      base.impact = 0.35;
      base.urgency = Math.max(base.urgency, 0.2);
      base.effort = Math.max(base.effort, 0.2);
      base.parentBurden = 0.3;
      base.teacherBurden = 0.2;
      break;
    }
    case 'parent_capacity_update': {
      base.impact = 0.2;
      base.effort = 0.05;
      base.parentBurden = 0.0;
      base.teacherBurden = 0.0;
      break;
    }
    case 'calendar_density_update': {
      base.impact = 0.2;
      base.effort = 0.05;
      base.parentBurden = 0.0;
      base.teacherBurden = 0.0;
      break;
    }
    case 'child_context_update': {
      base.impact = 0.5;
      base.emotionHeat = Math.max(base.emotionHeat, 0.2);
      base.parentBurden = 0.2;
      base.teacherBurden = 0.0;
      break;
    }
    default:
      break;
  }

  // Explicit features win.
  const provided = signal.features ?? {};
  return {
    urgency: clamp01(provided.urgency ?? base.urgency),
    impact: clamp01(provided.impact ?? base.impact),
    effort: clamp01(provided.effort ?? base.effort),
    emotionHeat: clamp01(provided.emotionHeat ?? base.emotionHeat),
    blocking: clamp01(provided.blocking ?? base.blocking),
    parentBurden: clamp01(provided.parentBurden ?? base.parentBurden),
    teacherBurden: clamp01(provided.teacherBurden ?? base.teacherBurden)
  };
}
