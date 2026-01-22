/* eslint-env node */
import {
  OrchestratorDecisionSchema,
  OrchestratorSignalSchema,
  OrchestratorStateSchema,
  DigestItemSchema,
  DailyPlanSchema
} from './types.js';
import { parseTimestamp, makeId, toIso } from './utils.js';
import { extractFeatures } from './features.js';
import { reduceState } from './state.js';
import { generateCandidates } from './candidates.js';
import { shouldSuppressNotifyNow, createNotificationBucket } from './policy.js';
import { optimize } from './scoring.js';
import { OrchestratorStore, orchestratorStore } from './store.js';
import { runDailyPlanner } from './planner.js';
import { runWeeklyRegulator } from './weekly.js';
import { generateWeeklyBriefWithLLM } from './weekly_llm.js';
import { orchestratorPgStore } from './pgStore.js';

export class OrchestratorEngine {
  /**
   * @param {{ store?: OrchestratorStore }} [opts]
   */
  constructor(opts = {}) {
    this.store = opts.store ?? orchestratorStore;
  }

  /**
   * Ingest a single signal and return a decision.
   * @param {import('./types.js').OrchestratorSignal} rawSignal
   */
  async ingest(rawSignal) {
    const parsed = OrchestratorSignalSchema.parse(rawSignal);
    const now = parseTimestamp(parsed.timestamp);

    this.store.appendSignal(parsed);

    const prevState = this.store.getOrCreateState(parsed.familyId, now);
    const bucket = this.store.getBucket(parsed.familyId) ?? createNotificationBucket(prevState, now);

    const features = extractFeatures(parsed, { now });
    const nextState = reduceState(prevState, parsed, features, { now });
    this.store.setState(parsed.familyId, nextState, now);

    const candidates = generateCandidates({ state: nextState, signal: parsed, features, now });

    const suppression = shouldSuppressNotifyNow({ state: nextState, signal: parsed, features, bucket, now });
    const allowNotifyNow = !suppression.suppress;

    const { candidates: sortedCandidates, nextAction } = optimize(candidates, nextState, { allowNotifyNow });

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

    if (nextAction) this.store.enqueueAction(parsed.familyId, nextAction);

    const stateOk = OrchestratorStateSchema.parse(nextState);
    const decision = {
      state: stateOk,
      nextAction: nextAction ?? null,
      candidates: sortedCandidates,
      suppressedReason: suppression.suppress ? suppression.reason : null
    };

    return OrchestratorDecisionSchema.parse(decision);
  }

  async runDaily(familyId) {
    const now = new Date();
    const state = this.store.getOrCreateState(familyId, now);
    const signals = this.store.getRecentSignals(familyId);

    const plan = DailyPlanSchema.parse(
      runDailyPlanner({ state, recentSignals: signals, now, k: 3, horizonHours: 24 })
    );

    await orchestratorPgStore.insertDailyPlan(plan);

    for (const a of plan.actions) this.store.enqueueAction(familyId, a);

    return plan;
  }

  async runWeekly(familyId) {
    const now = new Date();
    const state = this.store.getOrCreateState(familyId, now);
    const signals = this.store.getRecentSignals(familyId);

    const useLlm = String(process.env.ORCH_WEEKLY_USE_LLM ?? 'true').toLowerCase() !== 'false';

    let brief = null;

    if (useLlm && process.env.OPENAI_API_KEY) {
      brief = await generateWeeklyBriefWithLLM({ state, recentSignals: signals, now });
    }

    let setpoints = {};

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

    const saved = await orchestratorPgStore.insertWeeklyBrief(brief);
    return saved;
  }

  getState(familyId) {
    return this.store.getOrCreateState(familyId, new Date());
  }

  getRecentSignals(familyId) {
    return this.store.getRecentSignals(familyId);
  }

  async getDigest(familyId, opts) {
    return orchestratorPgStore.listDigestItems(familyId, opts);
  }

  async markDigestDelivered(familyId) {
    return orchestratorPgStore.markDigestDelivered(familyId);
  }

  async dismissDigestItem(familyId, itemId) {
    return orchestratorPgStore.dismissDigestItem(familyId, itemId);
  }

  async getDailyPlans(familyId, opts) {
    return orchestratorPgStore.listDailyPlans(familyId, opts);
  }

  async getLatestDailyPlan(familyId) {
    return orchestratorPgStore.getLatestDailyPlan(familyId);
  }

  async getWeeklyBriefs(familyId, opts) {
    return orchestratorPgStore.listWeeklyBriefs(familyId, opts);
  }

  async getLatestWeeklyBrief(familyId) {
    return orchestratorPgStore.getLatestWeeklyBrief(familyId);
  }

  listActions(familyId) {
    this.store.getOrCreateState(familyId, new Date());
    return this.store.listActions(familyId);
  }

  completeAction(familyId, actionId) {
    this.store.getOrCreateState(familyId, new Date());
    return this.store.completeAction(familyId, actionId);
  }
}

export const orchestratorEngine = new OrchestratorEngine();

function digestTitle(signal) {
  const t = signal.type.replaceAll('_', ' ');
  const p = signal.payload ?? {};
  return p.title ? String(p.title) : t[0].toUpperCase() + t.slice(1);
}

function digestSummary(signal, features) {
  const p = signal.payload ?? {};
  const deadline = typeof p.deadline === 'string' ? ` Deadline: ${p.deadline}.` : '';
  const u = Math.round(features.urgency * 100);
  const i = Math.round(features.impact * 100);
  return `Queued for digest (urgency ${u}%, impact ${i}%).${deadline}`;
}
