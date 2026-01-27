import { DirectoryContact } from '../directory/types';
import { DataScopes } from '../scopes/resolveScopes';

export type PiiPolicy = {
  storeEmail: boolean;
  storeNames: boolean;
  storeExternalIds: boolean;
  storePhone: boolean;
  storeAddress: boolean;
  storeRawQuarantine: boolean;
  emailAllowlistDomains: string[];
  emailDenylistDomains: string[];
};

export type SanitizedContact = Pick<DirectoryContact, 'email' | 'contactType'> &
  Partial<DirectoryContact> & {
    metadata?: Record<string, any>;
  };

export const DEFAULT_PII_POLICY: PiiPolicy = {
  storeEmail: true,
  storeNames: false,
  storeExternalIds: true,
  storePhone: false,
  storeAddress: false,
  storeRawQuarantine: false,
  emailAllowlistDomains: [],
  emailDenylistDomains: [],
};

export function getPiiPolicyForSource(sourceRow: any, scopes?: DataScopes): PiiPolicy {
  const rawPolicy = sourceRow?.pii_policy;
  const policy = rawPolicy && typeof rawPolicy === 'object' ? { ...DEFAULT_PII_POLICY, ...rawPolicy } : DEFAULT_PII_POLICY;

  if (policy.storeEmail && safeRaw.email) redacted.email = safeRaw.email;
  // contact_type is always preserved as it's a non-PII classification field (parent_guardian, teacher, etc.)
  // required for system operation and not considered personally identifiable information
  if (safeRaw.contact_type) redacted.contact_type = safeRaw.contact_type;
  if (policy.storeNames) {
    if (safeRaw.firstName) redacted.firstName = safeRaw.firstName;
    if (safeRaw.lastName) redacted.lastName = safeRaw.lastName;
  }
  if (policy.storeExternalIds && (safeRaw.externalId || safeRaw.external_id)) {
    redacted.externalId = safeRaw.externalId ?? safeRaw.external_id;
  if (scopes && scopes.directory && scopes.directory.names === false) {
    policy.storeNames = false;
  }

  return policy;
}

function emailDomain(email: string): string | null {
  const parts = String(email || '').toLowerCase().split('@');
  if (parts.length !== 2) return null;
  return parts[1];
}

export function redactQuarantineRow(rawRow: Record<string, any>, policy: PiiPolicy): Record<string, any> {
  if (!policy.storeRawQuarantine) return {};
  const redacted: Record<string, any> = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    if (key.toLowerCase().includes('email')) {
      redacted[key] = value;
      return;
    }
    if (policy.storeNames && (key.toLowerCase().includes('name') || key.toLowerCase().includes('first') || key.toLowerCase().includes('last'))) {
      redacted[key] = value;
      return;
    }
    if (policy.storeExternalIds && key.toLowerCase().includes('id')) {
      redacted[key] = value;
      return;
    }
    // everything else is dropped
  });
  return redacted;
}

export function sanitizeContact(
  contact: DirectoryContact,
  policy: PiiPolicy,
  ctx?: { sourceType?: string; scopes?: DataScopes }
): SanitizedContact | null {
  if (ctx?.scopes?.directory?.email === false) return null;
  const email = String(contact.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return null;
  const domain = emailDomain(email);
  if (policy.emailAllowlistDomains?.length) {
    if (!domain || !policy.emailAllowlistDomains.map((d) => d.toLowerCase()).includes(domain)) return null;
  }
  if (policy.emailDenylistDomains?.length) {
    if (domain && policy.emailDenylistDomains.map((d) => d.toLowerCase()).includes(domain)) return null;
  }

  const sanitized: SanitizedContact = {
    email,
    contactType: contact.contactType,
    metadata: {},
  };

  if (policy.storeExternalIds && contact.externalId) {
    sanitized.externalId = contact.externalId;
  }

  if (policy.storeNames) {
    if (contact.firstName) sanitized.firstName = contact.firstName;
    if (contact.lastName) sanitized.lastName = contact.lastName;
  }

  sanitized.metadata = sanitized.metadata && Object.keys(sanitized.metadata).length ? sanitized.metadata : undefined;

  return sanitized;
}
