import type { OrchestratorRequestInput } from './types';
import { orchestratorRequestSchema } from './schemas';

/**
 * A UI action emitted by the orchestrator response.
 * The UI should round-trip these back to the orchestrator as channel=UI_ACTION.
 */
export type OrchestratorUIAction = {
  /** Stable action identifier (e.g. HUB_MESSAGE_SEND_CONFIRM) */
  actionId: string;
  /** Optional payload that will be sent back verbatim (validated server-side). */
  payload?: unknown;
};

/**
 * Builds a deterministic UI_ACTION request from a base request context.
 *
 * Why this exists:
 * - Orchestrator responses include UI card actions (actionId + payload).
 * - The UI should not re-implement routing logic; it should simply echo actions back.
 * - This keeps orchestration consistent across platforms (web/mobile).
 */
export function buildUIActionRequest(
  base: OrchestratorRequestInput,
  action: OrchestratorUIAction
): OrchestratorRequestInput {
  const next: OrchestratorRequestInput = {
    ...base,
    channel: 'UI_ACTION',
    // Keep the last user text around for debugging, but do not rely on it for routing.
    text: base.text ?? '',
    metadata: {
      ...(base.metadata ?? {}),
      action: {
        id: action.actionId,
        payload: action.payload,
      },
    },
  };

  // Validate on the client too so UI bugs fail loudly during dev.
  return orchestratorRequestSchema.parse(next);
}
