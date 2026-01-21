/* eslint-env node */
import { createInitialState } from './state.js';
import { createNotificationBucket } from './policy.js';
import { parseTimestamp } from './utils.js';

export class OrchestratorStore {
  constructor() {
    /** @type {Map<string, import('./types.js').OrchestratorState>} */
    this.states = new Map();
    /** @type {Map<string, import('./utils.js').TokenBucket>} */
    this.buckets = new Map();
    /** @type {Map<string, import('./types.js').OrchestratorSignal[]>} */
    this.signals = new Map();
  }

  getOrCreateState(familyId, now = new Date()) {
    const existing = this.states.get(familyId);
    if (existing) return existing;
    const init = createInitialState(familyId, now);
    this.states.set(familyId, init);
    this.buckets.set(familyId, createNotificationBucket(init, now));
    this.signals.set(familyId, []);
    return init;
  }

  getBucket(familyId) {
    return this.buckets.get(familyId) ?? null;
  }

  setState(familyId, next, now = new Date()) {
    this.states.set(familyId, next);
    if (!this.buckets.has(familyId)) {
      this.buckets.set(familyId, createNotificationBucket(next, now));
    }
  }

  appendSignal(signal, max = 200) {
    const familyId = signal.familyId;
    const list = this.signals.get(familyId) ?? [];
    list.push({ ...signal, timestamp: signal.timestamp ?? parseTimestamp(undefined).toISOString() });
    while (list.length > max) list.shift();
    this.signals.set(familyId, list);
  }

  getRecentSignals(familyId) {
    return this.signals.get(familyId) ?? [];
  }
}

export const orchestratorStore = new OrchestratorStore();
