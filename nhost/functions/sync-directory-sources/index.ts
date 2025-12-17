import { runDirectorySourceSync } from '../_shared/directorySourceSync';
import { getDirectorySourceSecrets } from '../_shared/sourceFetchers/secrets';
import { getActorScope } from '../_shared/tenantScope';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const authHeader = String(req.headers['authorization'] ?? '');
  const cronToken = String(process.env.DIRECTORY_SYNC_TOKEN ?? '');
  const isCronRequest = Boolean(cronToken) && authHeader === `Bearer ${cronToken}`;

  if (!isCronRequest && (!actorId || !allowedRoles.has(role))) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const limit = Math.max(1, Math.min(100, Number((req.body ?? {}).limit ?? 25) || 25));

  async function hasura(query: string, variables?: Record<string, any>) {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });

    return response.json();
  }

  const scope = !isCronRequest && actorId ? await getActorScope(hasura, actorId) : null;

  const where: any = { is_enabled: { _eq: true } };
  if (!isCronRequest && role === 'school_admin' && scope?.schoolId) {
    where.school_id = { _eq: scope.schoolId };
  }
  if (!isCronRequest && role === 'district_admin' && scope?.districtId) {
    where.district_id = { _eq: scope.districtId };
  }

  const sourcesResp = await hasura(
    `query Sources($where: directory_sources_bool_exp!, $limit: Int!) {
      directory_sources(
        where: $where,
        order_by: [{ last_run_at: asc_nulls_first }, { created_at: asc }],
        limit: $limit
      ) {
        id
        school_id
        district_id
        name
        source_type
        is_enabled
        config
        last_run_at
      }
    }`,
    { where, limit }
  );

  const sources = sourcesResp?.data?.directory_sources ?? [];
  if (!Array.isArray(sources) || sources.length === 0) {
    return res.status(200).json({ ok: true, summary: { completed: 0, failed: 0, skipped: 0 }, results: [] });
  }

  const secrets = getDirectorySourceSecrets();
  const summary = { completed: 0, failed: 0, skipped: 0 };
  const results: any[] = [];

  for (const source of sources) {
    try {
      const result = await runDirectorySourceSync({
        hasura,
        source,
        actorId: actorId || source.school_id,
        deactivateMissing: true,
        dryRun: false,
        secrets,
      });

      if (result.status === 'skipped') summary.skipped += 1;
      else summary.completed += 1;

      results.push({ sourceId: source.id, status: result.status, runId: result.runId, jobId: result.jobId });
    } catch (error: any) {
      summary.failed += 1;
      const errorMessage = error?.message ?? 'failed';
      let runId: string | null = null;

      // Record the failed run if not already recorded
      try {
        const failedRun = await hasura(
          `mutation RecordFailedRun($object: directory_source_runs_insert_input!) {
            insert_directory_source_runs_one(object: $object) { id }
          }`,
          {
            object: {
              source_id: source.id,
              status: 'failed',
              finished_at: new Date().toISOString(),
              errors: [{ reason: 'exception', message: errorMessage }],
            },
          }
        );
        runId = failedRun?.data?.insert_directory_source_runs_one?.id ?? null;
      } catch (recordError) {
        // If recording fails, continue without blocking
        console.error('Failed to record failed run:', recordError);
      }

      results.push({ sourceId: source.id, status: 'failed', runId, message: errorMessage });
    }
  }

  return res.status(200).json({ ok: true, summary, results });
};
