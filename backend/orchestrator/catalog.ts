/* eslint-env node */
interface PlanActionCatalogItem {
  type: string;
  description: string;
  requiresApproval: boolean;
}

export const planActionCatalog: PlanActionCatalogItem[] = [
  {
    type: 'mitigation.set',
    description: 'Apply a mitigation rule to suppress repetitive alerts.',
    requiresApproval: true
  },
  {
    type: 'throttle.raise',
    description: 'Raise throttling thresholds to reduce noise.',
    requiresApproval: true
  },
  {
    type: 'mitigation.clear',
    description: 'Clear active mitigation settings.',
    requiresApproval: false
  }
];

const rollbackActionMap: Record<string, string> = {
  'mitigation.set': 'mitigation.clear',
  'throttle.raise': 'mitigation.clear'
};

export function resolveRollbackAction(actionType: string): string | null {
  return rollbackActionMap[actionType] ?? null;
}
