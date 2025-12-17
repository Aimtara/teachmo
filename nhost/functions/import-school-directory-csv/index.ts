import { completeJob, createImportJob, failJob, parseDirectoryCsv, sha256, upsertDirectoryRows } from '../_shared/directoryImportCore';
import { getActorScope } from '../_shared/tenantScope';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { csvText, schoolId, deactivateMissing, dryRun, sourceRef } = req.body ?? {};
  const text = String(csvText ?? '');
  if (!text) return res.status(200).json({ ok: true, jobId: null });

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

  let scope: Awaited<ReturnType<typeof getActorScope>> | null = null;
  let sid = String(schoolId ?? '').trim();
  if (!sid) {
    scope = await getActorScope(hasura, actorId);
    sid = scope.schoolId ?? '';
  }

  if (!sid) return res.status(400).json({ ok: false, reason: 'school_required' });

  const sourceHash = sha256(`${sid}::${text}`);

  const jobId = await createImportJob(hasura, {
    actorId,
    schoolId: sid,
    districtId: scope?.districtId ?? null,
    sourceType: 'csv',
    sourceRef: sourceRef ?? null,
    sourceHash,
  });

  if (!jobId) return res.status(500).json({ ok: false, reason: 'job_not_created' });

  try {
    const parsed = parseDirectoryCsv(text);

    const upsertResult = await upsertDirectoryRows({
      hasura,
      schoolId: sid,
      actorId,
      rows: parsed.rows,
      deactivateMissing,
      dryRun,
      sourceRef: sourceRef ?? null,
      sourceHash,
    });

    const nowIso = new Date().toISOString();

    await completeJob(hasura, { id: jobId, stats: upsertResult.stats, errors: upsertResult.errors, finishedAt: nowIso });

    return res.status(200).json({
      ok: true,
      jobId,
      stats: { totalRows: upsertResult.stats.totalRows, totalValid: upsertResult.stats.totalValid },
    });
  } catch (error: any) {
    console.error('import-school-directory-csv failed', error);

    const failTimestamp = new Date().toISOString();

    await failJob(hasura, {
      id: jobId,
      errors: [{ reason: 'exception', message: String(error?.message ?? error) }],
      finishedAt: failTimestamp,
    });

    return res.status(200).json({ ok: true, jobId, failed: true });
  }
};
