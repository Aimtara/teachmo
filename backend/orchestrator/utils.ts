/* eslint-env node */
import crypto from 'crypto';

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function ewma(prev: number, x: number, alpha: number): number {
  return clamp01(alpha * x + (1 - alpha) * prev);
}

export function makeId(prefix = 'id'): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function parseTimestamp(iso?: string): Date {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

export function toIso(d: Date): string {
  return d.toISOString();
}

interface TokenBucketParams {
  capacity: number;
  refillPerSec: number;
  now?: Date;
}

/**
 * Basic token bucket for notification throttling.
 * tokens refill at `refillPerSec` up to capacity.
 */
export class TokenBucket {
  readonly capacity: number;
  readonly refillPerSec: number;
  private tokens: number;
  private updatedAt: Date;

  constructor({ capacity, refillPerSec, now = new Date() }: TokenBucketParams) {
    this.capacity = Math.max(0, capacity);
    this.refillPerSec = Math.max(0, refillPerSec);
    this.tokens = this.capacity;
    this.updatedAt = now;
  }

  private refill(now: Date): void {
    const dtSec = Math.max(0, (now.getTime() - this.updatedAt.getTime()) / 1000);
    this.tokens = Math.min(this.capacity, this.tokens + dtSec * this.refillPerSec);
    this.updatedAt = now;
  }

  tryConsume(cost: number, now = new Date()): boolean {
    this.refill(now);
    const c = Math.max(0, cost);
    if (this.tokens >= c) {
      this.tokens -= c;
      return true;
    }
    return false;
  }
}
