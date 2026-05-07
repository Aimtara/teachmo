/* eslint-env node */
import { clamp01, ewma, toIso } from './utils.ts';
import type { OrchestratorSignal, OrchestratorState, OrchestratorZone, SignalFeatures } from './types.ts';

interface Thresholds {
  tensionLow: number;
  tensionHigh: number;
  slackHigh: number;
  dwellMs: number;
  cooldownMs: number;
}

interface Indices {
  tension: number;
  slack: number;
}

interface UpdateZoneOptions {
  thresholds?: Thresholds;
  now?: Date;
}

type ReduceStateOptions = UpdateZoneOptions;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asQuietHours(value: unknown): OrchestratorState['quietHoursLocal'] | null {
  const q = asRecord(value);
  return typeof q.start === 'string' && typeof q.end === 'string' ? { start: q.start, end: q.end } : null;
}

/**
 * Default knobs.
 * Start with constants; later you can learn per-family adjustments.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  tensionLow: 0.45,
  tensionHigh: 0.7,
  slackHigh: 0.65,
  // Hysteresis dwell time (ms)
  dwellMs: 5 * 60 * 1000,
  // Cooldown duration after entering RED (ms)
  cooldownMs: 60 * 60 * 1000
};

/**
 */
export function createInitialState(familyId: string, now = new Date()): OrchestratorState {
  const iso = toIso(now);
  return {
    familyId,
    updatedAt: iso,

    parentBandwidth: 0.6,
    schoolPressure: 0.3,
    backlogLoad: 0.2,
    relationshipStrain: 0.1,
    childRisk: 0.2,
    engagementSlack: 0.3,
    scheduleDensity: 0.3,

    tension: 0.25,
    slack: 0.3,
    zone: 'green',
    zoneSince: iso,
    cooldownUntil: null,

    dailyAttentionBudgetMin: 15,
    maxNotificationsPerHour: 3,
    quietHoursLocal: { start: '21:00', end: '07:00' }
  };
}

/**
 */
export function computeIndices(s: OrchestratorState): Indices {
  // Tension: overload / strain across home-school boundary (GTO-like).
  const tension = clamp01(
    0.22 * s.schoolPressure +
      0.18 * s.backlogLoad +
      0.22 * s.relationshipStrain +
      0.18 * s.scheduleDensity +
      0.2 * s.childRisk -
      0.22 * s.parentBandwidth
  );

  // Slack: drift / under-engagement risk (spindle-like).
  const slack = clamp01(
    0.4 * s.engagementSlack +
      0.3 * (1 - s.backlogLoad) +
      0.2 * (1 - s.schoolPressure) +
      0.1 * (s.childRisk > 0.6 ? 1 : 0)
  );

  return { tension, slack };
}

/**
 */
export function updateZone(prev: OrchestratorState, indices: Pick<Indices, 'tension'>, opts: UpdateZoneOptions = {}): {
  zone: OrchestratorZone;
  zoneSince: string;
} {
  const t = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const now = opts.now ?? new Date();
  const prevZone = prev.zone;
  const prevSince = new Date(prev.zoneSince);
  const dwellOk = now.getTime() - prevSince.getTime() >= t.dwellMs;

  let nextZone = prevZone;
  if (indices.tension >= t.tensionHigh) {
    nextZone = 'red';
  } else if (indices.tension >= t.tensionLow) {
    if (prevZone !== 'amber') nextZone = dwellOk ? 'amber' : prevZone;
  } else {
    if (prevZone !== 'green') nextZone = dwellOk ? 'green' : prevZone;
  }

  const changed = nextZone !== prevZone;
  return {
    zone: nextZone,
    zoneSince: changed ? toIso(now) : prev.zoneSince
  };
}

/**
 * Update the state from a new signal.
 * This is the “homeostasis layer”: fast smoothing + simple causality.
 *
 */
export function reduceState(
  prev: OrchestratorState,
  signal: OrchestratorSignal,
  features: SignalFeatures,
  opts: ReduceStateOptions = {}
): OrchestratorState {
  const now = opts.now ?? new Date();
  const alphaFast = 0.35;
  const alphaSlow = 0.12;

  const next: OrchestratorState = { ...prev };
  const payload = asRecord(signal.payload);

  // --- explicit home updates ---
  if (signal.type === 'parent_capacity_update' && typeof payload.bandwidth === 'number') {
    next.parentBandwidth = clamp01(payload.bandwidth);
  }
  if (signal.type === 'calendar_density_update' && typeof payload.density === 'number') {
    next.scheduleDensity = clamp01(payload.density);
  }
  if (signal.type === 'parent_preference_update' && payload.quietHours) {
    const quietHours = asQuietHours(payload.quietHours);
    if (quietHours) next.quietHoursLocal = quietHours;
  }

  // --- general causal nudges ---
  if (signal.source === 'school') {
    const pressureDelta = clamp01(0.55 * features.urgency + 0.45 * features.impact);
    next.schoolPressure = ewma(prev.schoolPressure, pressureDelta, alphaFast);

    const backlogDelta = clamp01(0.5 * features.effort + 0.5 * features.blocking);
    next.backlogLoad = ewma(prev.backlogLoad, backlogDelta, alphaFast);

    const relDelta = clamp01(features.emotionHeat);
    next.relationshipStrain = ewma(prev.relationshipStrain, relDelta, alphaSlow);
  }

  if (signal.source === 'home') {
    next.engagementSlack = ewma(prev.engagementSlack, 0.2, 0.15);
  }

  if (signal.type === 'action_completed') {
    next.backlogLoad = ewma(prev.backlogLoad, 0.05, 0.25);
    next.relationshipStrain = ewma(prev.relationshipStrain, 0.05, 0.2);
  }

  if (signal.type === 'attendance_flag' || signal.type === 'behavior_note' || signal.type === 'grade_flag') {
    const riskDelta = clamp01(0.55 * features.impact + 0.45 * features.emotionHeat);
    next.childRisk = ewma(prev.childRisk, riskDelta, alphaSlow);
  } else if (signal.type === 'child_context_update' && typeof payload.risk === 'number') {
    next.childRisk = clamp01(payload.risk);
  } else {
    next.childRisk = ewma(prev.childRisk, 0.2, 0.03);
  }

  // Drift heuristic (replace with real touchpoint telemetry later)
  const drift = clamp01(0.5 * (1 - next.schoolPressure) + 0.5 * (1 - next.backlogLoad));
  next.engagementSlack = ewma(prev.engagementSlack, drift, 0.05);

  // Indices + zone
  const indices = computeIndices(next);
  next.tension = indices.tension;
  next.slack = indices.slack;

  const { zone, zoneSince } = updateZone(prev, indices, { thresholds: opts.thresholds, now });
  next.zone = zone;
  next.zoneSince = zoneSince;

  // Cooldown after entering RED
  if (prev.zone !== 'red' && next.zone === 'red') {
    const t = opts.thresholds ?? DEFAULT_THRESHOLDS;
    next.cooldownUntil = toIso(new Date(now.getTime() + t.cooldownMs));
  }
  if (next.cooldownUntil) {
    const c = new Date(next.cooldownUntil);
    if (!Number.isNaN(c.getTime()) && c.getTime() <= now.getTime()) {
      next.cooldownUntil = null;
    }
  }

  next.updatedAt = toIso(now);
  return next;
}
