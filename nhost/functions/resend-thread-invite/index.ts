import crypto from 'crypto';
import { sendEmail } from '../_shared/email';
import { enforceInviteRateLimits } from '../_shared/rateLimit';
import { assertScope, getEffectiveScopes } from '../_shared/scopes/resolveScopes';

const allowedRoles = new Set(['teacher', 'school_admin', 'district_admin', 'admin', 'system_admin']);
const DAY_MS = 24 * 60 * 60 * 1000;

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!actorId || !allowedRoles.has(role)) return res.status(403).json({ ok: false });

  const { inviteId } = req.body ?? {};
  if (!inviteId) return res.status(400).json({ ok: false, reason: 'invite_required' });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  const APP_BASE_URL = process.env.APP_BASE_URL;
  const INVITE_TTL_DAYS = Number(process.env.INVITE_TTL_DAYS ?? 7);

  if (!HASURA_URL || !ADMIN_SECRET || !APP_BASE_URL) return res.status(500).json({ ok: false });

  const baseUrl = APP_BASE_URL.replace(/\/$/, '');
  const nowIso = new Date().toISOString();

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

  const isAdminRole = role === 'admin' || role === 'district_admin' || role === 'system_admin' || role === 'school_admin';

  try {
    const inviteResp = await hasura(
      `query Invite($id: uuid!) {
        invite: message_thread_invites_by_pk(id: $id) {
          id
          thread_id
          invited_by
          email
          expires_at
          accepted_at
          revoked_at
        }
      }`,
      { id: inviteId }
    );

    const invite = inviteResp?.data?.invite ?? null;
    if (!invite?.id) return res.status(404).json({ ok: false });
    const inviteEmail = String(invite.email ?? '').trim();
    if (!inviteEmail) return res.status(400).json({ ok: false, reason: 'invite_email_missing' });

    if (invite.accepted_at || invite.revoked_at) return res.status(400).json({ ok: false, reason: 'invite_closed' });
    if (new Date(invite.expires_at).getTime() <= Date.now())
      return res.status(400).json({ ok: false, reason: 'invite_expired' });

    const threadResp = await hasura(
      `query Thread($id: uuid!) { message_threads_by_pk(id: $id) { id created_by title school_id district_id } }`,
      { id: invite.thread_id }
    );

    const thread = threadResp?.data?.message_threads_by_pk ?? null;
    if (!thread?.id) return res.status(404).json({ ok: false });

    if (!isAdminRole && String(thread.created_by) !== actorId) return res.status(403).json({ ok: false });

    const scopes = await getEffectiveScopes({ hasura, districtId: thread.district_id, schoolId: thread.school_id });
    assertScope(scopes, 'messaging.sendInvites', true);
    assertScope(scopes, 'messaging.useEmail', true);

    const rateLimit = await enforceInviteRateLimits(hasura, actorId, 1);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        ok: false,
        reason: 'rate_limited',
        windowSeconds: rateLimit.window?.windowSeconds,
        limit: rateLimit.window?.limit,
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * DAY_MS).toISOString();
    const inviteUrl = `${baseUrl}/accept-invite?token=${rawToken}`;

    await sendEmail({
      to: inviteEmail,
      subject: 'Your Teachmo invite has been refreshed',
      html: `<p>Your invitation link has been refreshed.</p><p><a href="${inviteUrl}">Accept your invite</a> to join.</p>`,
      text: `Your invitation link has been refreshed. Accept your invite: ${inviteUrl}`,
    });

    const updateResp = await hasura(
      `mutation UpdateInvite($id: uuid!, $token: String!, $expiresAt: timestamptz!, $sentAt: timestamptz!) {
        update_message_thread_invites_by_pk(
          pk_columns: { id: $id },
          _set: { token_hash: $token, expires_at: $expiresAt, last_sent_at: $sentAt },
          _inc: { send_count: 1 }
        ) {
          id
          send_count
        }
      }`,
      { id: inviteId, token: tokenHash, expiresAt, sentAt: nowIso }
    );

    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: actorId,
            action: 'invites:resend',
            entity_type: 'message_thread',
            entity_id: invite.thread_id,
            metadata: {
              threadId: invite.thread_id,
              inviteId,
              sendCount: updateResp?.data?.update_message_thread_invites_by_pk?.send_count ?? null,
            },
          },
        }
      );
    } catch (error) {
      console.warn('resend-thread-invite audit failed', error);
    }

    return res.status(200).json({ ok: true, inviteId, expiresAt });
  } catch (error) {
    console.error('resend-thread-invite failed', error);
    return res.status(500).json({ ok: false });
  }
};
