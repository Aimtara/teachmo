/* eslint-env node */

export const CLASSIFICATION_TAGS = Object.freeze([
  'child_pi',
  'education_record',
  'guardian_pi',
  'school_staff_pi',
  'school_admin_data',
  'sensitive_ai',
  'ai_prompt',
  'ai_output',
  'audit_required',
  'retention_class',
  'deletion_required',
  'export_required',
  'public_or_community_content',
  'ppra_sensitive',
  'accessibility_critical',
]);

const studentCore = [
  'child_pi',
  'education_record',
  'audit_required',
  'retention_class',
  'deletion_required',
  'export_required',
];

const aiCore = [
  'sensitive_ai',
  'audit_required',
  'retention_class',
  'deletion_required',
  'export_required',
];

export const DATA_CLASSIFICATION_REGISTRY = Object.freeze({
  entities: {
    user: {
      objectType: 'database_table',
      source: 'auth.users/public.user_profiles',
      classifications: ['guardian_pi', 'school_staff_pi', 'school_admin_data', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'account_record',
      consentScopes: ['account_creation'],
    },
    profile: {
      objectType: 'database_table',
      source: 'public.profiles/public.user_profiles',
      classifications: ['guardian_pi', 'school_staff_pi', 'school_admin_data', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'account_record',
      consentScopes: ['account_creation'],
    },
    student: {
      objectType: 'database_table',
      source: 'public.children/public.sis_roster_students',
      classifications: studentCore,
      retentionClass: 'education_record',
      consentScopes: ['child_data_collection', 'school_authorized_use'],
    },
    child: {
      aliasOf: 'student',
    },
    guardian: {
      objectType: 'database_table',
      source: 'public.guardian_children/public.user_profiles',
      classifications: ['guardian_pi', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'guardian_record',
      consentScopes: ['child_data_collection'],
    },
    guardian_relationship: {
      objectType: 'database_table',
      source: 'public.guardian_children',
      classifications: ['child_pi', 'guardian_pi', 'education_record', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'relationship_record',
      consentScopes: ['child_data_collection', 'school_authorized_use'],
    },
    school: {
      objectType: 'database_table',
      source: 'public.schools',
      classifications: ['school_admin_data', 'audit_required', 'retention_class', 'export_required'],
      retentionClass: 'tenant_record',
      consentScopes: ['school_authorized_use'],
    },
    tenant: {
      objectType: 'database_table',
      source: 'district/organization tenant claims',
      classifications: ['school_admin_data', 'audit_required', 'retention_class', 'export_required'],
      retentionClass: 'tenant_record',
      consentScopes: ['school_authorized_use'],
    },
    class: {
      objectType: 'database_table',
      source: 'classes/class memberships',
      classifications: ['education_record', 'school_staff_pi', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'education_record',
      consentScopes: ['school_authorized_use'],
    },
    roster: {
      objectType: 'database_table',
      source: 'sis_rosters/sis_roster_students/directory imports',
      classifications: studentCore,
      retentionClass: 'roster_record',
      consentScopes: ['school_authorized_use'],
    },
    message: {
      objectType: 'database_table',
      source: 'public.messages/public.message_threads',
      classifications: ['child_pi', 'guardian_pi', 'school_staff_pi', 'education_record', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'message_record',
      consentScopes: ['messaging'],
    },
    weekly_digest: {
      objectType: 'job_output',
      source: 'weekly briefs/digests',
      classifications: ['child_pi', 'education_record', 'guardian_pi', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'digest_record',
      consentScopes: ['weekly_digest'],
    },
    assignment: {
      objectType: 'database_table',
      source: 'assignments/submissions',
      classifications: studentCore,
      retentionClass: 'education_record',
      consentScopes: ['school_authorized_use'],
    },
    ai_interaction: {
      objectType: 'database_table',
      source: 'public.ai_interactions',
      classifications: [...aiCore, 'ai_prompt', 'ai_output', 'child_pi', 'education_record'],
      retentionClass: 'ai_interaction',
      consentScopes: ['ai_assistance'],
    },
    ai_prompt: {
      objectType: 'prompt',
      source: 'ai prompt definitions/runtime prompts',
      classifications: [...aiCore, 'ai_prompt'],
      retentionClass: 'ai_interaction',
      consentScopes: ['ai_assistance'],
    },
    ai_output: {
      objectType: 'prompt_output',
      source: 'model responses/recommendations',
      classifications: [...aiCore, 'ai_output'],
      retentionClass: 'ai_interaction',
      consentScopes: ['ai_assistance'],
    },
    ai_recommendation: {
      objectType: 'prompt_output',
      source: 'AI recommendation/review queue',
      classifications: [...aiCore, 'ai_output', 'education_record'],
      retentionClass: 'ai_interaction',
      consentScopes: ['ai_sensitive_recommendations'],
    },
    audit_log: {
      objectType: 'database_table',
      source: 'public.audit_log/security_audit_events',
      classifications: ['audit_required', 'retention_class', 'export_required'],
      retentionClass: 'audit_record',
      consentScopes: [],
    },
    admin_action: {
      objectType: 'api_action',
      source: 'admin routes/dashboards',
      classifications: ['school_admin_data', 'audit_required', 'retention_class'],
      retentionClass: 'audit_record',
      consentScopes: [],
    },
    consent_ledger: {
      objectType: 'database_table',
      source: 'public.consent_ledger',
      classifications: ['guardian_pi', 'child_pi', 'audit_required', 'retention_class', 'export_required'],
      retentionClass: 'consent_record',
      consentScopes: [],
    },
    media_or_community_content: {
      objectType: 'content',
      source: 'community/media/public feed surfaces',
      classifications: ['child_pi', 'public_or_community_content', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'community_content',
      consentScopes: ['media_or_community_display'],
    },
    survey_or_reflection: {
      objectType: 'prompt_or_form',
      source: 'surveys/reflections/wellbeing prompts',
      classifications: ['child_pi', 'education_record', 'ppra_sensitive', 'audit_required', 'retention_class', 'deletion_required', 'export_required'],
      retentionClass: 'education_record',
      consentScopes: ['surveys_or_reflections'],
    },
    accessibility_evidence: {
      objectType: 'test_artifact',
      source: 'a11y smoke tests/manual evidence',
      classifications: ['accessibility_critical', 'audit_required', 'retention_class'],
      retentionClass: 'compliance_evidence',
      consentScopes: [],
    },
  },
  actions: {
    'relationship.created': ['audit_required'],
    'relationship.verified': ['audit_required'],
    'relationship.revoked': ['audit_required'],
    'relationship.disputed': ['audit_required'],
    'student.viewed': ['child_pi', 'education_record', 'audit_required'],
    'student.exported': ['child_pi', 'education_record', 'audit_required', 'export_required'],
    'student.deleted': ['child_pi', 'education_record', 'audit_required', 'deletion_required'],
    'consent.granted': ['guardian_pi', 'child_pi', 'audit_required'],
    'consent.revoked': ['guardian_pi', 'child_pi', 'audit_required'],
    'message.sent': ['child_pi', 'guardian_pi', 'school_staff_pi', 'audit_required'],
    'message.read': ['audit_required'],
    'roster.imported': ['child_pi', 'education_record', 'audit_required'],
    'ai.prompt_submitted': ['sensitive_ai', 'ai_prompt', 'audit_required'],
    'ai.output_generated': ['sensitive_ai', 'ai_output', 'audit_required'],
    'ai.recommendation_reviewed': ['sensitive_ai', 'ai_output', 'audit_required'],
    'feature_flag.updated': ['school_admin_data', 'audit_required'],
    'incident.created': ['school_admin_data', 'audit_required'],
    'incident.updated': ['school_admin_data', 'audit_required'],
  },
});

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function resolveEntityEntry(entityName) {
  const normalized = normalizeName(entityName);
  const entry = DATA_CLASSIFICATION_REGISTRY.entities[normalized];
  if (entry?.aliasOf) return resolveEntityEntry(entry.aliasOf);
  return entry || null;
}

export function classifyEntity(entityName) {
  const entry = resolveEntityEntry(entityName);
  if (!entry) {
    return {
      name: normalizeName(entityName),
      classifications: [],
      retentionClass: 'unclassified',
      consentScopes: [],
      classified: false,
    };
  }
  return {
    name: normalizeName(entityName),
    ...entry,
    classifications: [...new Set(entry.classifications || [])],
    consentScopes: [...new Set(entry.consentScopes || [])],
    classified: true,
  };
}

function actionTags(action) {
  return DATA_CLASSIFICATION_REGISTRY.actions[normalizeName(action)] || [];
}

export function requiresAudit(entityNameOrAction) {
  const entity = classifyEntity(entityNameOrAction);
  return entity.classifications.includes('audit_required') || actionTags(entityNameOrAction).includes('audit_required');
}

export function requiresConsent(entityNameOrAction) {
  const entity = classifyEntity(entityNameOrAction);
  return entity.consentScopes.length > 0;
}

export function requiresExport(entityName) {
  return classifyEntity(entityName).classifications.includes('export_required');
}

export function requiresDeletion(entityName) {
  return classifyEntity(entityName).classifications.includes('deletion_required');
}

export function isStudentSensitive(entityName) {
  const tags = classifyEntity(entityName).classifications;
  return tags.includes('child_pi') || tags.includes('education_record');
}

export function isAISensitive(entityName) {
  const tags = classifyEntity(entityName).classifications;
  return tags.includes('sensitive_ai') || tags.includes('ai_prompt') || tags.includes('ai_output');
}

export function isPPRASensitive(entityNameOrPrompt) {
  const normalized = normalizeName(entityNameOrPrompt);
  if (classifyEntity(normalized).classifications.includes('ppra_sensitive')) return true;
  return /\b(mental|psychological|family relationships?|political|religious|sex behavior|sexual attitudes?|illegal|self[- ]?incriminating|income|privileged relationship|wellbeing|well-being)\b/i.test(
    String(entityNameOrPrompt || ''),
  );
}

export function assertClassifiedEntities(entityNames) {
  const missing = entityNames.filter((name) => !classifyEntity(name).classified);
  if (missing.length) {
    throw new Error(`Missing data classification for: ${missing.join(', ')}`);
  }
  return true;
}
