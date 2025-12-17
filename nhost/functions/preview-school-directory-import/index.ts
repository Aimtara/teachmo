import { createDirectoryImportPreview } from '../_shared/directoryImportCore';
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

  const { csvText, schoolId, schemaVersion = 'v1', deactivateMissing = false, sourceRef, sourceId } = req.body ?? {};
  const text = String(csvText ?? '');
  if (!text.trim()) return res.status(400).json({ ok: false, reason: 'csv_required' });

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

  const scope = await getActorScope(hasura, actorId);
  let sid = String(schoolId ?? '').trim();
  if (!sid) {
    sid = scope.schoolId ?? '';
  }

  if (!sid) return res.status(400).json({ ok: false, reason: 'school_required' });

  if (role === 'school_admin' && scope.schoolId && scope.schoolId !== sid) {
    return res.status(403).json({ ok: false });
  }

  if (role === 'district_admin' && !scope.districtId) {
    return res.status(403).json({ ok: false });
  }

  try {
    const result = await createDirectoryImportPreview({
      hasura,
      actorId,
      schoolId: sid,
      districtId: scope.districtId ?? null,
      csvText: text,
      schemaVersion,
      deactivateMissing: Boolean(deactivateMissing),
      sourceId: sourceId ?? null,
      sourceRef: sourceRef ?? null,
    });

    return res.status(200).json({
      ok: true,
      previewId: result.previewId,
      stats: result.stats,
      diffSummary: result.diffSummary,
    });
  } catch (error: any) {
    console.error('preview-school-directory-import failed', error);
    return res.status(400).json({ ok: false, reason: error?.message ?? 'preview_failed' });
  }
};
