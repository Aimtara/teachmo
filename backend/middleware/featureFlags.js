import { query } from '../db.js';
import { evaluateFlag, mergeOverridesByKey } from '../utils/featureFlags.js';

export function requireFeatureFlag(flagKey) {
  return async (req, res, next) => {
    try {
      const organizationId = req.auth?.organizationId;
      const schoolId = req.auth?.schoolId;

      if (!organizationId) {
        return res.status(403).json({ error: 'feature disabled' });
      }

      const { rows } = await query(
        `select key, enabled, description, school_id, rollout_percentage, canary_percentage, allowlist, denylist
         from public.feature_flags
         where key = $1 and organization_id = $2 and (school_id is null or school_id = $3)`,
        [flagKey, organizationId, schoolId]
      );

      const overrides = mergeOverridesByKey(rows, schoolId);
      const enabled = evaluateFlag({ key: flagKey, context: req.auth, override: overrides[flagKey] });

      if (!enabled) {
        return res.status(403).json({ error: 'feature disabled' });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ error: 'feature flag check failed' });
    }
  };
}
