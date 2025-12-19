import { sendEmail } from '../_shared/email';
import { emailAllowedForSchool, getActorScope } from '../_shared/tenantScope';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';
import { generateToken, hashToken } from '../_shared/security/tokens';

const allowedRoles = new Set(['school_admin', 'district_admin', 'admin', 'system_admin']);
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeEmail(value: string | undefined | null) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeRole(value: string | undefined | null) {
  const role = String(value ?? 'parent').trim().toLowerCase();
  return role === 'teacher' || role === 'staff' ? role : 'parent';
}

function normalizeBaseUrl(value?: string | null): string {
  const trimmed = String(value ?? '').trim();
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
  const APP_BASE_URL = normalizeBaseUrl(process.env.APP_BASE_URL);
  const expiresDays = Number(process.env.INVITE_EXPIRES_DAYS ?? process.env.INVITE_TTL_DAYS ?? 7);

  if (!HASURA_URL || !ADMIN_SECRET || !APP_BASE_URL) return res.status(500).json({ ok: false });

  const { schoolId: inputSchoolId, districtId: inputDistrictId, email, role: inviteRoleRaw } = req.body ?? {};
  const schoolId = String(inputSchoolId ?? '').trim();
  const districtIdRaw = String(inputDistrictId ?? '').trim();
  const emailNormalized = normalizeEmail(email);
  const inviteRole = normalizeRole(inviteRoleRaw);

  if (!schoolId || !emailNormalized) return res.status(400).json({ ok: false, reason: 'missing_fields' });

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

  async function writeAudit(action: string, metadata: Record<string, any>) {
    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId,
            action,
            entity_type: 'invite',
            entity_id: metadata?.inviteId ?? null,
            metadata,
          },
        }
      );
    } catch (error) {
      console.warn('create-invite audit failed', error);
    }
  }

  try {
    const scope = await getActorScope(hasura, actorId);
    if (role === 'school_admin' && scope.schoolId && scope.schoolId !== schoolId) {
      return res.status(403).json({ ok: false, reason: 'scope_mismatch' });
    }

    if (role === 'district_admin' && districtIdRaw && scope.districtId && scope.districtId !== districtIdRaw) {
      return res.status(403).json({ ok: false, reason: 'scope_mismatch' });
    }

    const contactResp = await hasura(
      `query Contact($schoolId: uuid!, $email: citext!, $role: text!) {
        contact: school_contact_directory(where: { school_id: { _eq: $schoolId }, email: { _eq: $email } }, limit: 1) {
          id
          district_id
          is_active
        }
        link: directory_contact_links(where: { school_id: { _eq: $schoolId }, email: { _eq: $email } }, limit: 1) {
          id
          user_id
          link_status
        }
        invites(where: { school_id: { _eq: $schoolId }, email: { _eq: $email }, role: { _eq: $role } }, order_by: { created_at: desc }, limit: 5) {
          id
          status
          expires_at
          token_hash
        }
      }`,
      { schoolId, email: emailNormalized, role: inviteRole }
    );

    const contact = contactResp?.data?.contact?.[0] ?? null;
    if (!contact?.id) {
      return res.status(404).json({ ok: false, reason: 'contact_not_found' });
    }

    if (contact.is_active === false) {
      return res.status(400).json({ ok: false, reason: 'contact_inactive' });
    }

    const targetDistrictId = contact?.district_id ?? districtIdRaw || scope.districtId || null;
    if (role === 'district_admin' && scope.districtId && targetDistrictId && scope.districtId !== targetDistrictId) {
      return res.status(403).json({ ok: false, reason: 'scope_mismatch' });
    }

    const scopes = await getEffectiveScopes({ hasura, districtId: targetDistrictId, schoolId });
    assertScope(scopes, 'directory.email', true);
    assertScope(scopes, 'messaging.sendInvites', true);
    assertScope(scopes, 'messaging.useEmail', true);

    const isAllowed = await emailAllowedForSchool(hasura, emailNormalized, schoolId);
    if (!isAllowed) {
      return res.status(403).json({ ok: false, reason: 'not_allowed' });
    }

    const existingLink = contactResp?.data?.link?.[0] ?? null;
    if (existingLink?.link_status === 'linked') {
      return res.status(200).json({ ok: true, status: 'already_linked' });
    }

    const invites = Array.isArray(contactResp?.data?.invites) ? contactResp.data.invites : [];
    const acceptedInvite = invites.find((inv: any) => inv?.status === 'accepted');
    if (acceptedInvite?.id) {
      return res.status(200).json({ ok: true, status: 'already_accepted', inviteId: acceptedInvite.id });
    }

    let activeInvite = invites.find((inv: any) => inv?.status === 'pending' || inv?.status === 'sent') || null;
    const now = new Date();

    if (activeInvite?.expires_at && new Date(activeInvite.expires_at).getTime() <= now.getTime()) {
      try {
        await hasura(
          `mutation Expire($id: uuid!) {
            update_invites_by_pk(pk_columns: { id: $id }, _set: { status: "expired" }) { id }
          }`,
          { id: activeInvite.id }
        );
      } catch (error) {
        console.warn('create-invite expire mutation failed', error);
      }
      activeInvite = null;
    }

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(now.getTime() + Math.max(1, expiresDays || 7) * DAY_MS).toISOString();

    let inviteId = activeInvite?.id ?? '';

    if (activeInvite?.id) {
      const updateResp = await hasura(
        `mutation UpdateInvite($id: uuid!, $hash: String!, $expiresAt: timestamptz!) {
          update_invites_by_pk(
            pk_columns: { id: $id },
            _set: { token_hash: $hash, expires_at: $expiresAt, status: "pending", sent_at: null }
          ) { id }
        }`,
        { id: activeInvite.id, hash: tokenHash, expiresAt }
      );

      inviteId = updateResp?.data?.update_invites_by_pk?.id ?? activeInvite.id;
    } else {
      const insertResp = await hasura(
        `mutation CreateInvite($object: invites_insert_input!) {
          insert_invites_one(object: $object) { id }
        }`,
        {
          object: {
            school_id: schoolId,
            district_id: targetDistrictId,
            email: emailNormalized,
            role: inviteRole,
            status: 'pending',
            token_hash: tokenHash,
            expires_at: expiresAt,
            created_by: actorId,
          },
        }
      );

      inviteId = insertResp?.data?.insert_invites_one?.id ?? '';
    }

    if (!inviteId) return res.status(500).json({ ok: false });

    const claimLink = `${APP_BASE_URL}/claim?token=${encodeURIComponent(token)}`;
    const emailSubject = 'You are invited to join Teachmo';
    const emailText = `You have been invited to connect your Teachmo account.\n\nClaim your invite: ${claimLink}\n\nThis link expires on ${new Date(expiresAt).toLocaleString()}.`;
    const emailHtml = `
      <p>You have been invited to connect your Teachmo account.</p>
      <p><a href="${claimLink}">Claim your invite</a></p>
      <p>This link expires on ${new Date(expiresAt).toLocaleString()}.</p>
    `;

    await sendEmail({
      to: emailNormalized,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    await hasura(
      `mutation MarkSent($id: uuid!, $sentAt: timestamptz!) {
        update_invites_by_pk(pk_columns: { id: $id }, _set: { status: "sent", sent_at: $sentAt }) { id status }
      }`,
      { id: inviteId, sentAt: now.toISOString() }
    );

    await writeAudit('invites:create', { inviteId, schoolId, districtId: targetDistrictId, email: emailNormalized, role: inviteRole });

    return res.status(200).json({ ok: true, inviteId, status: 'sent', expiresAt });
  } catch (error: any) {
    console.error('create-invite failed', error);
    return res.status(500).json({ ok: false, reason: error?.message ?? 'failed' });
  }
};
