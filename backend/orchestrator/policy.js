/* eslint-env node */
import { TokenBucket } from './utils.js';

/**
 * Create a notification token bucket from state constraints.
 * maxNotificationsPerHour => capacity and refill.
 * @param {import('./types.js').OrchestratorState} state
 * @param {Date} now
 */
export function createNotificationBucket(state, now = new Date()) {
  const cap = Math.max(0, state.maxNotificationsPerHour);
  const refillPerSec = cap / 3600;
  return new TokenBucket({ capacity: cap, refillPerSec, now });
}

/**
 * Basic quiet hours check.
 * Assumes server and user share timezone for this demo; in production use user tz.
 * @param {import('./types.js').OrchestratorState} state
 * @param {Date} now
 */
export function isWithinQuietHours(state, now = new Date()) {
  const q = state.quietHoursLocal;
  if (!q) return false;
  const [sh, sm] = q.start.split(':').map((n) => parseInt(n, 10));
  const [eh, em] = q.end.split(':').map((n) => parseInt(n, 10));
  if ([sh, sm, eh, em].some((x) => Number.isNaN(x))) return false;

  const start = new Date(now);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(now);
  end.setHours(eh, em, 0, 0);

  // Wrap midnight case
  if (end.getTime() <= start.getTime()) {
    return now.getTime() >= start.getTime() || now.getTime() < end.getTime();
  }

  return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}

/**
 * Decide whether we should suppress an immediate notification.
 * This is the “baroreflex brake”: throttle, batch, cool down.
 *
 * @param {{
 *   state: import('./types.js').OrchestratorState,
 *   signal: import('./types.js').OrchestratorSignal,
 *   features: import('./types.js').SignalFeatures,
 *   bucket: TokenBucket,
 *   now: Date,
 * }} params
 */
export function shouldSuppressNotifyNow({ state, signal, features, bucket, now }) {
  const payload = signal.payload ?? {};
  const isPriority = Boolean(payload.isSafety || payload.isCompliance || payload.priority === 'high');

  // Priority lane bypasses suppression.
  if (isPriority) return { suppress: false, reason: null };

  if (state.cooldownUntil) {
    const c = new Date(state.cooldownUntil);
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN(c.getTime()) && now.getTime() < c.getTime()) {
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
