import { applyDirectoryImportPreview, createDirectoryImportPreview, HasuraClient } from './directoryImportCore';
import { fetchHttpsUrlSource } from './sourceFetchers/httpsUrl';
import { fetchSftpSource } from './sourceFetchers/sftp';
import { DirectorySourceSecrets } from './sourceFetchers/secrets';

export type DirectorySource = {
  id: string;
  school_id: string;
  district_id?: string | null;
  name: string;
  source_type: string;
  is_enabled: boolean;
  config: Record<string, any>;
  last_run_at?: string | null;
};

export async function runDirectorySourceSync(params: {
  hasura: HasuraClient;
  source: DirectorySource;
  actorId?: string | null;
  deactivateMissing?: boolean;
  dryRun?: boolean;
  secrets: DirectorySourceSecrets;
}) {
  const { hasura, source, deactivateMissing = true, dryRun = false, secrets } = params;
  const effectiveActorId = params.actorId || source.school_id;

  const nowIso = new Date().toISOString();

  if (!source.is_enabled) {
    const skipped = await hasura(
      `mutation Skip($object: directory_source_runs_insert_input!) {
        insert_directory_source_runs_one(object: $object) { id }
      }`,
      {
        object: {
          source_id: source.id,
          status: 'skipped',
          finished_at: nowIso,
          errors: [{ reason: 'disabled' }],
        },
      }
    );

    return { status: 'skipped', runId: skipped?.data?.insert_directory_source_runs_one?.id ?? null };
  }

  const runInsert = await hasura(
    `mutation Start($object: directory_source_runs_insert_input!) {
      insert_directory_source_runs_one(object: $object) { id }
    }`,
    {
      object: {
        source_id: source.id,
        status: 'running',
      },
    }
  );

  const runId = runInsert?.data?.insert_directory_source_runs_one?.id ?? null;
  if (!runId) throw new Error('run_not_created');

  let jobId: string | null = null;
  let previewId: string | null = null;

  try {
    const config = source.config && typeof source.config === 'object' ? source.config : {};
    const fetchResult =
      source.source_type === 'https_url'
        ? await fetchHttpsUrlSource({ sourceId: source.id, config, secrets })
        : source.source_type === 'sftp'
          ? await fetchSftpSource({ sourceId: source.id, config, secrets })
          : null;

    if (!fetchResult) throw new Error('unsupported_source');

    const preview = await createDirectoryImportPreview({
      hasura,
      actorId: effectiveActorId,
      schoolId: source.school_id,
      districtId: source.district_id ?? null,
      csvText: fetchResult.csvText,
      schemaVersion: 'v1',
      deactivateMissing,
      sourceId: source.id,
      sourceRef: fetchResult.sourceRef ?? source.name,
    });

    previewId = preview.previewId;

    const deactivateCount = preview.diffSummary?.counts?.toDeactivate ?? 0;
    const currentActive = preview.diffSummary?.counts?.currentActive ?? 0;
    const pctLimit = Number(process.env.DIRECTORY_MAX_DEACTIVATE_PCT ?? 0.1);
    const absLimit = Number(process.env.DIRECTORY_MAX_DEACTIVATE_ABS ?? 100);
    const exceedsPct = currentActive > 0 && Number.isFinite(pctLimit) && pctLimit > 0 && deactivateCount > currentActive * pctLimit;
    const exceedsAbs = Number.isFinite(absLimit) && deactivateCount > absLimit;

    const finishedAt = new Date().toISOString();
    const runStats = {
      previewId,
      diffCounts: preview.diffSummary?.counts ?? {},
      stats: preview.stats,
      deactivateMissing: Boolean(deactivateMissing),
      dryRun: Boolean(dryRun),
      limits: { pctLimit, absLimit },
    };

    if (dryRun || (deactivateMissing && (exceedsPct || exceedsAbs))) {
      const errors = dryRun
        ? []
        : [
            {
              reason: 'deactivation_threshold_exceeded',
              deactivateCount,
              currentActive,
              pctLimit,
              absLimit,
            },
          ];

      await hasura(
        `mutation FinishRun($id: uuid!, $status: String!, $stats: jsonb!, $errors: jsonb!, $finishedAt: timestamptz!) {
          update_directory_source_runs_by_pk(
            pk_columns: { id: $id },
            _set: { status: $status, stats: $stats, errors: $errors, finished_at: $finishedAt }
          ) { id }
        }`,
        {
          id: runId,
          status: dryRun ? 'completed' : 'failed',
          stats: runStats,
          errors,
          finishedAt,
        }
      );

      return {
        status: dryRun ? 'completed' : 'failed',
        runId,
        previewId,
        stats: preview.stats,
        errors,
      };
    }

    const applyResult = await applyDirectoryImportPreview({
      hasura,
      previewId,
      actorId: effectiveActorId,
      auditMetadata: { sourceId: source.id, sourceName: source.name, runId },
    });

    jobId = applyResult.jobId ?? null;

    await hasura(
      `mutation FinishRun($id: uuid!, $jobId: uuid, $stats: jsonb!, $errors: jsonb!, $finishedAt: timestamptz!) {
        update_directory_source_runs_by_pk(
          pk_columns: { id: $id },
          _set: { status: "completed", job_id: $jobId, stats: $stats, errors: $errors, finished_at: $finishedAt }
        ) { id }
      }`,
      { id: runId, jobId, stats: { ...runStats, apply: applyResult.stats }, errors: [], finishedAt }
    );

    await hasura(
      `mutation TouchSource($id: uuid!, $timestamp: timestamptz!) {
        update_directory_sources_by_pk(
          pk_columns: { id: $id },
          _set: { last_run_at: $timestamp, updated_at: $timestamp }
        ) { id }
      }`,
      { id: source.id, timestamp: finishedAt }
    );

    await hasura(
      `mutation Audit($object: audit_log_insert_input!) {
        insert_audit_log_one(object: $object) { id }
      }`,
      {
        object: {
          actor_id: effectiveActorId,
          action: 'directory:sync_source',
          entity_type: 'directory_source',
          entity_id: source.id,
          metadata: {
            sourceId: source.id,
            sourceType: source.source_type,
            previewId,
            jobId,
            totalValid: applyResult.stats.totalValid,
            invalid: applyResult.stats.invalid,
            deactivateMissing: Boolean(deactivateMissing),
            dryRun: Boolean(dryRun),
          },
        },
      }
    );

    return { status: 'completed', runId, jobId, stats: applyResult.stats, previewId };
  } catch (error: any) {
    const originalError = error;
    const finishedAt = new Date().toISOString();
    const errors = [{ reason: 'exception', message: String(error?.message ?? error) }];

    try {
      await hasura(
        `mutation FailRun($id: uuid!, $errors: jsonb!, $finishedAt: timestamptz!) {
          update_directory_source_runs_by_pk(
            pk_columns: { id: $id },
            _set: { status: "failed", errors: $errors, finished_at: $finishedAt }
          ) { id }
        }`,
        { id: runId, errors, finishedAt }
      );
    } catch (recordingError) {
      // Swallow errors from failure recording to avoid masking the original error.
      // Optionally log recordingError here if logging is available.
    }

    throw originalError;
  }
}
