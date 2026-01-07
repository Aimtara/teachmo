/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAnyScope } from '../middleware/permissions.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('routes.scim');

const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group';

const ROLE_ORDER = [
  'system_admin',
  'district_admin',
  'school_admin',
  'admin',
  'teacher',
  'parent',
  'partner',
];

function normalizeGroupKey(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

function resolveRoleFromGroups(groups = []) {
  const candidates = groups
    .flatMap((group) => [group?.display, group?.value])
    .map(normalizeGroupKey)
    .filter(Boolean);
  return ROLE_ORDER.find((role) => candidates.includes(role)) || null;
}

function resolveUserName(payload) {
  const direct = payload?.userName || payload?.user_name;
  if (direct) return String(direct).trim();
  const email = payload?.emails?.[0]?.value;
  if (email) return String(email).trim();
  return null;
}

function resolveDisplayName(payload) {
  return (
    payload?.displayName ||
    payload?.name?.formatted ||
    payload?.name?.givenName ||
    payload?.name?.familyName ||
    null
  );
}

function scimMeta(resourceType, id) {
  return {
    resourceType,
    location: id ? `/scim/v2/${resourceType === 'User' ? 'Users' : 'Groups'}/${id}` : undefined,
  };
}

function scimUserResource(user, profile, identity, groups) {
  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    externalId: identity?.external_id ?? null,
    userName: user.email,
    displayName: profile?.full_name || user.display_name || user.email,
    active: user.disabled ? false : true,
    groups: groups.map((group) => ({
      value: group.id,
      display: group.display_name,
    })),
    meta: scimMeta('User', user.id),
  };
}

function scimGroupResource(group, members) {
  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: group.id,
    externalId: group.external_id,
    displayName: group.display_name,
    members: members.map((member) => ({ value: member.user_id })),
    meta: scimMeta('Group', group.id),
  };
}

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    logger.error('Database error', error);
    res.status(500).json({ detail: error.message, status: 500, scimType: 'serverError' });
    return null;
  }
}

async function findUserByExternalId({ organizationId, schoolId, externalId }) {
  if (!externalId) return null;
  const result = await query(
    `select user_id, external_id
     from public.scim_identities
     where organization_id = $1
       and school_id is not distinct from $2
       and external_id = $3
     limit 1`,
    [organizationId, schoolId ?? null, externalId]
  );
  return result.rows?.[0] || null;
}

async function findUserByUserName({ organizationId, schoolId, userName }) {
  if (!userName) return null;
  const result = await query(
    `select u.id, u.email, u.display_name, u.disabled,
            p.role, p.district_id, p.school_id, p.full_name
     from auth.users u
     join public.user_profiles p on p.user_id = u.id
     where lower(u.email) = lower($1)
       and p.district_id = $2
       and (p.school_id is null or p.school_id = $3)
     limit 1`,
    [userName, organizationId, schoolId ?? null]
  );
  return result.rows?.[0] || null;
}

async function findUserById({ organizationId, schoolId, userId }) {
  const result = await query(
    `select u.id, u.email, u.display_name, u.disabled,
            p.role, p.district_id, p.school_id, p.full_name
     from auth.users u
     join public.user_profiles p on p.user_id = u.id
     where u.id = $1
       and p.district_id = $2
       and (p.school_id is null or p.school_id = $3)
     limit 1`,
    [userId, organizationId, schoolId ?? null]
  );
  return result.rows?.[0] || null;
}

async function loadUserWithGroups({ organizationId, schoolId, userId }) {
  const user = await findUserById({ organizationId, schoolId, userId });
  if (!user) return null;
  const identityResult = await query(
    `select external_id
     from public.scim_identities
     where organization_id = $1
       and school_id is not distinct from $2
       and user_id = $3
     limit 1`,
    [organizationId, schoolId ?? null, userId]
  );
  const groupsResult = await query(
    `select g.id, g.display_name
     from public.scim_group_members gm
     join public.scim_groups g on g.id = gm.group_id
     where gm.user_id = $1
       and g.organization_id = $2
       and g.school_id is not distinct from $3`,
    [userId, organizationId, schoolId ?? null]
  );
  return {
    user,
    identity: identityResult.rows?.[0] || null,
    groups: groupsResult.rows || [],
  };
}

