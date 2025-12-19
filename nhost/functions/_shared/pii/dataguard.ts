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

export function applyDataGuardRules(contact: DirectoryContact, dataguardMode: 'auto' | 'on' | 'off' = 'auto') {
  if (dataguardMode === 'off') return { contact, piiMasked: false };

  const maskedFirst = detectMaskedName(contact.firstName);
  const maskedLast = detectMaskedName(contact.lastName);
  const piiMasked = maskedFirst || maskedLast;

  const sanitized: DirectoryContact = {
    ...contact,
  };

  return { contact: sanitized, piiMasked };
}
