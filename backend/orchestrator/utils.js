/* eslint-env node */
import crypto from 'crypto';

/**
 * Clamp a number into [0,1].
 * @param {number} n
 */
export function clamp01(n) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Exponential weighted moving average update.
 * new = alpha*x + (1-alpha)*prev
 * @param {number} prev
 * @param {number} x
 * @param {number} alpha 0..1
 */
export function ewma(prev, x, alpha) {
  return clamp01(alpha * x + (1 - alpha) * prev);
}

/**
 * Create a stable-ish id for actions/signals.
 * @param {string} prefix
 */
export function makeId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Parse ISO timestamp or default to now.
 * @param {string | undefined} iso
 */
export function parseTimestamp(iso) {
  const d = iso ? new Date(iso) : new Date();
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(d.getTime())) return new Date();
  return d;
}

/**
 * @param {Date} d
 */
export function toIso(d) {
  return d.toISOString();
}

/**
 * Basic token bucket for notification throttling.
 * tokens refill at `refillPerSec` up to capacity.
 */
export class TokenBucket {
  /**
   * @param {{ capacity: number; refillPerSec: number; now?: Date }} params
   */
  constructor({ capacity, refillPerSec, now = new Date() }) {
    this.capacity = Math.max(0, capacity);
    this.refillPerSec = Math.max(0, refillPerSec);
    this.tokens = this.capacity;
    this.updatedAt = now;
  }

  /** @param {Date} now */
  _refill(now) {
    const dtSec = Math.max(0, (now.getTime() - this.updatedAt.getTime()) / 1000);
    this.tokens = Math.min(this.capacity, this.tokens + dtSec * this.refillPerSec);
    this.updatedAt = now;
  }

  /**
   * @param {number} cost
   * @param {Date} now
   */
  tryConsume(cost, now = new Date()) {
    this._refill(now);
    const c = Math.max(0, cost);
    if (this.tokens >= c) {
      this.tokens -= c;
      return true;
    }
    return false;
  }
}
