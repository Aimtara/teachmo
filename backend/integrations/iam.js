/* eslint-env node */
import { createId, integrationStore, nowIso } from './store.js';

export function listIamRules() {
  return integrationStore.iamRules;
}

export function createIamRule({ name, roleMappings = {}, defaultRole = 'parent', deprovisionMissing = true, allowedRoles = [] } = {}) {
  const timestamp = nowIso();
  const rule = {
    id: createId('iam'),
    name: name || 'Default IAM rule',
    roleMappings,
    defaultRole,
    deprovisionMissing,
    allowedRoles,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  integrationStore.iamRules.push(rule);
  return rule;
}

export function updateIamRule(ruleId, updates = {}) {
  const rule = integrationStore.iamRules.find((item) => item.id === ruleId);
  if (!rule) throw new Error('IAM rule not found');

  Object.assign(rule, updates, { updatedAt: nowIso() });
  return rule;
}

export function resolveIamRule(ruleId) {
  if (ruleId) {
    const rule = integrationStore.iamRules.find((item) => item.id === ruleId);
    if (rule) return rule;
  }

  return integrationStore.iamRules[0] || null;
}

export function mapExternalRole(externalRole = '', rule) {
  const normalized = String(externalRole || '').toLowerCase();
  if (!rule) {
    return { mappedRole: normalized || 'parent', reason: 'no_rule' };
  }

  const mapping = rule.roleMappings || {};
  const mappedRole = mapping[normalized] || mapping[externalRole] || rule.defaultRole || normalized;

  if (rule.allowedRoles?.length && !rule.allowedRoles.includes(mappedRole)) {
    return { mappedRole: null, reason: 'role_not_allowed' };
  }

  return { mappedRole, reason: mappedRole ? 'mapped' : 'unmapped' };
}
