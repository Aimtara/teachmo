/* eslint-env node */

import { query } from '../db.js';
import { evaluateFlag, mergeOverridesByKey } from '../utils/featureFlags.js';

const TOOL_FLAG = 'AI_TOOL_GOVERNANCE';

async function isToolGovernanceEnabled(req) {
  try {
    const organizationId = req.auth?.organizationId || req.tenant?.organizationId;
    const schoolId = req.auth?.schoolId || req.tenant?.schoolId;
    if (!organizationId) return false;

    const { rows } = await query(
      `select key, enabled, school_id, rollout_percentage, canary_percentage, allowlist, denylist
       from public.feature_flags
       where key = $1 and organization_id = $2 and (school_id is null or school_id = $3)`,
      [TOOL_FLAG, organizationId, schoolId ?? null]
    );

    const overrides = mergeOverridesByKey(rows, schoolId);
    return evaluateFlag({
      key: TOOL_FLAG,
      context: req.auth || {},
      override: overrides[TOOL_FLAG],
    });
  } catch {
    return false;
  }
}

export async function preToolGovernance(req, res, next) {
  req.toolGovernanceEnabled = await isToolGovernanceEnabled(req);
  return next();
}
