import { applyDirectoryImportPreview } from '../_shared/directoryImportCore';
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

  const { previewId } = req.body ?? {};
  if (!previewId) return res.status(400).json({ ok: false, reason: 'preview_required' });

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

  const previewResp = await hasura(
    `query PreviewScope($id: uuid!) {
      directory_import_previews_by_pk(id: $id) {
        id
        school_id
        district_id
        expires_at
        applied_at
      }
    }`,
    { id: previewId }
  );

  const preview = previewResp?.data?.directory_import_previews_by_pk;
  if (!preview?.id) return res.status(404).json({ ok: false, reason: 'preview_not_found' });

  if (role === 'school_admin' && scope.schoolId && preview.school_id && scope.schoolId !== preview.school_id) {
    return res.status(403).json({ ok: false });
  }

  if (role === 'district_admin' && scope.districtId && preview.district_id && scope.districtId !== preview.district_id) {
    return res.status(403).json({ ok: false });
  }

  try {
    const result = await applyDirectoryImportPreview({
      hasura,
      previewId,
      actorId,
      auditMetadata: { appliedByRole: role },
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (error: any) {
    console.error('apply-school-directory-preview failed', error);
    return res.status(400).json({ ok: false, reason: error?.message ?? 'apply_failed' });
  }
};
