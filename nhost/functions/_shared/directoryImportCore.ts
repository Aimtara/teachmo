import crypto from 'crypto';

export type HasuraClient = (query: string, variables?: Record<string, any>) => Promise<any>;

export type DirectoryRowInput = { email?: string | null; contact_type?: string | null; rowNumber?: number };
export type DirectoryRowNormalized = { email: string; contact_type: string };
export type JobError = { reason: string; message?: string; row?: number };
export type DirectorySchemaVersion = {
  version: string;
  required_headers: string[];
  optional_headers: string[];
  rules: Record<string, any>;
};
export type DirectoryInvalidRow = { rowNumber: number; raw: Record<string, any>; reason: string };
export type DirectoryDiff = {
  counts: { toAdd: number; toUpdate: number; toDeactivate: number; invalid: number; currentActive: number };
  samples: {
    toAdd: Array<{ email: string; contact_type: string }>;
    toUpdate: Array<{ email: string; from?: string; to: string; wasInactive?: boolean }>;
    toDeactivate: Array<{ email: string; contact_type?: string }>;
    invalid: Array<{ rowNumber: number; reason: string; email?: string | null; contact_type?: string | null }>;
  };
  existingCount: number;
};

const MAX_ERRORS = 50;
const MAX_DIFF_SAMPLES = 200;
const MAX_QUARANTINE_ROWS = 500;

function normEmail(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function isEmailLike(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeHeader(name: string) {
  return String(name || '').trim().toLowerCase();
}

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
      ? schema.required_headers.map(normalizeHeader)
      : [],
    optional_headers: Array.isArray(schema.optional_headers)
      ? schema.optional_headers.map(normalizeHeader)
      : [],
    rules: schema.rules && typeof schema.rules === 'object' ? schema.rules : {},
  };
}

export function parseDirectoryCsv(csvText: string, schema?: DirectorySchemaVersion) {
  const lines = csvText.split(/\r?\n/).filter((line) => String(line || '').trim().length > 0);
  if (lines.length === 0) throw new Error('CSV must include headers');

  const headerLine = lines.shift()!;
  const headers = headerLine.split(',').map(normalizeHeader);

  const required = schema?.required_headers ?? ['email'];
  const missingHeaders = required.filter((h) => !headers.includes(normalizeHeader(h)));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const idxEmail = headers.findIndex((h) => h === 'email');
  if (idxEmail < 0) throw new Error("CSV must include 'email' header");
  const idxType = headers.findIndex((h) => h === 'contact_type');

  const rows = lines.map((line, idx) => {
    const cols = line.split(',');
    const row: Record<string, any> = {};

    headers.forEach((key, colIdx) => {
      row[key] = cols[colIdx] ?? '';
    });

    return {
      ...row,
      email: row.email ?? cols[idxEmail] ?? '',
      contact_type: idxType >= 0 ? row.contact_type ?? cols[idxType] : row.contact_type,
      rowNumber: idx + 2,
    };
  });

  return { rows, rowCount: rows.length, headers };
}

export function normalizeAndValidateDirectoryRows(rows: DirectoryRowInput[], schema?: DirectorySchemaVersion) {
  const seen = new Set<string>();
  const valid: DirectoryRowNormalized[] = [];
  const errors: JobError[] = [];
  const invalidRows: DirectoryInvalidRow[] = [];

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
    const rowNumber = row.rowNumber ?? idx + 1;

    if (!email || !isEmailLike(email)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'invalid_email' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({ rowNumber, raw: { email: row.email, contact_type: row.contact_type }, reason: 'invalid_email' });
      }
      return;
    }

    if (schema?.required_headers?.includes('contact_type') && !contactTypeDefaulted) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'missing_contact_type' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({ rowNumber, raw: { email: row.email, contact_type: row.contact_type }, reason: 'missing_contact_type' });
      }
      return;
    }

    if (allowedContactTypes.size > 0 && contactTypeDefaulted && !allowedContactTypes.has(contactTypeDefaulted)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'invalid_contact_type' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({ rowNumber, raw: { email: row.email, contact_type: row.contact_type }, reason: 'invalid_contact_type' });
      }
      return;
    }

    if (seen.has(email)) {
      if (errors.length < MAX_ERRORS) errors.push({ row: rowNumber, reason: 'duplicate_email' });
      if (invalidRows.length < MAX_QUARANTINE_ROWS) {
        invalidRows.push({ rowNumber, raw: { email: row.email, contact_type: row.contact_type }, reason: 'duplicate_email' });
      }
      return;
    }
    seen.add(email);
    valid.push({ email, contact_type: contactTypeDefaulted || 'parent_guardian' });
  });

  const totalRows = rows.length;
  const totalValid = valid.length;
  const invalid = totalRows - totalValid;

  return { validRows: valid, errors, seen, totalRows, totalValid, invalid, invalidRows };
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

