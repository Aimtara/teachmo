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
    /** @type {Map<string, import('./types.js').DigestItem[]>} */
    this.digest = new Map();
    /** @type {Map<string, import('./types.js').DailyPlan[]>} */
    this.dailyPlans = new Map();
    /** @type {Map<string, import('./types.js').WeeklyBrief[]>} */
    this.weeklyBriefs = new Map();
    /** @type {Map<string, Array<{ action: import('./types.js').OrchestratorAction, status: 'queued'|'completed' }>>} */
    this.actions = new Map();
  }

  getOrCreateState(familyId, now = new Date()) {
    const existing = this.states.get(familyId);
    if (existing) return existing;
    const init = createInitialState(familyId, now);
    this.states.set(familyId, init);
    this.buckets.set(familyId, createNotificationBucket(init, now));
    this.signals.set(familyId, []);
    this.digest.set(familyId, []);
    this.dailyPlans.set(familyId, []);
    this.weeklyBriefs.set(familyId, []);
    this.actions.set(familyId, []);
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

  appendDigestItem(familyId, item, max = 200) {
    const list = this.digest.get(familyId) ?? [];
    list.push(item);
    while (list.length > max) list.shift();
    this.digest.set(familyId, list);
  }

  getDigest(familyId) {
    return this.digest.get(familyId) ?? [];
  }

  markDigestDelivered(familyId) {
    const list = this.digest.get(familyId) ?? [];
    const next = list.map((x) => (x.status === 'queued' ? { ...x, status: 'delivered' } : x));
    this.digest.set(familyId, next);
    return next;
  }

  appendDailyPlan(familyId, plan, max = 30) {
    const list = this.dailyPlans.get(familyId) ?? [];
    list.push(plan);
    while (list.length > max) list.shift();
    this.dailyPlans.set(familyId, list);
  }

  getDailyPlans(familyId) {
    return this.dailyPlans.get(familyId) ?? [];
  }

  appendWeeklyBrief(familyId, brief, max = 12) {
    const list = this.weeklyBriefs.get(familyId) ?? [];
    list.push(brief);
    while (list.length > max) list.shift();
    this.weeklyBriefs.set(familyId, list);
  }

  getWeeklyBriefs(familyId) {
    return this.weeklyBriefs.get(familyId) ?? [];
  }

  enqueueAction(familyId, action) {
    const list = this.actions.get(familyId) ?? [];
    list.push({ action, status: 'queued' });
    this.actions.set(familyId, list);
  }

  listActions(familyId) {
    return this.actions.get(familyId) ?? [];
  }

  completeAction(familyId, actionId) {
    const list = this.actions.get(familyId) ?? [];
    const next = list.map((x) => (x.action.id === actionId ? { ...x, status: 'completed' } : x));
    this.actions.set(familyId, next);
    return next.find((x) => x.action.id === actionId) ?? null;
  }
}

export const orchestratorStore = new OrchestratorStore();