async function syncUserProfile({
  userId,
  organizationId,
  schoolId,
  role,
  fullName,
}) {
  await query(
    `insert into public.user_profiles (user_id, role, district_id, school_id, full_name)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id)
     do update set
       role = excluded.role,
       district_id = excluded.district_id,
       school_id = excluded.school_id,
       full_name = excluded.full_name,
       updated_at = now()`,
    [userId, role, organizationId, schoolId ?? null, fullName ?? null]
  );
}

async function syncScimIdentity({ userId, organizationId, schoolId, externalId }) {
  if (!externalId) return;
  await query(
    `insert into public.scim_identities (user_id, organization_id, school_id, external_id)
     values ($1, $2, $3, $4)
     on conflict (organization_id, school_id, external_id)
     do update set user_id = excluded.user_id, updated_at = now()`,
    [userId, organizationId, schoolId ?? null, externalId]
  );
}

async function replaceGroupMemberships({ organizationId, schoolId, groupId, members }) {
  await query(
    `delete from public.scim_group_members
     where group_id = $1`,
    [groupId]
  );
  if (!members.length) return;
  const values = members
    .map((_, idx) => `($1, $${idx + 2})`)
    .join(',');
  const params = [groupId, ...members];
  await query(
    `insert into public.scim_group_members (group_id, user_id)
     values ${values}
     on conflict do nothing`,
    params
  );

  const groupResult = await query(
    `select display_name
     from public.scim_groups
     where id = $1 and organization_id = $2 and school_id is not distinct from $3`,
    [groupId, organizationId, schoolId ?? null]
  );
  const groupName = groupResult.rows?.[0]?.display_name;
  const role = resolveRoleFromGroups([{ display: groupName }]);
  if (role) {
    await query(
      `update public.user_profiles
       set role = $1, updated_at = now()
       where user_id = any($2::uuid[])
         and district_id = $3
         and (school_id is null or school_id = $4)`,
      [role, members, organizationId, schoolId ?? null]
    );
  }
}

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAnyScope(['directory:manage', 'users:manage', 'tenant:manage']));

router.get('/Users/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const record = await safeQuery(
    res,
    `select u.id, u.email, u.display_name, u.disabled,
            p.role, p.district_id, p.school_id, p.full_name
     from auth.users u
     join public.user_profiles p on p.user_id = u.id
     where u.id = $1
       and p.district_id = $2
       and (p.school_id is null or p.school_id = $3)
     limit 1`,
    [req.params.id, organizationId, schoolId ?? null]
  );
  if (!record) return;
  const user = record.rows?.[0];
  if (!user) return res.status(404).json({ status: 404, scimType: 'notFound' });

  const scoped = await loadUserWithGroups({ organizationId, schoolId, userId: user.id });
  if (!scoped) return res.status(404).json({ status: 404, scimType: 'notFound' });
  return res.json(scimUserResource(scoped.user, scoped.user, scoped.identity, scoped.groups));
});

router.post('/Users', async (req, res) => {
  const payload = req.body || {};
  const { organizationId, schoolId } = req.tenant;
  const externalId = payload.externalId ? String(payload.externalId) : null;
  const userName = resolveUserName(payload);
  if (!userName) return res.status(400).json({ status: 400, scimType: 'invalidValue', detail: 'userName required' });

  const displayName = resolveDisplayName(payload) || userName;
  const active = payload.active !== false;
  const role = resolveRoleFromGroups(payload.groups) || 'parent';

  const identity = externalId
    ? await findUserByExternalId({ organizationId, schoolId, externalId })
    : null;
  let userRecord = null;
  if (identity?.user_id) {
    userRecord = await findUserById({ organizationId, schoolId, userId: identity.user_id });
  }
  if (!userRecord) {
    userRecord = await findUserByUserName({ organizationId, schoolId, userName });
  }

  let userId = userRecord?.id;
  if (!userId) {
    const created = await safeQuery(
      res,
      `insert into auth.users (email, display_name, disabled)
       values ($1, $2, $3)
       returning id, email, display_name, disabled`,
      [userName, displayName, !active]
    );
    if (!created) return;
    userId = created.rows?.[0]?.id;
    userRecord = created.rows?.[0];
  } else {
    await safeQuery(
      res,
      `update auth.users
       set email = $2,
           display_name = $3,
           disabled = $4
       where id = $1`,
      [userId, userName, displayName, !active]
    );
  }

  await syncUserProfile({
    userId,
    organizationId,
    schoolId,
    role,
    fullName: displayName,
  });
  await syncScimIdentity({ userId, organizationId, schoolId, externalId });

  if (Array.isArray(payload.groups)) {
    const groupIds = payload.groups
      .map((group) => group?.value)
      .filter(Boolean);
    for (const groupId of groupIds) {
      await query(
        `insert into public.scim_group_members (group_id, user_id)
         select id, $2
         from public.scim_groups
         where id = $1 and organization_id = $3 and school_id is not distinct from $4
         on conflict do nothing`,
        [groupId, userId, organizationId, schoolId ?? null]
      );
    }
  }

  const scoped = await loadUserWithGroups({ organizationId, schoolId, userId });
  if (!scoped) return res.status(404).json({ status: 404, scimType: 'notFound' });
  return res.status(201).json(scimUserResource(scoped.user, scoped.user, scoped.identity, scoped.groups));
});