export async function upsertDirectoryRows(params: {
  hasura: HasuraClient;
  schoolId: string;
  actorId: string;
  rows?: DirectoryRowInput[];
  normalizedRows?: DirectoryRowNormalized[];
  deactivateMissing?: boolean;
  dryRun?: boolean;
  sourceRef?: string | null;
  sourceHash?: string | null;
  totalRowsOverride?: number;
  invalidCountOverride?: number;
  auditAction?: string;
  previewId?: string | null;
}) {
  const {
    hasura,
    schoolId,
    actorId,
    rows = [],
    normalizedRows,
    deactivateMissing,
    dryRun,
    totalRowsOverride,
    invalidCountOverride,
    auditAction,
    previewId,
  } = params;

  const normalized = normalizedRows
    ? {
        validRows: normalizedRows,
        errors: [],
        seen: new Set(normalizedRows.map((row) => normEmail(row.email))),
        totalRows: totalRowsOverride ?? normalizedRows.length,
        totalValid: normalizedRows.length,
        invalid: invalidCountOverride ?? Math.max(0, (totalRowsOverride ?? normalizedRows.length) - normalizedRows.length),
      }
    : normalizeAndValidateDirectoryRows(rows);
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
          action: auditAction || 'directory:import',
          entity_type: 'school_contact_directory',
          entity_id: schoolId,
          metadata: {
            totalRows: normalized.totalRows,
            totalValid: normalized.totalValid,
            invalid: normalized.invalid,
            deactivateMissing: Boolean(deactivateMissing),
            dryRun: Boolean(dryRun),
            previewId: previewId ?? null,
            sourceRef: params.sourceRef ?? null,
            sourceHash: params.sourceHash ?? null,
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
            update_columns: [contact_type]
          }
        ) { affected_rows }
      }`,
      {
        objects: slice.map((row) => ({
          preview_id: previewId,
          email: row.email,
          contact_type: row.contact_type,
        })),
      }
    );
  }
}

async function insertQuarantineRows(hasura: HasuraClient, previewId: string, rows: DirectoryInvalidRow[]) {
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
          raw: row.raw,
          reason: row.reason,
        })),
      }
    );
  }
}

export async function createDirectoryImportPreview(params: {
  hasura: HasuraClient;
  actorId: string;
  schoolId: string;
  districtId?: string | null;
  csvText: string;
  schemaVersion?: string;
  deactivateMissing?: boolean;
  sourceId?: string | null;
  sourceRef?: string | null;
  sampleLimit?: number;
}) {
  const {
    hasura,
    actorId,
    schoolId,
    districtId = null,
    csvText,
    schemaVersion = 'v1',
    deactivateMissing = false,
    sourceId = null,
    sourceRef = null,
    sampleLimit = MAX_DIFF_SAMPLES,
  } = params;

  const schema = await loadDirectorySchemaVersion(hasura, schemaVersion);
  const parsed = parseDirectoryCsv(csvText, schema);
  const validation = normalizeAndValidateDirectoryRows(parsed.rows, schema);

  const diff = await computeDirectoryDiff({
    hasura,
    schoolId,
    rows: validation.validRows,
    deactivateMissing,
    sampleLimit,
  });

  diff.counts.invalid = validation.invalid;
  const invalidSamples = validation.invalidRows.slice(0, sampleLimit).map((row) => ({
    rowNumber: row.rowNumber,
    reason: row.reason,
    email: row.raw?.email,
    contact_type: row.raw?.contact_type,
  }));
  diff.samples.invalid = invalidSamples;

  const sourceHash = sha256(`${schoolId}::${csvText}::${schema.version}`);

  const stats = {
    totalRows: validation.totalRows,
    totalValid: validation.totalValid,
    invalid: validation.invalid,
    toAdd: diff.counts.toAdd,
    toUpdate: diff.counts.toUpdate,
    toDeactivate: diff.counts.toDeactivate,
    currentActive: diff.counts.currentActive,
    sourceHash,
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
      },
    }
  );

  const previewId = previewInsert?.data?.insert_directory_import_previews_one?.id;
  if (!previewId) throw new Error('preview_not_created');

  if (validation.validRows.length > 0) {
    await insertPreviewRows(hasura, previewId, validation.validRows);
  }

  if (validation.invalidRows.length > 0) {
    await insertQuarantineRows(hasura, previewId, validation.invalidRows);
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

async function fetchPreviewRows(hasura: HasuraClient, previewId: string) {
  const batchSize = 1000;
  const rows: DirectoryRowNormalized[] = [];
  let offset = 0;
  while (true) {
    const resp = await hasura(
      `query PreviewRows($previewId: uuid!, $limit: Int!, $offset: Int!) {
        directory_import_preview_rows(where: { preview_id: { _eq: $previewId } }, limit: $limit, offset: $offset) {
          email
          contact_type
        }
      }`,
      { previewId, limit: batchSize, offset }
    );

    const batch = resp?.data?.directory_import_preview_rows ?? [];
    if (!batch.length) break;

    rows.push(
      ...batch.map((row: any) => ({
        email: normEmail(row.email),
        contact_type: row.contact_type,
      }))
    );
    if (batch.length < batchSize) break;
    offset += batchSize;
  }

  return rows;
}

export async function applyDirectoryImportPreview(params: {
  hasura: HasuraClient;
  previewId: string;
  actorId: string;
  auditMetadata?: Record<string, any>;
}) {
  const { hasura, previewId, actorId, auditMetadata = {} } = params;
  const previewResp = await hasura(
    `query Preview($id: uuid!) {
      directory_import_previews_by_pk(id: $id) {
        id
        actor_id
        school_id
        district_id
        source_id
        source_ref
        source_hash
        schema_version
        created_at
        expires_at
        applied_at
        deactivate_missing
        stats
      }
    }`,
    { id: previewId }
  );

  const preview = previewResp?.data?.directory_import_previews_by_pk;
  if (!preview) throw new Error('preview_not_found');

  const expiresAt = preview.expires_at ? new Date(preview.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) throw new Error('preview_expired');

  if (preview.applied_at) throw new Error('preview_already_applied');

  const rows = await fetchPreviewRows(hasura, previewId);
  const stats = preview.stats && typeof preview.stats === 'object' ? preview.stats : {};

  const upsertResult = await upsertDirectoryRows({
    hasura,
    schoolId: preview.school_id,
    actorId,
    normalizedRows: rows,
    totalRowsOverride: stats.totalRows ?? rows.length,
    invalidCountOverride: stats.invalid ?? 0,
    deactivateMissing: preview.deactivate_missing,
    dryRun: false,
    sourceRef: preview.source_ref ?? null,
    sourceHash: preview.source_hash ?? null,
    auditAction: 'directory:apply_preview',
    previewId,
  });

  const finishedAt = new Date().toISOString();

  const jobId = await createImportJob(hasura, {
    actorId,
    schoolId: preview.school_id,
    districtId: preview.district_id ?? null,
    sourceType: preview.source_id ? 'source_preview' : 'preview',
    sourceRef: preview.source_ref ?? null,
    sourceHash: preview.source_hash,
  });

  if (jobId) {
    await completeJob(hasura, {
      id: jobId,
      stats: upsertResult.stats,
      errors: upsertResult.errors,
      finishedAt,
    });
  }

  await hasura(
    `mutation ApplyPreview($id: uuid!, $appliedAt: timestamptz!) {
      update_directory_import_previews_by_pk(
        pk_columns: { id: $id },
        _set: { applied_at: $appliedAt }
      ) { id }
    }`,
    { id: previewId, appliedAt: finishedAt }
  );

  await hasura(
    `mutation Audit($object: audit_log_insert_input!) {
      insert_audit_log_one(object: $object) { id }
    }`,
    {
      object: {
        actor_id: actorId,
        action: 'directory:apply_preview',
        entity_type: 'school_contact_directory',
        entity_id: preview.school_id,
        metadata: {
          previewId,
          jobId,
          stats: upsertResult.stats,
          sourceRef: preview.source_ref ?? null,
          sourceHash: preview.source_hash,
          ...auditMetadata,
        },
      },
    }
  );

  return { jobId, stats: upsertResult.stats };
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
