import { mapRoleToContactType } from '../directory/computePreview';
import { DirectoryContact } from '../directory/types';
import { isEmailLike, normEmail } from '../directory/validate';
import { applyDataGuardRules } from './dataguard';

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

export function getPiiPolicyForSource(sourceRow: any): PiiPolicy {
  const policyRaw = sourceRow?.pii_policy && typeof sourceRow.pii_policy === 'object' ? sourceRow.pii_policy : {};
  const merged = { ...DEFAULT_PII_POLICY, ...policyRaw } as PiiPolicy;
  merged.emailAllowlistDomains = Array.isArray(policyRaw.emailAllowlistDomains)
    ? policyRaw.emailAllowlistDomains.map((v: any) => String(v).toLowerCase())
    : [];
  merged.emailDenylistDomains = Array.isArray(policyRaw.emailDenylistDomains)
    ? policyRaw.emailDenylistDomains.map((v: any) => String(v).toLowerCase())
    : [];
  return merged;
}

export function redactQuarantineRow(rawRow: Record<string, any>, policy: PiiPolicy) {
  const safeRaw = rawRow && typeof rawRow === 'object' ? rawRow : {};
  const redacted: Record<string, any> = {};

  if (policy.storeEmail && safeRaw.email) redacted.email = safeRaw.email;
  if (safeRaw.contact_type) redacted.contact_type = safeRaw.contact_type;
  if (policy.storeNames) {
    if (safeRaw.firstName) redacted.firstName = safeRaw.firstName;
    if (safeRaw.lastName) redacted.lastName = safeRaw.lastName;
  }
  if (policy.storeExternalIds && (safeRaw.externalId || safeRaw.external_id)) {
    redacted.externalId = safeRaw.externalId ?? safeRaw.external_id;
  }

  return redacted;
}

export function sanitizeContact(
  contact: DirectoryContact,
  policy: PiiPolicy = DEFAULT_PII_POLICY,
  ctx?: { dataguardMode?: 'auto' | 'on' | 'off'; sourceType?: string }
) {
  const email = normEmail(contact.email);
  if (!email || !isEmailLike(email)) {
    return { valid: false, reason: 'invalid_email', raw_redacted: redactQuarantineRow(contact as any, policy) };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (policy.emailAllowlistDomains.length > 0 && domain && !policy.emailAllowlistDomains.includes(domain)) {
    return { valid: false, reason: 'domain_not_allowed', raw_redacted: redactQuarantineRow({ email }, policy) };
  }

  if (domain && policy.emailDenylistDomains.includes(domain)) {
    return { valid: false, reason: 'domain_denied', raw_redacted: redactQuarantineRow({ email }, policy) };
  }

  const contactType = contact.contactType || mapRoleToContactType(contact.sourceRole);
  if (!contactType) {
    return { valid: false, reason: 'missing_contact_type', raw_redacted: redactQuarantineRow({ email }, policy) };
  }

  const { contact: dgContact, piiMasked } = applyDataGuardRules(contact, ctx?.dataguardMode ?? 'auto');

  const sanitized: DirectoryContact = {
    email,
    contactType,
    sourceRole: dgContact.sourceRole,
  };

  if (policy.storeExternalIds && dgContact.externalId) sanitized.externalId = dgContact.externalId;
  if (policy.storeNames) {
    if (dgContact.firstName) sanitized.firstName = dgContact.firstName;
    if (dgContact.lastName) sanitized.lastName = dgContact.lastName;
  }

  const metadata: Record<string, any> = { ...dgContact.metadata };
  if (piiMasked) metadata.piiMasked = true;
  if (Object.keys(metadata).length > 0) sanitized.metadata = metadata;

  return { valid: true, contact: sanitized };
}
