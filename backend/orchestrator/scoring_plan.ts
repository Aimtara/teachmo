/* eslint-env node */
import { actionUtility } from './scoring.ts';
import type { OrchestratorAction, OrchestratorState } from './types.ts';

interface OptimizePlanOptions {
  k?: number;
  attentionBudgetMin?: number;
  allowNotifyNow?: boolean;
}

interface OptimizePlanResult {
  chosen: OrchestratorAction[];
  rationale: string;
}

/**
 * Greedy selection of up to K actions under attention budget.
 * Avoids selecting multiple “do_nothing” actions.
 *
 */
export function optimizePlan(
  actions: OrchestratorAction[],
  state: OrchestratorState,
  opts: OptimizePlanOptions = {}
): OptimizePlanResult {
  const k = opts.k ?? 3;
  const attentionBudget = opts.attentionBudgetMin ?? state.dailyAttentionBudgetMin;
  const allowNotifyNow = opts.allowNotifyNow ?? true;

  const scored = actions
    .map((a) => ({ a, score: actionUtility(a) }))
    .sort((x, y) => y.score - x.score);

  const chosen: OrchestratorAction[] = [];
  let remaining = attentionBudget;

  for (const { a } of scored) {
    if (chosen.length >= k) break;
    if (!allowNotifyNow && a.type === 'notify_now') continue;
    if (a.type === 'do_nothing' && chosen.length > 0) continue;
    if (a.timeCostMin > remaining) continue;

    if (a.type !== 'create_micro_task' && chosen.some((c) => c.type === a.type)) continue;

    chosen.push(a);
    remaining -= a.timeCostMin;
  }

  const rationale =
    chosen.length === 0
      ? 'No actions fit the attention budget; defaulting to digest batching.'
      : `Selected ${chosen.length} actions under a ${attentionBudgetMinLabel(attentionBudget)} budget, prioritizing kid impact and low cognitive cost.`;

  return { chosen, rationale };
}

function attentionBudgetMinLabel(n: number): string {
  return `${n} minute${n === 1 ? '' : 's'}`;
}
