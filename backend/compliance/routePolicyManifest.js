/* eslint-env node */

import { classifyEntity, requiresAudit, requiresConsent, requiresDeletion, requiresExport } from './dataClassification.ts';

export const ROUTE_POLICY_MANIFEST = Object.freeze([
  {
    id: 'privacy.consents.create',
    method: 'POST',
    path: '/api/privacy/consents',
    entity: 'consent_ledger',
    action: 'consent.granted',
    requiredControls: ['auth', 'tenant', 'consent_scope_validation', 'audit'],
  },
  {
    id: 'privacy.consents.revoke',
    method: 'DELETE',
    path: '/api/privacy/consents/:scope',
    entity: 'consent_ledger',
    action: 'consent.revoked',
    requiredControls: ['auth', 'tenant', 'consent_scope_validation', 'audit'],
  },
  {
    id: 'privacy.consents.history',
    method: 'GET',
    path: '/api/privacy/consents/history',
    entity: 'consent_ledger',
    action: 'consent.history_viewed',
    requiredControls: ['auth', 'tenant', 'audit'],
  },
  {
    id: 'privacy.relationships.invite',
    method: 'POST',
    path: '/api/privacy/relationships',
    entity: 'guardian_relationship',
    action: 'relationship.created',
    requiredControls: ['auth', 'tenant', 'relationship_lifecycle_authorization', 'audit'],
  },
  {
    id: 'privacy.relationships.verify',
    method: 'POST',
    path: '/api/privacy/relationships/:id/verify',
    entity: 'guardian_relationship',
    action: 'relationship.verified',
    requiredControls: ['auth', 'tenant', 'school_admin_role', 'relationship_lifecycle_authorization', 'audit'],
  },
  {
    id: 'privacy.relationships.revoke',
    method: 'POST',
    path: '/api/privacy/relationships/:id/revoke',
    entity: 'guardian_relationship',
    action: 'relationship.revoked',
    requiredControls: ['auth', 'tenant', 'owner_or_admin', 'relationship_lifecycle_authorization', 'audit'],
  },
  {
    id: 'privacy.relationships.dispute',
    method: 'POST',
    path: '/api/privacy/relationships/:id/dispute',
    entity: 'guardian_relationship',
    action: 'relationship.disputed',
    requiredControls: ['auth', 'tenant', 'owner_or_admin', 'relationship_lifecycle_authorization', 'audit'],
  },
  {
    id: 'privacy.exports.request',
    method: 'POST',
    path: '/api/privacy/data-exports',
    entity: 'student',
    action: 'student.exported',
    requiredControls: ['auth', 'tenant', 'subject_or_admin', 'audit'],
  },
  {
    id: 'privacy.deletions.request',
    method: 'POST',
    path: '/api/privacy/data-deletions',
    entity: 'student',
    action: 'student.deleted',
    requiredControls: ['auth', 'tenant', 'subject_or_admin', 'audit'],
  },
  {
    id: 'admin.dsar.exports',
    method: 'POST',
    path: '/api/admin/dsar-exports',
    entity: 'user',
    action: 'data_export.created',
    requiredControls: ['auth', 'tenant', 'admin_role', 'scope', 'audit'],
  },
  {
    id: 'admin.user.hard_delete',
    method: 'POST',
    path: '/api/admin/users/:id/hard-delete',
    entity: 'user',
    action: 'data_deletion.completed',
    requiredControls: ['auth', 'tenant', 'admin_role', 'scope', 'audit'],
  },
  {
    id: 'ai.completion',
    method: 'POST',
    path: '/api/ai/completion',
    entity: 'ai_interaction',
    action: 'ai.prompt_submitted',
    requiredControls: ['auth', 'tenant', 'feature_flag', 'ai_consent', 'ai_governance', 'audit'],
  },
]);

export function getRoutePolicy(id) {
  return ROUTE_POLICY_MANIFEST.find((entry) => entry.id === id) || null;
}

export function assertRoutePolicyCoverage(routes = ROUTE_POLICY_MANIFEST) {
  const missing = [];
  for (const route of routes) {
    if (!route.id || !route.method || !route.path || !route.entity || !route.action) {
      missing.push(`${route.id || route.path || 'unknown'}:metadata`);
      continue;
    }
    if (!classifyEntity(route.entity).classified) missing.push(`${route.id}:entity_classification`);
    if (requiresAudit(route.entity) && !route.requiredControls.includes('audit')) missing.push(`${route.id}:audit`);
    if (
      requiresConsent(route.entity) &&
      !route.requiredControls.some((control) => control.includes('consent') || control === 'school_authorization' || control === 'subject_or_admin' || control === 'admin_role' || control === 'relationship_lifecycle_authorization')
    ) {
      missing.push(`${route.id}:consent`);
    }
    if (requiresExport(route.entity) && route.action.includes('export') && !route.requiredControls.includes('subject_or_admin') && !route.requiredControls.includes('admin_role')) {
      missing.push(`${route.id}:export_authorization`);
    }
    if (requiresDeletion(route.entity) && route.action.includes('delete') && !route.requiredControls.includes('subject_or_admin') && !route.requiredControls.includes('admin_role')) {
      missing.push(`${route.id}:deletion_authorization`);
    }
  }
  if (missing.length) throw new Error(`Route policy coverage gaps: ${missing.join(', ')}`);
  return true;
}
