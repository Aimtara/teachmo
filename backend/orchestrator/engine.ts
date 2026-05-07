/* eslint-env node */
import {
  OrchestratorDecisionSchema,
  OrchestratorSignalSchema,
  OrchestratorStateSchema,
  DigestItemSchema,
  DailyPlanSchema
} from './types.js';
import type {
  DailyPlan,
  DigestItem,
  OrchestratorDecision,
  OrchestratorSignal,
  OrchestratorState,
  SignalFeatures,
  WeeklyBrief,
} from './types.js';
import { parseTimestamp, makeId, toIso } from './utils.js';
import { extractFeatures } from './features.js';
import { createInitialState, reduceState } from './state.js';
import { generateCandidates } from './candidates.js';
import { shouldSuppressNotifyNow, createNotificationBucket } from './policy.js';
import { optimize } from './scoring.js';
import { OrchestratorStore, orchestratorStore } from './store.js';
import { runDailyPlanner } from './planner.js';
import { runWeeklyRegulator } from './weekly.js';
import { generateWeeklyBriefWithLLM } from './weekly_llm.js';
import { orchestratorPgStore } from './pgStore.js';
import { auditEventBare } from '../security/audit.js';
import { maybeFlagAnomalyFromAudit } from '../security/anomaly.js';

interface OrchestratorEngineOptions {
  store?: OrchestratorStore;
}

interface ListOptions {
  limit?: number;
  offset?: number;
}

interface DigestListOptions extends ListOptions {
  status?: 'queued' | 'delivered' | 'dismissed' | 'all';
}

interface ActionListOptions extends ListOptions {
  status?: 'queued' | 'completed' | 'dismissed' | 'all';
}

interface WeeklySetpoints {
  dailyAttentionBudgetMin?: number;
  maxNotificationsPerHour?: number;
}

type InMemoryActionQueueItem = ReturnType<OrchestratorStore['listActions']>[number];

type AuditEventBareFn = (event: Record<string, unknown>) => Promise<unknown>;
type MaybeFlagAnomalyFn = (event: Record<string, unknown>) => Promise<unknown>;