router.put('/Users/:id', async (req, res) => {
  const payload = req.body || {};
  const { organizationId, schoolId } = req.tenant;
  const userId = req.params.id;
  const userRecord = await findUserById({ organizationId, schoolId, userId });
  if (!userRecord) return res.status(404).json({ status: 404, scimType: 'notFound' });

  const externalId = payload.externalId ? String(payload.externalId) : null;
  const userName = resolveUserName(payload) || userRecord.email;
  const displayName = resolveDisplayName(payload) || userRecord.full_name || userRecord.display_name || userName;
  const active = payload.active !== false;
  const role = resolveRoleFromGroups(payload.groups) || userRecord.role || 'parent';

  await safeQuery(
    res,
    `update auth.users
     set email = $2,
         display_name = $3,
         disabled = $4
     where id = $1`,
    [userId, userName, displayName, !active]
  );

  await syncUserProfile({
    userId,
    organizationId,
    schoolId,
    role,
    fullName: displayName,
  });
  await syncScimIdentity({ userId, organizationId, schoolId, externalId });

  if (Array.isArray(payload.groups)) {
    const groupIds = payload.groups
      .map((group) => group?.value)
      .filter(Boolean);
    const existingGroups = await query(
      `select g.id
       from public.scim_groups g
       where g.id = any($1::uuid[])
         and g.organization_id = $2
         and g.school_id is not distinct from $3`,
      [groupIds, organizationId, schoolId ?? null]
    );
    await query(`delete from public.scim_group_members where user_id = $1`, [userId]);
    for (const group of existingGroups.rows || []) {
      await query(
        `insert into public.scim_group_members (group_id, user_id)
         values ($1, $2)
         on conflict do nothing`,
        [group.id, userId]
      );
    }
  }

  const scoped = await loadUserWithGroups({ organizationId, schoolId, userId });
  if (!scoped) return res.status(404).json({ status: 404, scimType: 'notFound' });
  return res.json(scimUserResource(scoped.user, scoped.user, scoped.identity, scoped.groups));
});

router.patch('/Users/:id', async (req, res) => {
  const payload = req.body || {};
  const { organizationId, schoolId } = req.tenant;
  const userId = req.params.id;
  const userRecord = await findUserById({ organizationId, schoolId, userId });
  if (!userRecord) return res.status(404).json({ status: 404, scimType: 'notFound' });

  let active = payload.active;
  if (payload.Operations && Array.isArray(payload.Operations)) {
    const op = payload.Operations.find((operation) => operation?.path === 'active');
    if (op && typeof op.value === 'boolean') active = op.value;
  }

  if (typeof active === 'boolean') {
    await safeQuery(
      res,
      `update auth.users
       set disabled = $2
       where id = $1`,
      [userId, !active]
    );
  }

  const scoped = await loadUserWithGroups({ organizationId, schoolId, userId });
  if (!scoped) return res.status(404).json({ status: 404, scimType: 'notFound' });
  return res.json(scimUserResource(scoped.user, scoped.user, scoped.identity, scoped.groups));
});

