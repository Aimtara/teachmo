import { isApprovalExpired, isTenantAdminForScope, setApprovalStatus } from '../_shared/approvals';
import { notifyDirectoryIssue } from '../_shared/notifier';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);

function normalizeBaseUrl(value?: string | null) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { approvalId, reason = null } = req.body ?? {};
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

  const approvalResp = await hasura(
    `query Approval($id: uuid!) {
      directory_deactivation_approvals_by_pk(id: $id) {
        id
        status
        school_id
        district_id
        preview_id
        expires_at
        applied_at
        stats
        preview {
          id
          school_id
          district_id
          applied_at
          expires_at
        }
      }
    }`,
    { id: approvalId }
  );

  const approval = approvalResp?.data?.directory_deactivation_approvals_by_pk;
  if (!approval?.id) return res.status(404).json({ ok: false, reason: 'not_found' });

  if (approval.status !== 'pending') return res.status(400).json({ ok: false, reason: 'not_pending' });
  if (isApprovalExpired(approval)) return res.status(400).json({ ok: false, reason: 'approval_expired' });
  if (approval.applied_at) return res.status(400).json({ ok: false, reason: 'already_applied' });

  const authorized = await isTenantAdminForScope({
    hasura,
    actorId,
    schoolId: approval.school_id,
    districtId: approval.district_id ?? null,
  });
  if (!authorized) return res.status(403).json({ ok: false });

  const updated = await setApprovalStatus({ hasura, id: approvalId, status: 'approved', decidedBy: actorId, reason });
  if (!updated?.id) return res.status(500).json({ ok: false, reason: 'update_failed' });

  const baseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);
  const approvalLink = baseUrl ? `${baseUrl}/admin/directory-approvals/${approvalId}` : null;

  try {
    await notifyDirectoryIssue({
      hasura,
      schoolId: approval.school_id,
      districtId: approval.district_id ?? null,
      type: 'directory.approval_approved',
      severity: 'info',
      title: 'Directory deactivation approval approved',
      body: 'An administrator approved the pending directory deactivation request.',
      entityType: 'directory_deactivation_approval',
      entityId: approvalId,
      dedupeKey: `directory:${approval.school_id}:approval:${approvalId}:approved`,
      metadata: {
        approvalId,
        previewId: approval.preview_id,
        stats: approval.stats ?? {},
        links: {
          approval: approvalLink,
          preview: approval.preview?.id && baseUrl ? `${baseUrl}/admin/directory-import/preview/${approval.preview.id}` : null,
        },
      },
    });
  } catch (notifyError) {
    console.error('approval approval notification failed', notifyError);
  }

  try {
    await hasura(
      `mutation Audit($object: audit_log_insert_input!) {
        insert_audit_log_one(object: $object) { id }
      }`,
      {
        object: {
          actor_id: actorId,
          action: 'directory:approval_approved',
          entity_type: 'directory_deactivation_approval',
          entity_id: approvalId,
          metadata: {
            approvalId,
            previewId: approval.preview_id,
            stats: approval.stats ?? {},
            reason: reason ?? null,
          },
        },
      }
    );
  } catch (auditError) {
    console.error('approval approve audit failed', auditError);
  }

  return res.status(200).json({ ok: true, status: 'approved', approvalId });
};
