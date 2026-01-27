import crypto from 'crypto';
import {
  DirectoryContact,
  DirectoryDiff,
  DirectoryInvalidRow,
  DirectoryRowInput,
  DirectoryRowNormalized,
  DirectorySchemaVersion,
  HasuraClient,
} from './types';
import { normalizeAndValidateDirectoryRows, normEmail } from './validate';
import { DEFAULT_PII_POLICY, PiiPolicy, redactQuarantineRow, sanitizeContact } from '../pii/policy';

export const MAX_DIFF_SAMPLES = 200;

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function loadDirectorySchemaVersion(hasura: HasuraClient, version: string): Promise<DirectorySchemaVersion> {
  const resp = await hasura(
    `query DirectorySchema($version: String!) {
      directory_schema_versions(where: { version: { _eq: $version } }, limit: 1) {
        version
        required_headers
        optional_headers
        rules
      }
    }`,
    { version }
  );

  const schema = resp?.data?.directory_schema_versions?.[0];
  if (!schema) throw new Error('schema_not_found');

  return {
    version: schema.version,
    required_headers: Array.isArray(schema.required_headers)
      ? schema.required_headers.map((value: string) => String(value).trim().toLowerCase())
      : [],
    optional_headers: Array.isArray(schema.optional_headers)
      ? schema.optional_headers.map((value: string) => String(value).trim().toLowerCase())
      : [],
    rules: schema.rules && typeof schema.rules === 'object' ? schema.rules : {},
  };
}

export async function computeDirectoryDiff(params: {
  hasura: HasuraClient;
  schoolId: string;
  rows: DirectoryRowNormalized[];
  deactivateMissing?: boolean;
  sampleLimit?: number;
}) {
  const { hasura, schoolId, rows, deactivateMissing = false, sampleLimit = MAX_DIFF_SAMPLES } = params;
  const directoryResp = await hasura(
    `query Directory($schoolId: uuid!) {
      school_contact_directory(where: { school_id: { _eq: $schoolId } }) {
        email
        contact_type
        is_active
      }
    }`,
    { schoolId }
  );

  const directory = directoryResp?.data?.school_contact_directory ?? [];
  const existingMap = new Map<string, { contact_type: string; is_active: boolean }>();
  directory.forEach((row: any) => {
    const email = normEmail(row.email);
    if (email) existingMap.set(email, { contact_type: row.contact_type, is_active: Boolean(row.is_active) });
  });

  const currentActiveCount = directory.filter((row: any) => row.is_active).length;
  const toAdd: DirectoryRowNormalized[] = [];
  const toUpdate: Array<DirectoryRowNormalized & { previous_contact_type?: string; wasInactive?: boolean }> = [];
  const seenEmails = new Set<string>();

  rows.forEach((row) => {
    seenEmails.add(row.email);
    const existing = existingMap.get(row.email);
    if (!existing) {
      toAdd.push(row);
      return;
    }

    const needsUpdate = existing.contact_type !== row.contact_type || existing.is_active === false;
    if (needsUpdate) {
      toUpdate.push({ ...row, previous_contact_type: existing.contact_type, wasInactive: existing.is_active === false });
    }
  });

  let toDeactivate: Array<{ email: string; contact_type?: string }> = [];
  if (deactivateMissing) {
    toDeactivate = directory
      .filter((row: any) => row.is_active && !seenEmails.has(normEmail(row.email)))
      .map((row: any) => ({ email: normEmail(row.email), contact_type: row.contact_type }));
  }

  const sample = <T, R>(items: T[], mapper: (value: T) => R) => items.slice(0, sampleLimit).map(mapper);

  const diff: DirectoryDiff = {
    counts: {
      toAdd: toAdd.length,
      toUpdate: toUpdate.length,
      toDeactivate: toDeactivate.length,
      invalid: 0,
      currentActive: currentActiveCount,
    },
    samples: {
      toAdd: sample(toAdd, (row) => ({ email: row.email, contact_type: row.contact_type })),
      toUpdate: sample(toUpdate, (row) => ({
        email: row.email,
        from: row.previous_contact_type,
        to: row.contact_type,
        wasInactive: row.wasInactive,
      })),
      toDeactivate: sample(toDeactivate, (row) => ({ email: row.email, contact_type: row.contact_type })),
      invalid: [],
    },
    existingCount: directory.length,
  };

  return diff;
}

async function insertPreviewRows(hasura: HasuraClient, previewId: string, rows: DirectoryRowNormalized[]) {
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    await hasura(
      `mutation InsertPreviewRows($objects: [directory_import_preview_rows_insert_input!]!) {
        insert_directory_import_preview_rows(
          objects: $objects,
          on_conflict: {
            constraint: directory_import_preview_rows_preview_id_email_key,
          update_columns: [contact_type, action]
          }
        ) { affected_rows }
      }`,
      {
        objects: slice.map((row) => ({
          preview_id: previewId,
          email: row.email,
          contact_type: row.contact_type,
          action: row.action ?? 'upsert',
        })),
      }
    );
  }
}

async function insertQuarantineRows(hasura: HasuraClient, previewId: string, rows: DirectoryInvalidRow[], piiPolicy: PiiPolicy) {
  if (!rows.length) return;
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    await hasura(
      `mutation InsertQuarantine($objects: [directory_import_quarantine_insert_input!]!) {
        insert_directory_import_quarantine(objects: $objects) { affected_rows }
      }`,
      {
        objects: slice.map((row) => ({
          preview_id: previewId,
          row_number: row.rowNumber,
          raw: {},
          raw_redacted: row.raw,
          reason: row.reason,
        })),
      }
    );
  }
}

