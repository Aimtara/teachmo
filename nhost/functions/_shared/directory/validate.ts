import {
  DirectoryInvalidRow,
  DirectoryRowInput,
  DirectoryRowNormalized,
  DirectorySchemaVersion,
  JobError,
} from './types';
import { DEFAULT_PII_POLICY, PiiPolicy, redactQuarantineRow } from '../pii/policy';

const MAX_ERRORS = 50;
const MAX_QUARANTINE_ROWS = 500;

export function normEmail(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export function isEmailLike(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeHeader(name: string) {
  return String(name || '').trim().toLowerCase();
}

export function normalizeAndValidateDirectoryRows(
  rows: DirectoryRowInput[],
  schema?: DirectorySchemaVersion,
  piiPolicy: PiiPolicy = DEFAULT_PII_POLICY,
  initialInvalidRows: DirectoryInvalidRow[] = []
) {
  const seen = new Set<string>();
  const valid: DirectoryRowNormalized[] = [];
  const errors: JobError[] = [];
  const invalidRows: DirectoryInvalidRow[] = [];

  initialInvalidRows.slice(0, MAX_QUARANTINE_ROWS).forEach((row) => {
    if (invalidRows.length < MAX_QUARANTINE_ROWS) {
      invalidRows.push({ ...row, raw_redacted: row.raw_redacted ?? redactQuarantineRow(row.raw, piiPolicy) });
    }
    if (errors.length < MAX_ERRORS) errors.push({ row: row.rowNumber, reason: row.reason });
  });

  const contactTypeOptions =
    schema && schema.rules && Array.isArray((schema.rules as any).contact_type)
      ? (schema.rules as any).contact_type
      : [];
  const allowedContactTypes = new Set<string>(contactTypeOptions.map((v: any) => String(v)));

  rows.forEach((row, idx) => {
    const email = normEmail(row.email);
    const contactTypeRaw = String(row.contact_type ?? '').trim();
    const contactTypeDefaulted =
      contactTypeRaw || (!schema && !row.contact_type ? 'parent_guardian' : contactTypeRaw || '');
    const action = row.action === 'deactivate' ? 'deactivate' : 'upsert';
    const rowNumber = row.rowNumber ?? idx + 1;

    if (!email || !isEmailLike(email)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'invalid_email' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({
          rowNumber,
          raw: piiPolicy.storeRawQuarantine ? { email: row.email, contact_type: row.contact_type } : {},
          raw_redacted: redactQuarantineRow({ email: row.email, contact_type: row.contact_type }, piiPolicy),
          reason: 'invalid_email',
        });
      }
      return;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (piiPolicy.emailAllowlistDomains.length > 0 && domain && !piiPolicy.emailAllowlistDomains.includes(domain)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'domain_not_allowed' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({
          rowNumber,
          raw: piiPolicy.storeRawQuarantine ? { email: row.email, contact_type: row.contact_type } : {},
          raw_redacted: redactQuarantineRow({ email: row.email, contact_type: row.contact_type }, piiPolicy),
          reason: 'domain_not_allowed',
        });
      }
      return;
    }

    if (domain && piiPolicy.emailDenylistDomains.includes(domain)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'domain_denied' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({
          rowNumber,
          raw: piiPolicy.storeRawQuarantine ? { email: row.email, contact_type: row.contact_type } : {},
          raw_redacted: redactQuarantineRow({ email: row.email, contact_type: row.contact_type }, piiPolicy),
          reason: 'domain_denied',
        });
      }
      return;
    }

    if (schema?.required_headers?.includes('contact_type') && !contactTypeDefaulted) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'missing_contact_type' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({
          rowNumber,
          raw: piiPolicy.storeRawQuarantine ? { email: row.email, contact_type: row.contact_type } : {},
          raw_redacted: redactQuarantineRow({ email: row.email, contact_type: row.contact_type }, piiPolicy),
          reason: 'missing_contact_type',
        });
      }
      return;
    }

    if (allowedContactTypes.size > 0 && contactTypeDefaulted && !allowedContactTypes.has(contactTypeDefaulted)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'invalid_contact_type' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({
          rowNumber,
          raw: piiPolicy.storeRawQuarantine ? { email: row.email, contact_type: row.contact_type } : {},
          raw_redacted: redactQuarantineRow({ email: row.email, contact_type: row.contact_type }, piiPolicy),
          reason: 'invalid_contact_type',
        });
      }
      return;
    }

    if (seen.has(email)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'duplicate_email' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({
          rowNumber,
          raw: piiPolicy.storeRawQuarantine ? { email: row.email, contact_type: row.contact_type } : {},
          raw_redacted: redactQuarantineRow({ email: row.email, contact_type: row.contact_type }, piiPolicy),
          reason: 'duplicate_email',
        });
      }
      return;
    }
    seen.add(email);
    valid.push({ email, contact_type: contactTypeDefaulted || 'parent_guardian', action });
  });

  const totalRows = rows.length + initialInvalidRows.length;
  const totalValid = valid.length;
  const invalid = totalRows - totalValid;

  return { validRows: valid, errors, seen, totalRows, totalValid, invalid, invalidRows };
}
