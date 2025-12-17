import crypto from 'crypto';
import * as Papa from 'papaparse';

export type HasuraClient = (query: string, variables?: Record<string, any>) => Promise<any>;

export type DirectoryRowInput = { email?: string | null; contact_type?: string | null; rowNumber?: number };
export type DirectoryRowNormalized = { email: string; contact_type: string };
export type JobError = { reason: string; message?: string; row?: number };

const MAX_ERRORS = 50;

function normEmail(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function isEmailLike(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function parseDirectoryCsv(csvText: string) {
  // Use papaparse to properly handle CSV with quoted fields, commas, and edge cases
  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  if (parseResult.errors.length > 0) {
    const error = parseResult.errors[0];
    throw new Error(`CSV parsing error: ${error.message}`);
  }

  const data = parseResult.data as Record<string, any>[];
  if (data.length === 0) throw new Error("CSV must include 'email' header");

  // Check if email column exists
  const firstRow = data[0];
  const headers = Object.keys(firstRow).map((h) => h.toLowerCase());
  if (!headers.includes('email')) {
    throw new Error("CSV must include 'email' header");
  }

  // Map parsed data to our expected format
  const rows = data.map((row, idx) => {
    // Find email value case-insensitively
    const emailKey = Object.keys(row).find((k) => k.toLowerCase() === 'email');
    const typeKey = Object.keys(row).find((k) => k.toLowerCase() === 'contact_type');

    return {
      email: emailKey ? String(row[emailKey] ?? '').trim() : '',
      contact_type: typeKey ? String(row[typeKey] ?? '').trim() || 'parent_guardian' : 'parent_guardian',
      rowNumber: idx + 2, // +2 because row 1 is header, and we're 0-indexed
    };
  });

  return { rows, rowCount: rows.length };
}

export function normalizeAndValidateDirectoryRows(rows: DirectoryRowInput[]) {
  const seen = new Set<string>();
  const valid: DirectoryRowNormalized[] = [];
  const errors: JobError[] = [];

  rows.forEach((row, idx) => {
    const email = normEmail(row.email);
    const contactType = String(row.contact_type ?? 'parent_guardian').trim() || 'parent_guardian';

    if (!email || !isEmailLike(email)) {
      if (errors.length < MAX_ERRORS) {
        errors.push({ row: row.rowNumber ?? idx + 1, reason: 'invalid_email' });
      }
      return;
    }

    if (seen.has(email)) return;
    seen.add(email);
    valid.push({ email, contact_type: contactType });
  });

  const totalRows = rows.length;
  const totalValid = valid.length;
  const invalid = totalRows - totalValid;

  return { validRows: valid, errors, seen, totalRows, totalValid, invalid };
}

export async function upsertDirectoryRows(params: {
  hasura: HasuraClient;
  schoolId: string;
  actorId: string;
  rows: DirectoryRowInput[];
  deactivateMissing?: boolean;
  dryRun?: boolean;
  sourceRef?: string | null;
  sourceHash?: string | null;
}) {
  const { hasura, schoolId, actorId, rows, deactivateMissing, dryRun } = params;
  const normalized = normalizeAndValidateDirectoryRows(rows);
  const nowIso = new Date().toISOString();
  let upserted = 0;
  let deactivated = 0;

  if (!dryRun && normalized.validRows.length > 0) {
    const upsertResp = await hasura(
      `mutation Upsert($objects: [school_contact_directory_insert_input!]!) {
        insert_school_contact_directory(
          objects: $objects,
          on_conflict: {
            constraint: school_contact_directory_school_id_email_key,
            update_columns: [contact_type, is_active, updated_at, deactivated_at]
          }
        ) { affected_rows }
      }`,
      {
        objects: normalized.validRows.map((row) => ({
          school_id: schoolId,
          email: row.email,
          contact_type: row.contact_type,
          is_active: true,
          deactivated_at: null,
          updated_at: nowIso,
          created_by: actorId,
        })),
      }
    );

    upserted = upsertResp?.data?.insert_school_contact_directory?.affected_rows ?? 0;

    if (deactivateMissing) {
      const deactivateResp = await hasura(
        `mutation Deactivate($schoolId: uuid!, $emails: [citext!]!, $timestamp: timestamptz!) {
          update_school_contact_directory(
            where: { school_id: { _eq: $schoolId }, email: { _nin: $emails }, is_active: { _eq: true } },
            _set: { is_active: false, deactivated_at: $timestamp, updated_at: $timestamp }
          ) { affected_rows }
        }`,
        { schoolId, emails: Array.from(normalized.seen), timestamp: nowIso }
      );

      deactivated = deactivateResp?.data?.update_school_contact_directory?.affected_rows ?? 0;
    }

    await hasura(
      `mutation Audit($object: audit_log_insert_input!) {
        insert_audit_log_one(object: $object) { id }
      }`,
      {
        object: {
          actor_id: actorId,
          action: 'directory:import',
          entity_type: 'school_contact_directory',
          entity_id: schoolId,
          metadata: {
            totalRows: normalized.totalRows,
            totalValid: normalized.totalValid,
            invalid: normalized.invalid,
            deactivateMissing: Boolean(deactivateMissing),
            dryRun: Boolean(dryRun),
          },
        },
      }
    );
  }

  const stats = {
    totalRows: normalized.totalRows,
    totalValid: normalized.totalValid,
    invalid: normalized.invalid,
    upserted,
    deactivated,
    deactivateMissing: Boolean(deactivateMissing),
    dryRun: Boolean(dryRun),
  };

  return { stats, errors: normalized.errors };
}

export async function createImportJob(
  hasura: HasuraClient,
  params: {
    actorId: string;
    schoolId: string;
    districtId?: string | null;
    sourceType: string;
    sourceRef?: string | null;
    sourceHash: string;
  }
) {
  const jobInsert = await hasura(
    `mutation InsertJob($object: directory_import_jobs_insert_input!) {
      insert_directory_import_jobs_one(object: $object) { id }
    }`,
    {
      object: {
        actor_id: params.actorId,
        school_id: params.schoolId,
        district_id: params.districtId ?? null,
        source_type: params.sourceType,
        source_ref: params.sourceRef ?? null,
        source_hash: params.sourceHash,
        status: 'running',
      },
    }
  );

  return jobInsert?.data?.insert_directory_import_jobs_one?.id ?? null;
}

export async function completeJob(
  hasura: HasuraClient,
  params: { id: string; stats: any; errors: any; finishedAt?: string }
) {
  const timestamp = params.finishedAt ?? new Date().toISOString();
  return hasura(
    `mutation Finish($id: uuid!, $stats: jsonb!, $errors: jsonb!, $timestamp: timestamptz!) {
      update_directory_import_jobs_by_pk(
        pk_columns: { id: $id },
        _set: { status: "completed", finished_at: $timestamp, stats: $stats, errors: $errors }
      ) { id }
    }`,
    { id: params.id, stats: params.stats, errors: params.errors, timestamp }
  );
}

export async function failJob(
  hasura: HasuraClient,
  params: { id: string; errors: any; finishedAt?: string }
) {
  const timestamp = params.finishedAt ?? new Date().toISOString();
  return hasura(
    `mutation Fail($id: uuid!, $errors: jsonb!, $timestamp: timestamptz!) {
      update_directory_import_jobs_by_pk(
        pk_columns: { id: $id },
        _set: { status: "failed", finished_at: $timestamp, errors: $errors }
      ) { id }
    }`,
    { id: params.id, errors: params.errors, timestamp }
  );
}
