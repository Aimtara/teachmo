import { constantTimeEqual, hashToken } from '../_shared/security/tokens';

type InviteRecord = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  school_id: string;
  district_id?: string | null;
  token_hash: string;
};

export default async (req: any, res: any) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const userId = String(req.headers['x-hasura-user-id'] ?? '');
  if (!userId) return res.status(401).json({ ok: false });

  const { token } = req.body ?? {};
  const rawToken = String(token ?? '').trim();
  if (!rawToken) return res.status(400).json({ ok: false, reason: 'token_required' });

  const HASURA_URL = process.env.HASURA_GRAPHQL_ENDPOINT;
  const ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  if (!HASURA_URL || !ADMIN_SECRET) return res.status(500).json({ ok: false });

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

  async function writeAudit(inviteId: string, schoolId: string) {
    try {
      await hasura(
        `mutation Audit($object: audit_log_insert_input!) {
          insert_audit_log_one(object: $object) { id }
        }`,
        {
          object: {
            actor_id: userId,
            action: 'invites:claim',
            entity_type: 'invite',
            entity_id: inviteId,
            metadata: { inviteId, schoolId },
          },
        }
      );
    } catch (error) {
      console.warn('claim-invite audit failed', error);
    }
  }

  try {
    const userResp = await hasura(
      `query User($id: uuid!) {
        user: auth_users_by_pk(id: $id) { id email }
        profile: user_profiles_by_pk(user_id: $id) { role school_id district_id }
      }`,
      { id: userId }
    );

    const userEmail = String(userResp?.data?.user?.email ?? '').trim().toLowerCase();
    if (!userEmail) return res.status(400).json({ ok: false, reason: 'email_required' });

    const tokenHash = hashToken(rawToken);
    const inviteResp = await hasura(
      `query Invite($hash: String!) {
        invites(where: { token_hash: { _eq: $hash } }, order_by: { created_at: desc }, limit: 1) {
          id
          email
          role
          status
          expires_at
          school_id
          district_id
          token_hash
        }
      }`,
      { hash: tokenHash }
    );

    const invite: InviteRecord | null = inviteResp?.data?.invites?.[0] ?? null;
    if (!invite?.id || !constantTimeEqual(invite.token_hash, tokenHash)) {
      return res.status(404).json({ ok: false, reason: 'invalid_invite' });
    }

    const expiresAt = invite.expires_at ? new Date(invite.expires_at).getTime() : 0;
    if ((invite.status !== 'pending' && invite.status !== 'sent') || expiresAt <= Date.now()) {
      return res.status(400).json({ ok: false, reason: 'expired' });
    }

    if (userEmail !== String(invite.email ?? '').trim().toLowerCase()) {
      return res.status(403).json({ ok: false, reason: 'email_mismatch' });
    }

    const contactResp = await hasura(
      `query Contact($schoolId: uuid!, $email: citext!, $userId: uuid!) {
        contact: school_contact_directory(where: { school_id: { _eq: $schoolId }, email: { _eq: $email } }, limit: 1) {
          id
          district_id
          is_active
        }
        linkByEmail: directory_contact_links(where: { school_id: { _eq: $schoolId }, email: { _eq: $email } }, limit: 1) {
          id
          user_id
          link_status
        }
        linkByUser: directory_contact_links(where: { school_id: { _eq: $schoolId }, user_id: { _eq: $userId } }, limit: 1) {
          id
          email
          link_status
        }
      }`,
      { schoolId: invite.school_id, email: invite.email, userId }
    );

    const contact = contactResp?.data?.contact?.[0] ?? null;
    if (!contact?.id || contact.is_active === false) {
      return res.status(400).json({ ok: false, reason: 'contact_unavailable' });
    }

    const linkByEmail = contactResp?.data?.linkByEmail?.[0] ?? null;
    const linkByUser = contactResp?.data?.linkByUser?.[0] ?? null;

    if (linkByEmail?.user_id && linkByEmail.user_id !== userId && linkByEmail.link_status === 'linked') {
      return res.status(409).json({ ok: false, reason: 'already_linked' });
    }

    if (linkByUser?.email && linkByUser.email !== invite.email) {
      return res.status(409).json({ ok: false, reason: 'user_linked_elsewhere' });
    }

    const now = new Date().toISOString();
    const acceptResp = await hasura(
      `mutation Accept($id: uuid!, $now: timestamptz!) {
        update_invites(
          where: { id: { _eq: $id }, status: { _in: ["pending", "sent"] }, expires_at: { _gt: $now } },
          _set: { status: "accepted", accepted_at: $now }
        ) { affected_rows }
      }`,
      { id: invite.id, now }
    );

    if ((acceptResp?.data?.update_invites?.affected_rows ?? 0) === 0) {
      return res.status(400).json({ ok: false, reason: 'already_used' });
    }

    if (linkByEmail?.id) {
      await hasura(
        `mutation LinkExisting($id: uuid!, $userId: uuid!, $now: timestamptz!, $metadata: jsonb!) {
          update_directory_contact_links_by_pk(
            pk_columns: { id: $id },
            _set: { user_id: $userId, link_status: "linked", linked_at: $now, unlinked_at: null, metadata: $metadata }
          ) { id }
        }`,
        { id: linkByEmail.id, userId, now, metadata: { inviteId: invite.id } }
      );
    } else {
      await hasura(
        `mutation LinkContact($object: directory_contact_links_insert_input!) {
          insert_directory_contact_links_one(
            object: $object,
            on_conflict: {
              constraint: directory_contact_links_school_id_email_key,
              update_columns: [user_id, link_status, linked_at, unlinked_at, metadata]
            }
          ) { id }
        }`,
        {
          object: {
            school_id: invite.school_id,
            district_id: invite.district_id ?? contact?.district_id ?? null,
            email: invite.email,
            user_id: userId,
            link_status: 'linked',
            linked_at: now,
            metadata: { inviteId: invite.id },
          },
        }
      );
    }

    const profile = userResp?.data?.profile ?? null;
    const profileRole = profile?.role ?? invite.role ?? 'parent';
    const profileSchoolId = profile?.school_id ?? invite.school_id;
    const profileDistrictId = profile?.district_id ?? invite.district_id ?? contact?.district_id ?? null;

    await hasura(
      `mutation UpsertProfile($object: user_profiles_insert_input!) {
        insert_user_profiles_one(
          object: $object,
          on_conflict: { constraint: user_profiles_pkey, update_columns: [school_id, district_id, role, updated_at] }
        ) { user_id }
      }`,
      {
        object: {
          user_id: userId,
          role: profileRole,
          school_id: profileSchoolId,
          district_id: profileDistrictId,
          updated_at: now,
        },
      }
    );

    await writeAudit(invite.id, invite.school_id);

    return res.status(200).json({ ok: true, schoolId: invite.school_id, linked: true });
  } catch (error: any) {
    console.error('claim-invite failed', error);
    return res.status(500).json({ ok: false, reason: error?.message ?? 'failed' });
  }
};
