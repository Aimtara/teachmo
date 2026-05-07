export function clamp01(n: number): number;
export function ewma(prev: number, x: number, alpha: number): number;
export function makeId(prefix?: string): string;
export function parseTimestamp(iso?: string): Date;
export function toIso(d: Date): string;

export class TokenBucket {
  capacity: number;
  refillPerSec: number;
  tokens: number;
  updatedAt: Date;
  constructor(params: { capacity: number; refillPerSec: number; now?: Date });
  tryConsume(cost: number, now?: Date): boolean;
}