const auditEventBareTyped = auditEventBare as unknown as AuditEventBareFn;
const maybeFlagAnomalyFromAuditTyped = maybeFlagAnomalyFromAudit as unknown as MaybeFlagAnomalyFn;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export class OrchestratorEngine {
  readonly store: OrchestratorStore;

  constructor(opts: OrchestratorEngineOptions = {}) {
    this.store = opts.store ?? orchestratorStore;
  }

  async _getOrInitState(familyId: string, now = new Date()): Promise<OrchestratorState> {
    const inMem = this.store.states.get(familyId);
    if (inMem) return OrchestratorStateSchema.parse(inMem);

    const fromDb = await orchestratorPgStore.getState(familyId);
    if (fromDb) {
      this.store.setState(familyId, fromDb, now);
      return fromDb;
    }

    const init = createInitialState(familyId, now);
    this.store.setState(familyId, init, now);
    await orchestratorPgStore.upsertState(init);
    return init;
  }

  async ingest(rawSignal: OrchestratorSignal): Promise<OrchestratorDecision> {
    const parsed = OrchestratorSignalSchema.parse(rawSignal);
    const now = parseTimestamp(parsed.timestamp);

    const { inserted } = await orchestratorPgStore.insertSignalIdempotent(parsed);

    if (!inserted) {
      await auditEventBareTyped({
        eventType: 'duplicate_signal',
        severity: 'info',
        userId: null,
        familyId: parsed.familyId,
        statusCode: 200,
        meta: { idempotencyKey: parsed.idempotencyKey ?? null, signalType: parsed.type }
      });
      await maybeFlagAnomalyFromAuditTyped({ familyId: parsed.familyId, eventType: 'duplicate_signal', windowMinutes: 10 });

      const state = await this._getOrInitState(parsed.familyId, now);
      return OrchestratorDecisionSchema.parse({
        state,
        nextAction: null,
        candidates: [],
        suppressedReason: 'duplicate_signal'
      });
    }

    this.store.appendSignal(parsed);

    const prevState = await this._getOrInitState(parsed.familyId, now);
    const bucket = this.store.getBucket(parsed.familyId) ?? createNotificationBucket(prevState, now);

    const features = extractFeatures(parsed, { now });
    const nextState = reduceState(prevState, parsed, features, { now });
    this.store.setState(parsed.familyId, nextState, now);
    await orchestratorPgStore.upsertState(nextState);

    const candidates = generateCandidates({ state: nextState, signal: parsed, features, now });

    const suppression = shouldSuppressNotifyNow({ state: nextState, signal: parsed, features, bucket, now });
    const allowNotifyNow = !suppression.suppress;

    const { candidates: sortedCandidates, nextAction, scored } = optimize(candidates, nextState, { allowNotifyNow });

    if (suppression.suppress) {
      const digestItem = DigestItemSchema.parse({
        id: makeId('dig'),
        familyId: parsed.familyId,
        createdAt: toIso(now),
        signalType: parsed.type,
        title: digestTitle(parsed),
        summary: digestSummary(parsed, features),
        urgency: features.urgency,
        impact: features.impact,
        meta: { reason: suppression.reason, payload: parsed.payload ?? {} },
        status: 'queued'
      });
      await orchestratorPgStore.insertDigestItem(digestItem);
    }

    if (nextAction) {
      this.store.enqueueAction(parsed.familyId, nextAction);
      await orchestratorPgStore.upsertAction(parsed.familyId, nextAction, 'queued');
    }

    await orchestratorPgStore.insertDecisionTrace({
      familyId: parsed.familyId,
      triggerType: 'ingest',
      triggerId: parsed.id ?? null,
      suppressedReason: suppression.suppress ? suppression.reason : null,
      chosenActionId: nextAction?.id ?? null,
      zone: nextState.zone,
      tension: nextState.tension,
      slack: nextState.slack,
      trace: {
        signal: {
          id: parsed.id ?? null,
          type: parsed.type,
          source: parsed.source,
          timestamp: parsed.timestamp ?? null,
          idempotencyKey: parsed.idempotencyKey ?? null
        },
        features,
        stateBefore: prevState,
        stateAfter: nextState,
        allowNotifyNow,
        suppression,
        scoredCandidates: scored.slice(0, 12)
      }
    });

    const stateOk = OrchestratorStateSchema.parse(nextState);
    const decision = {
      state: stateOk,
      nextAction: nextAction ?? null,
      candidates: sortedCandidates,
      suppressedReason: suppression.suppress ? suppression.reason : null
    };

    return OrchestratorDecisionSchema.parse(decision);
  }

  async runDaily(familyId: string): Promise<DailyPlan> {
    const now = new Date();
    const state = await this._getOrInitState(familyId, now);
    const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const signals = await orchestratorPgStore.listSignals(familyId, { sinceIso: since, limit: 500 });

    const plan = DailyPlanSchema.parse(
      runDailyPlanner({ state, recentSignals: signals, now, k: 3, horizonHours: 24 })
    );

    await orchestratorPgStore.insertDailyPlan(plan);

    await orchestratorPgStore.insertDecisionTrace({
      familyId,
      triggerType: 'daily',
      triggerId: plan.id,
      suppressedReason: null,
      chosenActionId: plan.actions?.[0]?.id ?? null,
      zone: state.zone,
      tension: state.tension,
      slack: state.slack,
      trace: {
        planMeta: {
          attentionBudgetMin: plan.attentionBudgetMin,
          windowStart: plan.windowStart,
          windowEnd: plan.windowEnd
        },
        actions: plan.actions.map((a) => ({ id: a.id, type: a.type, title: a.title })),
        rationale: plan.rationale
      }
    });

    for (const a of plan.actions) {
      this.store.enqueueAction(familyId, a);
      await orchestratorPgStore.upsertAction(familyId, a, 'queued');
    }

    return plan;
  }

  async runWeekly(familyId: string): Promise<WeeklyBrief> {
    const now = new Date();
    const state = await this._getOrInitState(familyId, now);
    const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const signals = await orchestratorPgStore.listSignals(familyId, { sinceIso: since, limit: 500 });

    const useLlm = String(process.env.ORCH_WEEKLY_USE_LLM ?? 'true').toLowerCase() !== 'false';

    let brief: WeeklyBrief | null = null;

    if (useLlm && process.env.OPENAI_API_KEY) {
      brief = await generateWeeklyBriefWithLLM({ state, recentSignals: signals, now });
    }

    let setpoints: WeeklySetpoints = {};

    if (!brief) {
      const fallback = runWeeklyRegulator({ state, recentSignals: signals, now });
      brief = fallback.brief;
      setpoints = fallback.setpoints;
    } else {
      setpoints = brief.setpointAdjustments ?? {};
    }

    const nextState = { ...state };
    if (typeof setpoints.dailyAttentionBudgetMin === 'number') {
      nextState.dailyAttentionBudgetMin = setpoints.dailyAttentionBudgetMin;
    }
    if (typeof setpoints.maxNotificationsPerHour === 'number') {
      nextState.maxNotificationsPerHour = setpoints.maxNotificationsPerHour;
    }
    this.store.setState(familyId, nextState, now);
    await orchestratorPgStore.upsertState(nextState);

    const saved = await orchestratorPgStore.insertWeeklyBrief(brief);

    await orchestratorPgStore.insertDecisionTrace({
      familyId,
      triggerType: 'weekly',
      triggerId: saved.id,
      suppressedReason: null,
      chosenActionId: null,
      zone: nextState.zone,
      tension: nextState.tension,
      slack: nextState.slack,
      trace: {
        usedLlm: Boolean(brief?.whyNow && process.env.OPENAI_API_KEY),
        setpointsApplied: setpoints,
        weekWindow: { start: saved.weekStart, end: saved.weekEnd },
        whyNow: saved.whyNow ?? null
      }
    });
    return saved;
  }

  async getState(familyId: string): Promise<OrchestratorState> {
    const now = new Date();
    return this._getOrInitState(familyId, now);
  }

  getRecentSignals(familyId: string): OrchestratorSignal[] {
    return this.store.getRecentSignals(familyId);
  }

  async getDigest(familyId: string, opts?: DigestListOptions): Promise<DigestItem[]> {
    return orchestratorPgStore.listDigestItems(familyId, opts);
  }

  async markDigestDelivered(familyId: string): Promise<DigestItem[]> {
    return orchestratorPgStore.markDigestDelivered(familyId);
  }

  async dismissDigestItem(familyId: string, itemId: string): Promise<DigestItem | null> {
    return orchestratorPgStore.dismissDigestItem(familyId, itemId);
  }

  async getDailyPlans(familyId: string, opts?: ListOptions): Promise<DailyPlan[]> {
    return orchestratorPgStore.listDailyPlans(familyId, opts);
  }

  async getLatestDailyPlan(familyId: string): Promise<DailyPlan | null> {
    return orchestratorPgStore.getLatestDailyPlan(familyId);
  }

  async getWeeklyBriefs(familyId: string, opts?: ListOptions): Promise<WeeklyBrief[]> {
    return orchestratorPgStore.listWeeklyBriefs(familyId, opts);
  }

  async getLatestWeeklyBrief(familyId: string): Promise<WeeklyBrief | null> {
    return orchestratorPgStore.getLatestWeeklyBrief(familyId);
  }

  listActions(familyId: string): InMemoryActionQueueItem[] {
    this.store.getOrCreateState(familyId, new Date());
    return this.store.listActions(familyId);
  }

  completeAction(familyId: string, actionId: string): InMemoryActionQueueItem | null {
    this.store.getOrCreateState(familyId, new Date());
    return this.store.completeAction(familyId, actionId);
  }
}

export const orchestratorEngine = new OrchestratorEngine();

function digestTitle(signal: OrchestratorSignal): string {
  const t = signal.type.replaceAll('_', ' ');
  const p = asRecord(signal.payload);
  return p.title ? String(p.title) : t[0].toUpperCase() + t.slice(1);
}

function digestSummary(signal: OrchestratorSignal, features: SignalFeatures): string {
  const p = asRecord(signal.payload);
  const deadline = typeof p.deadline === 'string' ? ` Deadline: ${p.deadline}.` : '';
  const u = Math.round(features.urgency * 100);
  const i = Math.round(features.impact * 100);
  return `Queued for digest (urgency ${u}%, impact ${i}%).${deadline}`;
}