router.delete('/Users/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const userId = req.params.id;
  const userRecord = await findUserById({ organizationId, schoolId, userId });
  if (!userRecord) return res.status(404).json({ status: 404, scimType: 'notFound' });

  await safeQuery(
    res,
    `delete from public.scim_group_members gm
     using public.scim_groups g
     where gm.group_id = g.id
       and gm.user_id = $1
       and g.organization_id = $2
       and g.school_id is not distinct from $3`,
    [userId, organizationId, schoolId ?? null]
  );

  await safeQuery(
    res,
    `delete from public.scim_identities
     where user_id = $1
       and organization_id = $2
       and school_id is not distinct from $3`,
    [userId, organizationId, schoolId ?? null]
  );

  await safeQuery(
    res,
    `update auth.users
     set disabled = true
     where id = $1`,
    [userId]
  );

  return res.status(204).send();
});

router.get('/Groups/:id', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const groupResult = await safeQuery(
    res,
    `select id, external_id, display_name
     from public.scim_groups
     where id = $1
       and organization_id = $2
       and school_id is not distinct from $3
     limit 1`,
    [req.params.id, organizationId, schoolId ?? null]
  );
  if (!groupResult) return;
  const group = groupResult.rows?.[0];
  if (!group) return res.status(404).json({ status: 404, scimType: 'notFound' });

  const members = await safeQuery(
    res,
    `select user_id
     from public.scim_group_members
     where group_id = $1`,
    [group.id]
  );
  if (!members) return;
  return res.json(scimGroupResource(group, members.rows || []));
});

router.post('/Groups', async (req, res) => {
  const payload = req.body || {};
  const { organizationId, schoolId } = req.tenant;
  const displayName = payload.displayName ? String(payload.displayName).trim() : null;
  if (!displayName) {
    return res.status(400).json({ status: 400, scimType: 'invalidValue', detail: 'displayName required' });
  }
  const externalId = payload.externalId ? String(payload.externalId) : null;
  const existing = await safeQuery(
    res,
    `select id, external_id, display_name
     from public.scim_groups
     where organization_id = $1
       and school_id is not distinct from $2
       and (external_id = $3 or display_name = $4)
     limit 1`,
    [organizationId, schoolId ?? null, externalId, displayName]
  );
  if (!existing) return;
  let group = existing.rows?.[0];
  if (!group) {
    const created = await safeQuery(
      res,
      `insert into public.scim_groups (organization_id, school_id, external_id, display_name)
       values ($1, $2, $3, $4)
       returning id, external_id, display_name`,
      [organizationId, schoolId ?? null, externalId, displayName]
    );
    if (!created) return;
    group = created.rows?.[0];
  } else {
    await safeQuery(
      res,
      `update public.scim_groups
       set display_name = $2, external_id = $3, updated_at = now()
       where id = $1`,
      [group.id, displayName, externalId]
    );
    group = { ...group, display_name: displayName, external_id: externalId };
  }

  const members = Array.isArray(payload.members)
    ? payload.members.map((m) => m?.value).filter(Boolean)
    : [];
  await replaceGroupMemberships({ organizationId, schoolId, groupId: group.id, members });
  return res.status(201).json(scimGroupResource(group, members.map((user_id) => ({ user_id }))));
});

router.put('/Groups/:id', async (req, res) => {
  const payload = req.body || {};
  const { organizationId, schoolId } = req.tenant;
  const displayName = payload.displayName ? String(payload.displayName).trim() : null;
  if (!displayName) {
    return res.status(400).json({ status: 400, scimType: 'invalidValue', detail: 'displayName required' });
  }
  const externalId = payload.externalId ? String(payload.externalId) : null;
  const updated = await safeQuery(
    res,
    `update public.scim_groups
     set display_name = $2, external_id = $3, updated_at = now()
     where id = $1
       and organization_id = $4
       and school_id is not distinct from $5
     returning id, external_id, display_name`,
    [req.params.id, displayName, externalId, organizationId, schoolId ?? null]
  );
  if (!updated) return;
  const group = updated.rows?.[0];
  if (!group) return res.status(404).json({ status: 404, scimType: 'notFound' });

  const members = Array.isArray(payload.members)
    ? payload.members.map((m) => m?.value).filter(Boolean)
    : [];
  await replaceGroupMemberships({ organizationId, schoolId, groupId: group.id, members });
  return res.json(scimGroupResource(group, members.map((user_id) => ({ user_id }))));
});

export default router;
