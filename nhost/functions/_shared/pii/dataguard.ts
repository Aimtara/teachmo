import { DirectoryContact } from '../directory/types';

export function detectMaskedName(value?: string | null): boolean {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  const letters = normalized.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const consonants = letters.replace(/[aeiou]/gi, '').length;
  const ratio = consonants / letters.length;
  if (ratio > 0.7 && letters.length >= 4) return true;
  if (/(.)\1{2,}/.test(letters)) return true;
  if (/^[A-Z]{3,}$/.test(letters) && /(X{2,}|Z{2,}|Q{2,})/.test(letters)) return true;
  return false;
}

/**
 * Detects masked PII in contact names and optionally sanitizes the contact.
 * When masking is detected and dataguardMode is not 'off', marks the contact as having masked PII.
 * 
 * @param contact - The directory contact to check
 * @param dataguardMode - Detection mode: 'off' = disabled, 'auto' = detect masks, 'on' = treat all as masked
 * @returns Object with sanitized contact and piiMasked flag
 */
export function applyDataGuardRules(contact: DirectoryContact, dataguardMode: 'auto' | 'on' | 'off' = 'auto') {
  if (dataguardMode === 'off') return { contact, piiMasked: false };

  const maskedFirst = detectMaskedName(contact.firstName);
  const maskedLast = detectMaskedName(contact.lastName);
  const piiMasked = dataguardMode === 'on' || maskedFirst || maskedLast;

  // When masking is detected, strip the PII fields to prevent storing masked data
  const sanitized: DirectoryContact = piiMasked
    ? {
        email: contact.email,
        contactType: contact.contactType,
        sourceRole: contact.sourceRole,
        externalId: contact.externalId,
        metadata: contact.metadata,
      }
    : { ...contact };

  return { contact: sanitized, piiMasked };
}
