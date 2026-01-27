import express from 'express';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { requireFeatureFlag } from '../middleware/featureFlags.js';
import {
  getRegistry,
  getRegistryDefaults,
  mergeOverridesByKey,
  normalizeAdminPayload,
  resolveFlags,
  serializeAdminFlag,
} from '../utils/featureFlags.js';

const router = express.Router();
const adminRouter = express.Router();

router.get('/', async (req, res) => {
  try {
    const organizationId = req.auth?.organizationId;
    const schoolId = req.auth?.schoolId;
    if (!organizationId) {
      return res.json({ flags: getRegistryDefaults() });
    }

    const { rows } = await query(
      `select key, enabled, description, school_id, rollout_percentage, canary_percentage, allowlist, denylist
       from public.feature_flags
       where organization_id = $1 and (school_id is null or school_id = $2)`,
      [organizationId, schoolId]
    );

    const overrides = mergeOverridesByKey(rows, schoolId);
    const flags = resolveFlags({ context: req.auth, overrides });

    return res.json({ flags });
  } catch (error) {
    return res.status(500).json({ error: 'failed to resolve feature flags' });
  }
});

adminRouter.get('/', requireAdmin, requireFeatureFlag('ENTERPRISE_FEATURE_FLAGS'), async (req, res) => {
  try {
    const organizationId = req.query.organizationId || req.auth?.organizationId;
    const schoolId = req.query.schoolId || req.auth?.schoolId || null;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const { rows } = await query(
      `select key, enabled, description, school_id, rollout_percentage, canary_percentage, allowlist, denylist
       from public.feature_flags
       where organization_id = $1 and school_id is not distinct from $2`,
      [organizationId, schoolId]
    );

    const overridesByKey = rows.reduce((acc, row) => {
      acc[row.key] = row;
      return acc;
    }, {});

    const registry = getRegistry();
    const flags = registry.flags.map((flag) =>
      serializeAdminFlag({
        key: flag.key,
        override: overridesByKey[flag.key],
        scope: schoolId ? 'school' : 'organization',
      })
    );

    Object.keys(overridesByKey)
      .filter((key) => !registry.flags.find((flag) => flag.key === key))
      .forEach((key) => {
        flags.push(
          serializeAdminFlag({
            key,
            override: overridesByKey[key],
            scope: schoolId ? 'school' : 'organization',
          })
        );
      });

    return res.json({ flags });
  } catch (error) {
    return res.status(500).json({ error: 'failed to load admin feature flags' });
  }
});

adminRouter.put('/:key', requireAdmin, requireFeatureFlag('ENTERPRISE_FEATURE_FLAGS'), async (req, res) => {
  const { key } = req.params;
  const organizationId = req.body.organizationId || req.auth?.organizationId;
  const schoolId = req.body.schoolId ?? req.auth?.schoolId ?? null;

  if (!organizationId) {
    return res.status(400).json({ error: 'organizationId is required' });
  }

  const payload = normalizeAdminPayload(req.body);

  if (
    payload.rolloutPercentage !== null &&
    (payload.rolloutPercentage < 0 || payload.rolloutPercentage > 100)
  ) {
    return res.status(400).json({ error: 'rolloutPercentage must be between 0 and 100' });
  }

  if (
    payload.canaryPercentage !== null &&
    (payload.canaryPercentage < 0 || payload.canaryPercentage > 100)
  ) {
    return res.status(400).json({ error: 'canaryPercentage must be between 0 and 100' });
  }

  try {
    const { rows } = await query(
      `select id from public.feature_flags
       where organization_id = $1 and school_id is not distinct from $2 and key = $3`,
      [organizationId, schoolId, key]
    );

    let flagId = rows[0]?.id;

    if (flagId) {
      await query(
        `update public.feature_flags
         set enabled = $1,
             description = $2,
             rollout_percentage = $3,
             canary_percentage = $4,
             allowlist = $5,
             denylist = $6
         where id = $7`,
        [
          payload.enabled,
          payload.description,
          payload.rolloutPercentage,
          payload.canaryPercentage,
          payload.allowlist,
          payload.denylist,
          flagId,
        ]
      );
    } else {
      const insert = await query(
        `insert into public.feature_flags
         (organization_id, school_id, key, enabled, description, rollout_percentage, canary_percentage, allowlist, denylist)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning id`,
        [
          organizationId,
          schoolId,
          key,
          payload.enabled ?? false,
          payload.description,
          payload.rolloutPercentage,
          payload.canaryPercentage,
          payload.allowlist,
          payload.denylist,
        ]
      );
      flagId = insert.rows[0]?.id;
    }

    await query(
      `insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
       values ($1, $2, $3, $4, $5)`,
      [
        req.auth?.userId,
        'feature_flag.updated',
        'feature_flag',
        key,
        JSON.stringify({
          organizationId,
          schoolId,
          changes: payload,
        }),
      ]
    );

    return res.json({
      key,
      enabled: payload.enabled,
      description: payload.description,
      rolloutPercentage: payload.rolloutPercentage,
      canaryPercentage: payload.canaryPercentage,
      allowlist: payload.allowlist,
      denylist: payload.denylist,
      scope: schoolId ? 'school' : 'organization',
    });
  } catch (error) {
    return res.status(500).json({ error: 'failed to update feature flag' });
  }
});

export { adminRouter as featureFlagsAdminRouter, router as featureFlagsRouter };