export async function createDirectoryPreviewFromRows(params: {
  hasura: HasuraClient;
  actorId: string;
  schoolId: string;
  districtId?: string | null;
  rows: DirectoryRowInput[];
  schema: DirectorySchemaVersion;
  deactivateMissing?: boolean;
  sourceId?: string | null;
  sourceRef?: string | null;
  sampleLimit?: number;
  sourceHash?: string | null;
  metadata?: Record<string, any> | null;
  mode?: 'snapshot' | 'delta';
  piiPolicySnapshot?: Record<string, any> | null;
  scopesSnapshot?: Record<string, any> | null;
}) {
  const {
    hasura,
    actorId,
    schoolId,
    districtId = null,
    rows,
    schema,
    deactivateMissing = false,
    sourceId = null,
    sourceRef = null,
    sampleLimit = MAX_DIFF_SAMPLES,
    sourceHash: providedSourceHash = null,
    metadata = null,
    mode = 'snapshot',
    piiPolicySnapshot = null,
    scopesSnapshot = null,
  } = params;

  const effectiveSampleLimit = Number.isFinite(Number(sampleLimit)) && Number(sampleLimit) > 0 ? Number(sampleLimit) : MAX_DIFF_SAMPLES;

  const validation = normalizeAndValidateDirectoryRows(rows, schema, piiPolicy, initialInvalidRows);

  const diff = await computeDirectoryDiff({
    hasura,
    schoolId,
    rows: validation.validRows,
    deactivateMissing,
    sampleLimit: effectiveSampleLimit,
  });

  diff.counts.invalid = validation.invalid;
  const invalidSamples = validation.invalidRows.slice(0, effectiveSampleLimit).map((row) => ({
    rowNumber: row.rowNumber,
    reason: row.reason,
    email: row.raw?.email,
    contact_type: row.raw?.contact_type,
  }));
  diff.samples.invalid = invalidSamples;

  const sourceHash = providedSourceHash || sha256(`${schoolId}::${JSON.stringify(rows)}::${schema.version}`);

  const stats = {
    totalRows: validation.totalRows,
    totalValid: validation.totalValid,
    invalid: validation.invalid,
    toAdd: diff.counts.toAdd,
    toUpdate: diff.counts.toUpdate,
    toDeactivate: diff.counts.toDeactivate,
    currentActive: diff.counts.currentActive,
    sourceHash,
    metadata,
  };

  const previewInsert = await hasura(
    `mutation InsertPreview($object: directory_import_previews_insert_input!) {
      insert_directory_import_previews_one(object: $object) { id }
    }`,
    {
      object: {
        actor_id: actorId,
        school_id: schoolId,
        district_id: districtId,
        source_id: sourceId,
        source_ref: sourceRef,
        source_hash: sourceHash,
        schema_version: schema.version,
        deactivate_missing: deactivateMissing,
        diff,
        stats,
        errors: validation.errors,
        mode,
        pii_policy_snapshot: piiPolicySnapshot ?? {},
        scopes_snapshot: scopesSnapshot ?? {},
      },
    }
  );

  const previewId = previewInsert?.data?.insert_directory_import_previews_one?.id;
  if (!previewId) throw new Error('preview_not_created');

  if (validation.validRows.length > 0) {
    await insertPreviewRows(hasura, previewId, validation.validRows);
  }

  if (validation.invalidRows.length > 0) {
    await insertQuarantineRows(hasura, previewId, validation.invalidRows, piiPolicy);
  }

  await hasura(
    `mutation Audit($object: audit_log_insert_input!) {
      insert_audit_log_one(object: $object) { id }
    }`,
    {
      object: {
        actor_id: actorId,
        action: 'directory:preview_import',
        entity_type: 'school_contact_directory',
        entity_id: schoolId,
        metadata: {
          schoolId,
          districtId,
          schemaVersion: schema.version,
          deactivateMissing,
          stats,
          sourceId,
          sourceRef,
          previewId,
        },
      },
    }
  );

  return { previewId, diffSummary: diff, stats, schema };
}

export function mapRoleToContactType(role?: string) {
  const normalized = String(role || '').toLowerCase();
  if (['contact', 'guardian', 'parent'].includes(normalized)) return 'parent_guardian';
  if (normalized === 'teacher') return 'teacher';
  if (normalized === 'staff' || normalized === 'administrator') return 'staff';
  if (normalized === 'student') return 'student';
  return 'other';
}

export function mapDirectoryContactsToRows(contacts: DirectoryContact[]): DirectoryRowInput[] {
  return contacts.map((contact, idx) => ({
    email: contact.email,
    contact_type: contact.contactType ?? mapRoleToContactType(contact.sourceRole),
    rowNumber: idx + 1,
  }));
}

export async function createDirectoryPreviewFromContacts(params: {
  hasura: HasuraClient;
  actorId: string;
  schoolId: string;
  districtId?: string | null;
  contacts: DirectoryContact[];
  schema: DirectorySchemaVersion;
  deactivateMissing?: boolean;
  sourceId?: string | null;
  sourceRef?: string | null;
  sampleLimit?: number;
  sourceHash?: string | null;
  metadata?: Record<string, any> | null;
  scopesSnapshot?: Record<string, any> | null;
  mode?: 'snapshot' | 'delta';
}) {
  const rows = mapDirectoryContactsToRows(params.contacts);
  return createDirectoryPreviewFromRows({ ...params, rows, mode: params.mode });
}
