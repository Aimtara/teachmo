/* eslint-env node */
import {
  OrchestratorDecisionSchema,
  OrchestratorSignalSchema,
  OrchestratorStateSchema
} from './types.js';
import { parseTimestamp } from './utils.js';
import { extractFeatures } from './features.js';
import { reduceState } from './state.js';
import { generateCandidates } from './candidates.js';
import { shouldSuppressNotifyNow, createNotificationBucket } from './policy.js';
import { optimize } from './scoring.js';
import { OrchestratorStore, orchestratorStore } from './store.js';

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
  ingest(rawSignal) {
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

    const stateOk = OrchestratorStateSchema.parse(nextState);
    const decision = {
      state: stateOk,
      nextAction: nextAction ?? null,
      candidates: sortedCandidates,
      suppressedReason: suppression.suppress ? suppression.reason : null
    };

    return OrchestratorDecisionSchema.parse(decision);
  }

  getState(familyId) {
    return this.store.getOrCreateState(familyId, new Date());
  }

  getRecentSignals(familyId) {
    return this.store.getRecentSignals(familyId);
  }
}

export const orchestratorEngine = new OrchestratorEngine();
