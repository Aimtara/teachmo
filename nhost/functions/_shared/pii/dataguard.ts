import { DirectoryContact } from '../directory/types';

export function detectMaskedName(value?: string | null): boolean {
  if (!value) return false;
  const clean = String(value).replace(/[^a-z]/gi, '').toLowerCase();
  if (clean.length < 3) return false;
  const vowels = (clean.match(/[aeiou]/g) || []).length;
  const consonants = clean.length - vowels;
  if (consonants > vowels * 3) return true;
  if (/^(x{2,}|z{2,}|q{2,})/.test(clean)) return true;
  return false;
}

export function applyDataGuardRules(contact: DirectoryContact, dataguardMode: 'auto' | 'on' | 'off'): DirectoryContact {
  if (dataguardMode === 'off') return contact;
  const sanitized: DirectoryContact = { ...contact };
  const maskedFirst = detectMaskedName(contact.firstName);
  const maskedLast = detectMaskedName(contact.lastName);

  if (maskedFirst) sanitized.firstName = undefined;
  if (maskedLast) sanitized.lastName = undefined;

  if (maskedFirst || maskedLast) {
    sanitized.sourceRole = contact.sourceRole;
    (sanitized as any).metadata = { ...(contact as any).metadata, piiMasked: true };
  }

  return sanitized;
}
