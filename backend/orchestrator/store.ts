/* eslint-env node */
import { createInitialState } from './state.ts';
import { createNotificationBucket } from './policy.ts';
import { parseTimestamp, TokenBucket } from './utils.ts';
import type {
  ActionQueueItem,
  DigestItem,
  DailyPlan,
  OrchestratorAction,
  OrchestratorSignal,
  OrchestratorState,
  WeeklyBrief,
} from './types.ts';

type InMemoryActionStatus = Extract<ActionQueueItem['status'], 'queued' | 'completed'>;
type InMemoryActionQueueItem = Omit<ActionQueueItem, 'status' | 'updatedAt'> & {
  status: InMemoryActionStatus;
};

export class OrchestratorStore {
  readonly states = new Map<string, OrchestratorState>();
  readonly buckets = new Map<string, TokenBucket>();
  private readonly signals = new Map<string, OrchestratorSignal[]>();
  private readonly digest = new Map<string, DigestItem[]>();
  private readonly dailyPlans = new Map<string, DailyPlan[]>();
  private readonly weeklyBriefs = new Map<string, WeeklyBrief[]>();
  private readonly actions = new Map<string, InMemoryActionQueueItem[]>();

  getOrCreateState(familyId: string, now = new Date()): OrchestratorState {
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

  getBucket(familyId: string): TokenBucket | null {
    return this.buckets.get(familyId) ?? null;
  }

  setState(familyId: string, next: OrchestratorState, now = new Date()): void {
    this.states.set(familyId, next);
    if (!this.buckets.has(familyId)) {
      this.buckets.set(familyId, createNotificationBucket(next, now));
    }
  }

  appendSignal(signal: OrchestratorSignal, max = 200): void {
    const familyId = signal.familyId;
    const list = this.signals.get(familyId) ?? [];
    list.push({ ...signal, timestamp: signal.timestamp ?? parseTimestamp(undefined).toISOString() });
    while (list.length > max) list.shift();
    this.signals.set(familyId, list);
  }

  getRecentSignals(familyId: string): OrchestratorSignal[] {
    return this.signals.get(familyId) ?? [];
  }

  appendDigestItem(familyId: string, item: DigestItem, max = 200): void {
    const list = this.digest.get(familyId) ?? [];
    list.push(item);
    while (list.length > max) list.shift();
    this.digest.set(familyId, list);
  }

  getDigest(familyId: string): DigestItem[] {
    return this.digest.get(familyId) ?? [];
  }

  markDigestDelivered(familyId: string): DigestItem[] {
    const list = this.digest.get(familyId) ?? [];
    const next: DigestItem[] = list.map((x) => (x.status === 'queued' ? { ...x, status: 'delivered' as const } : x));
    this.digest.set(familyId, next);
    return next;
  }

  appendDailyPlan(familyId: string, plan: DailyPlan, max = 30): void {
    const list = this.dailyPlans.get(familyId) ?? [];
    list.push(plan);
    while (list.length > max) list.shift();
    this.dailyPlans.set(familyId, list);
  }

  getDailyPlans(familyId: string): DailyPlan[] {
    return this.dailyPlans.get(familyId) ?? [];
  }

  appendWeeklyBrief(familyId: string, brief: WeeklyBrief, max = 12): void {
    const list = this.weeklyBriefs.get(familyId) ?? [];
    list.push(brief);
    while (list.length > max) list.shift();
    this.weeklyBriefs.set(familyId, list);
  }

  getWeeklyBriefs(familyId: string): WeeklyBrief[] {
    return this.weeklyBriefs.get(familyId) ?? [];
  }

  enqueueAction(familyId: string, action: OrchestratorAction): void {
    const list = this.actions.get(familyId) ?? [];
    list.push({ action, status: 'queued' });
    this.actions.set(familyId, list);
  }

  listActions(familyId: string): InMemoryActionQueueItem[] {
    return this.actions.get(familyId) ?? [];
  }

  completeAction(familyId: string, actionId: string): InMemoryActionQueueItem | null {
    const list = this.actions.get(familyId) ?? [];
    const next: InMemoryActionQueueItem[] = list.map((x) =>
      x.action.id === actionId ? { ...x, status: 'completed' as const } : x
    );
    this.actions.set(familyId, next);
    return next.find((x) => x.action.id === actionId) ?? null;
  }
}

export const orchestratorStore = new OrchestratorStore();
