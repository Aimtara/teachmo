/* eslint-env node */
import { TokenBucket } from './utils.js';
import type { OrchestratorSignal, OrchestratorState, SignalFeatures } from './types.js';

export interface SuppressionResult {
  suppress: boolean;
  reason: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Create a notification token bucket from state constraints. */
export function createNotificationBucket(state: OrchestratorState, now = new Date()): TokenBucket {
  const cap = Math.max(0, state.maxNotificationsPerHour);
  const refillPerSec = cap / 3600;
  return new TokenBucket({ capacity: cap, refillPerSec, now });
}

/** Basic quiet hours check. Assumes server and user share timezone for this demo. */
export function isWithinQuietHours(state: OrchestratorState, now = new Date()): boolean {
  const q = state.quietHoursLocal;
  if (!q) return false;
  const [sh, sm] = q.start.split(':').map((n) => parseInt(n, 10));
  const [eh, em] = q.end.split(':').map((n) => parseInt(n, 10));
  if ([sh, sm, eh, em].some((x) => Number.isNaN(x))) return false;

  const start = new Date(now);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);

  if (end.getTime() <= start.getTime()) {
    return now.getTime() >= start.getTime() || now.getTime() < end.getTime();
  }

  return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}

/** Decide whether we should suppress an immediate notification. */
export function shouldSuppressNotifyNow({
  state,
  signal,
  features,
  bucket,
  now,
}: {
  state: OrchestratorState;
  signal: OrchestratorSignal;
  features: SignalFeatures;
  bucket: TokenBucket;
  now: Date;
}): SuppressionResult {
  const payload = isRecord(signal.payload) ? signal.payload : {};
  const isPriority = Boolean(payload.isSafety || payload.isCompliance || payload.priority === 'high');

  if (isPriority) return { suppress: false, reason: null };

  if (state.cooldownUntil) {
    const c = new Date(state.cooldownUntil);
    if (!Number.isNaN(c.getTime()) && now.getTime() < c.getTime()) {
      return { suppress: true, reason: 'cooldown_active' };
    }
  }

  if (isWithinQuietHours(state, now) && features.urgency < 0.9) {
    return { suppress: true, reason: 'quiet_hours' };
  }

  if (state.zone === 'red' && features.urgency < 0.85) {
    return { suppress: true, reason: 'red_zone_throttle' };
  }

  if (!bucket.tryConsume(1, now)) {
    return { suppress: true, reason: 'rate_limited' };
  }

  return { suppress: false, reason: null };
}
