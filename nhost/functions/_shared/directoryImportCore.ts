import { recordDirectoryMetricsSnapshot } from './directoryMetrics';
import { DirectoryInvalidRow, DirectoryRowInput, DirectoryRowNormalized, DirectorySchemaVersion, HasuraClient } from './directory/types';
import { createDirectoryPreviewFromRows, loadDirectorySchemaVersion, MAX_DIFF_SAMPLES, sha256 } from './directory/computePreview';
import { normalizeAndValidateDirectoryRows, normalizeHeader, normEmail } from './directory/validate';

export { HasuraClient } from './directory/types';

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
  sourceHash?: string | null;
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
    sourceHash: providedSourceHash = null,
  } = params;

  const schema = await loadDirectorySchemaVersion(hasura, schemaVersion);
  const parsed = parseDirectoryCsv(csvText, schema);
  const sourceHash = providedSourceHash || sha256(`${schoolId}::${csvText}::${schema.version}`);

  return createDirectoryPreviewFromRows({
    hasura,
    actorId,
    schoolId,
    districtId,
    rows: parsed.rows,
    schema,
    deactivateMissing,
    sourceId,
    sourceRef,
    sampleLimit,
    sourceHash,
  });
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
      requires_approval
      approval_id
      deactivate_missing
      stats
      approval {
        id
        status
        applied_at
        expires_at
        decision_reason
      }
    }
  }`,
    { id: previewId }
  );

  const preview = previewResp?.data?.directory_import_previews_by_pk;
  if (!preview) throw new Error('preview_not_found');

  const expiresAt = preview.expires_at ? new Date(preview.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) throw new Error('preview_expired');

  if (preview.applied_at) throw new Error('preview_already_applied');

  if (preview.approval_id || preview.requires_approval) {
    const approval = preview.approval;
    if (!approval?.id) throw new Error('approval_required');

    const approvalExpired = approval.expires_at ? new Date(approval.expires_at).getTime() < Date.now() : false;
    if (approvalExpired) throw new Error('approval_expired');
    if (approval.applied_at) throw new Error('approval_already_applied');
    if (approval.status !== 'approved') throw new Error('approval_required');
  }

  const rows = await fetchPreviewRows(hasura, previewId);
  const previewStats = preview.stats && typeof preview.stats === 'object' ? preview.stats : {};

  const upsertResult = await upsertDirectoryRows({
    hasura,
    schoolId: preview.school_id,
    actorId,
    normalizedRows: rows,
    totalRowsOverride: previewStats.totalRows ?? rows.length,
    invalidCountOverride: previewStats.invalid ?? 0,
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

  try {
    await recordDirectoryMetricsSnapshot({
      hasura,
      schoolId: preview.school_id,
      districtId: preview.district_id ?? null,
      stats: upsertResult.stats,
      diffCounts: previewStats,
      lastImportJobId: jobId ?? null,
      lastPreviewId: previewId,
      lastApprovalId: preview.approval_id ?? null,
      metadata: { sourceId: preview.source_id ?? null, appliedFrom: 'apply_preview' },
    });
  } catch (metricsError) {
    console.error('failed to record directory metrics snapshot', metricsError);
  }

  return { jobId, stats: upsertResult.stats, appliedAt: finishedAt };
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
