import { runDirectorySourceSync } from '../_shared/directorySourceSync';
import { getDirectorySourceSecrets } from '../_shared/sourceFetchers/secrets';
import { getActorScope } from '../_shared/tenantScope';
import { handleDirectorySyncAlert } from '../_shared/notifier';

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

  const { sourceId, deactivateMissing = true, dryRun = false } = req.body ?? {};
  if (!sourceId) return res.status(400).json({ ok: false, reason: 'source_required' });

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

  const sourceResp = await hasura(
    `query Source($id: uuid!) {
      directory_sources_by_pk(id: $id) {
        id
        school_id
        district_id
        name
        source_type
        is_enabled
        config
        last_run_at
        pii_policy
        retention_days
        dataguard_mode
      }
    }`,
    { id: sourceId }
  );

  const source = sourceResp?.data?.directory_sources_by_pk;
  if (!source?.id) return res.status(404).json({ ok: false });

  const scope = !isCronRequest && actorId ? await getActorScope(hasura, actorId) : null;

  if (!isCronRequest && role === 'school_admin') {
    // Require a valid schoolId in scope and ensure it matches the source's school_id
    if (!scope || scope.schoolId == null) {
      return res.status(403).json({ ok: false });
    }
    if (source.school_id != null && scope.schoolId !== source.school_id) {
      return res.status(403).json({ ok: false });
    }
  }

  if (!isCronRequest && role === 'district_admin') {
    // Require a valid districtId in scope and ensure it matches the source's district_id
    if (!scope || scope.districtId == null) {
      return res.status(403).json({ ok: false });
    }
    if (source.district_id != null && scope.districtId !== source.district_id) {
      return res.status(403).json({ ok: false });
    }
  }

  try {
    const secrets = getDirectorySourceSecrets();

    const result = await runDirectorySourceSync({
      hasura,
      source,
      actorId: actorId || source.school_id,
      deactivateMissing: Boolean(deactivateMissing),
      dryRun: Boolean(dryRun),
      secrets,
    });

    if (isCronRequest) {
      try {
        await handleDirectorySyncAlert({ hasura, source, result, isCron: isCronRequest });
      } catch (notifyError) {
        console.error('sync-directory-source notification failed', notifyError);
      }
    }

    return res.status(200).json({ ok: true, ...result });
  } catch (error: any) {
    console.error('sync-directory-source failed', error);

    if (isCronRequest) {
      try {
        await handleDirectorySyncAlert({ hasura, source, error, isCron: isCronRequest });
      } catch (notifyError) {
        console.error('sync-directory-source notification failed after error', notifyError);
      }
    }

    return res.status(500).json({ ok: false, reason: 'sync_failed', message: error?.message ?? 'sync_failed' });
  }
};
