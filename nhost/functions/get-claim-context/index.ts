import type { Request, Response } from 'express';
import { createLogger } from '../_shared/logger';
import { constantTimeEqual, hashToken } from '../_shared/security/tokens';

const logger = createLogger('get-claim-context');

function maskEmail(email?: string | null) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';

  const maskedLocal = local.length <= 1 ? `${local || '*'}***` : `${local[0]}***`;
  const domainParts = domain.split('.');
  const domainRoot = domainParts[0] ?? '';
  const domainMask = domainRoot ? `${domainRoot[0]}***` : '***';
  const tld = domainParts.slice(1).join('.');

  return `${maskedLocal}@${domainMask}${tld ? `.${tld}` : ''}`;
}

export default async (req: Request, res: Response) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { token } = req.body ?? {};
  const rawToken = String(token ?? '').trim();
  if (!rawToken) return res.status(400).json({ ok: false, reason: 'token_required' });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

  async function hasura(query: string, variables?: Record<string, unknown>) {
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

  try {
    const tokenHash = hashToken(rawToken);
    const resp = await hasura(
      `query Invite($hash: String!) {
        invites(where: { token_hash: { _eq: $hash } }, order_by: { created_at: desc }, limit: 1) {
          id
          email
          status
          expires_at
          school_id
          district_id
          token_hash
        }
      }`,
      { hash: tokenHash }
    );

    const invite = resp?.data?.invites?.[0] ?? null;
    if (!invite?.id || !constantTimeEqual(invite.token_hash, tokenHash)) {
      return res.status(404).json({ ok: false, valid: false });
    }

    const expiresAt = invite.expires_at ? new Date(invite.expires_at).getTime() : 0;
    const valid = (invite.status === 'pending' || invite.status === 'sent') && expiresAt > Date.now();

    return res.status(200).json({
      ok: true,
      valid,
      email: maskEmail(invite.email),
      schoolId: invite.school_id,
      districtId: invite.district_id ?? null,
      status: invite.status,
      expiresAt: invite.expires_at,
    });
  } catch (error) {
    logger.error('request failed', error);
    const message = error instanceof Error ? error.message : 'failed';
    return res.status(500).json({ ok: false, reason: message });
  }
};
