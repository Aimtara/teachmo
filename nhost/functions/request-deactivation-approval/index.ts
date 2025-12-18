import { isTenantAdminForScope, isApprovalExpired, upsertApprovalRequest } from '../_shared/approvals';
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
  const authHeader = String(req.headers['authorization'] ?? '');
  const cronToken = String(process.env.DIRECTORY_SYNC_TOKEN ?? '');
  const isInternal = Boolean(cronToken) && authHeader === `Bearer ${cronToken}`;

  if (!isInternal && (!actorId || !allowedRoles.has(role))) return res.status(403).json({ ok: false });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  const { previewId, sourceId = null, sourceRunId = null } = req.body ?? {};
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

  const previewResp = await hasura(
    `query Preview($id: uuid!) {
      directory_import_previews_by_pk(id: $id) {
        id
        actor_id
        school_id
        district_id
        expires_at
        applied_at
        requires_approval
        approval_id
        diff
        stats
      }
    }`,
    { id: previewId }
  );

  const preview = previewResp?.data?.directory_import_previews_by_pk;
  if (!preview?.id) return res.status(404).json({ ok: false, reason: 'preview_not_found' });

  if (preview.applied_at) return res.status(400).json({ ok: false, reason: 'preview_already_applied' });
  if (preview.expires_at && new Date(preview.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ ok: false, reason: 'preview_expired' });
  }

  if (!isInternal) {
    const authorized = await isTenantAdminForScope({
      hasura,
      actorId,
      schoolId: preview.school_id,
      districtId: preview.district_id ?? null,
    });
    if (!authorized) return res.status(403).json({ ok: false });
  }

  const counts = (preview.diff && typeof preview.diff === 'object' ? preview.diff.counts : null) || {};
  const samples = (preview.diff && typeof preview.diff === 'object' ? preview.diff.samples : null) || {};

  const toDeactivateCount = counts.toDeactivate ?? preview.stats?.toDeactivate ?? 0;
  const activeCount = counts.currentActive ?? preview.stats?.currentActive ?? 0;
  const pct = activeCount > 0 ? toDeactivateCount / activeCount : 0;

  const approvalStats = {
    toDeactivateCount,
    activeCount,
    pct,
    counts,
    samples: {
      toDeactivate: samples.toDeactivate ?? [],
      toUpdate: samples.toUpdate ?? [],
      toAdd: samples.toAdd ?? [],
      invalid: samples.invalid ?? [],
    },
  };

  const dedupeMinutes = Number(process.env.DIRECTORY_APPROVAL_DEDUPE_MINUTES ?? 360);
  const dedupeSince = Number.isFinite(dedupeMinutes) && dedupeMinutes > 0
    ? new Date(Date.now() - dedupeMinutes * 60 * 1000).toISOString()
    : null;

  const requestedBy = actorId || String(preview.actor_id ?? preview.school_id);
  const approval = await upsertApprovalRequest({
    hasura,
    previewId,
    schoolId: preview.school_id,
    districtId: preview.district_id ?? null,
    requestedBy,
    stats: approvalStats,
    sourceId,
    sourceRunId,
    metadata: { sourceId, sourceRunId },
    dedupeSince,
    expiresAt: preview.expires_at ?? null,
    existingApprovalId: preview.approval_id ?? null,
  });

  if (!approval?.id) return res.status(500).json({ ok: false, reason: 'approval_not_created' });

  const baseUrl = normalizeBaseUrl(process.env.APP_BASE_URL);
  const approvalLink = baseUrl ? `${baseUrl}/admin/directory-approvals/${approval.id}` : null;

  try {
    if (!isApprovalExpired(approval)) {
      await notifyDirectoryIssue({
        hasura,
        schoolId: preview.school_id,
        districtId: preview.district_id ?? null,
        type: 'directory.needs_approval',
        severity: 'warning',
        title: 'Directory deactivations need approval',
        body: `Deactivating ${toDeactivateCount} of ${activeCount || '0'} contacts requires approval before applying changes.`,
        entityType: 'directory_deactivation_approval',
        entityId: approval.id,
        dedupeKey: `directory:${preview.school_id}:approval_pending`,
        metadata: {
          previewId,
          approvalId: approval.id,
          stats: approvalStats,
          links: {
            approval: approvalLink,
            preview: baseUrl ? `${baseUrl}/admin/directory-import/preview/${previewId}` : null,
          },
        },
      });
    }
  } catch (notifyError) {
    console.error('approval notification failed', notifyError);
  }

  try {
    await hasura(
      `mutation Audit($object: audit_log_insert_input!) {
        insert_audit_log_one(object: $object) { id }
      }`,
      {
        object: {
          actor_id: requestedBy,
          action: 'directory:approval_requested',
          entity_type: 'directory_import_preview',
          entity_id: previewId,
          metadata: {
            previewId,
            approvalId: approval.id,
            stats: approvalStats,
            sourceId,
            sourceRunId,
          },
        },
      }
    );
  } catch (auditError) {
    console.error('approval audit failed', auditError);
  }

  return res.status(200).json({ ok: true, approvalId: approval.id });
};
