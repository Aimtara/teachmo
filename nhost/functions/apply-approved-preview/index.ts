import { applyDirectoryImportPreview } from '../_shared/directoryImportCore';
import { isApprovalExpired, isTenantAdminForScope, loadApproval, setApprovalStatus } from '../_shared/approvals';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { approvalId } = req.body ?? {};
  if (!approvalId) return res.status(400).json({ ok: false, reason: 'approval_required' });

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

  const approval = await loadApproval(hasura, approvalId);
  if (!approval?.id) return res.status(404).json({ ok: false, reason: 'not_found' });

  if (approval.status !== 'approved') return res.status(400).json({ ok: false, reason: 'not_approved' });
  if (isApprovalExpired(approval)) return res.status(400).json({ ok: false, reason: 'approval_expired' });
  if (approval.applied_at) return res.status(400).json({ ok: false, reason: 'already_applied' });

  const authorized = await isTenantAdminForScope({
    hasura,
    actorId,
    schoolId: approval.school_id,
    districtId: approval.district_id ?? null,
  });
  if (!authorized) return res.status(403).json({ ok: false });

  try {
    const applyResult = await applyDirectoryImportPreview({
      hasura,
      previewId: approval.preview_id,
      actorId,
      auditMetadata: { approvalId },
    });

    const appliedAt = applyResult?.appliedAt ?? new Date().toISOString();
    await setApprovalStatus({ hasura, id: approvalId, status: 'applied', appliedAt });

    try {
      await hasura(
        `mutation MarkPreview($id: uuid!, $appliedAt: timestamptz!) {
          update_directory_import_previews_by_pk(
            pk_columns: { id: $id },
            _set: { applied_at: $appliedAt }
          ) { id }
        }`,
        { id: approval.preview_id, appliedAt }
      );
    } catch (previewError) {
      console.error('failed to update preview after approval apply', previewError);
    }

    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId,
            action: 'directory:approval_applied',
            entity_type: 'directory_deactivation_approval',
            entity_id: approvalId,
            metadata: {
              approvalId,
              previewId: approval.preview_id,
              jobId: applyResult?.jobId ?? null,
              stats: applyResult?.stats ?? approval.stats ?? {},
            },
          },
        }
      );
    } catch (auditError) {
      console.error('apply approval audit failed', auditError);
    }

    return res.status(200).json({ ok: true, jobId: applyResult?.jobId ?? null, previewId: approval.preview_id });
  } catch (error: any) {
    console.error('apply-approved-preview failed', error);
    return res.status(400).json({ ok: false, reason: error?.message ?? 'apply_failed' });
  }
};
