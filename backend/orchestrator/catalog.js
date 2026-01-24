/* eslint-env node */
export const planActionCatalog = [
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

const rollbackActionMap = {
  'mitigation.set': 'mitigation.clear',
  'throttle.raise': 'mitigation.clear'
};

export function resolveRollbackAction(actionType) {
  return rollbackActionMap[actionType] ?? null;
}
