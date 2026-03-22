/* eslint-env node */

import crypto from 'crypto';
import { query } from '../db.js';
import { evaluateFlag, mergeOverridesByKey } from '../utils/featureFlags.js';
import { evaluatePolicy, recordGovernanceDecision } from '../ai/policyEngine.js';

const GOVERNANCE_FLAG = 'ENTERPRISE_AI_GOVERNANCE';

export function normalizeFlagOverride(rawOverride) {
  if (!rawOverride) return null;
  return {
    ...rawOverride,
    rolloutPercentage:
      rawOverride.rolloutPercentage ?? rawOverride.rollout_percentage ?? null,
    canaryPercentage:
      rawOverride.canaryPercentage ?? rawOverride.canary_percentage ?? null,
  };
}

async function isGovernanceEnabled(req) {
  try {
    const organizationId = req.auth?.organizationId || req.tenant?.organizationId;
    const schoolId = req.auth?.schoolId || req.tenant?.schoolId;

    if (!organizationId) return false;

    const { rows } = await query(
      `select key, enabled, school_id, rollout_percentage, canary_percentage, allowlist, denylist
       from public.feature_flags
       where key = $1 and organization_id = $2 and (school_id is null or school_id = $3)`,
      [GOVERNANCE_FLAG, organizationId, schoolId ?? null]
    );

    const overrides = mergeOverridesByKey(rows, schoolId);
    const override = normalizeFlagOverride(overrides[GOVERNANCE_FLAG]);
    return evaluateFlag({
      key: GOVERNANCE_FLAG,
      context: req.auth || {},
      override,
    });
  } catch {
    return false;
  }
}

function classifyIntent(req) {
  const body = req.body || {};
  const explicitIntent = body.intent || body.route || body.action || null;
  if (explicitIntent) return explicitIntent;

  const text = String(body.prompt || body.text || '').toLowerCase();

  if (/\b(submit.*(event|resource|offer)|(event|resource|offer).*submit)\b/.test(text)) {
    return 'submit_event';
  }
  if (/\b(event|activity|activities|discover|explore|library)\b/.test(text)) {
    return 'EXPLORE_DEEP_LINK';
  }
  if (/\b(school.*(participation|request|join|enrol))\b/.test(text)) {
    return 'school_request';
  }
  if (/\b(homework|study|parenting|coach)\b/.test(text)) {
    return 'HOMEWORK_HELP';
  }

  return null;
}

function detectChildData(req) {
  const body = req.body || {};
  return Boolean(body.childId || body.child_id || body.context?.childId);
}

function extractConsentScope(req) {
  const auth = req.auth || {};

  // Prefer explicit consentScope if provided on the auth context
  if (Array.isArray(auth.consentScope)) return auth.consentScope;
  if (typeof auth.consentScope === 'string') {
    return auth.consentScope.split(',').filter(Boolean);
  }

  // Fallback: derive consent scope from general auth scopes
  if (Array.isArray(auth.scopes)) {
    return auth.scopes;
  }
  if (typeof auth.scopes === 'string') {
    return auth.scopes.split(',').filter(Boolean);
  }
  return [];
}

export async function preRequestHook(req, res, next) {
  try {
    const enabled = await isGovernanceEnabled(req);
    if (!enabled) {
      req.governanceEnabled = false;
      return next();
    }

    const incomingRequestId = req.get('x-request-id');
    const requestId = incomingRequestId || crypto.randomUUID();
    if (!incomingRequestId) {
      res.setHeader('x-request-id', requestId);
    }
    const auth = req.auth || {};
    const tenant = req.tenant || {};

    const parseGuardianVerified = (value) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y') {
          return true;
        }
        if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'n' || normalized === '') {
          return false;
        }
      }
      if (typeof value === 'number') {
        return value === 1;
      }
      return false;
    };

    const ctx = {
      requestId,
      role: auth.role || 'UNKNOWN',
      intent: classifyIntent(req),
      hasChildData: detectChildData(req),
      consentScope: extractConsentScope(req),
      guardianVerified: parseGuardianVerified(auth.guardianVerified),
      safetyEscalate: Boolean(req.body?.safetyEscalate),
      action: req.body?.action || null,
      authContext: auth,
      tenantContext: tenant,
    };

    const decision = await evaluatePolicy(ctx);
    req.governanceEnabled = true;
    req.governanceDecision = decision;
    req.governanceContext = ctx;

    if (decision.requiresAuditEvent) {
      try {
        await recordGovernanceDecision({
          decision,
          actorId: auth.userId ?? null,
          organizationId: auth.organizationId || tenant.organizationId || null,
          schoolId: auth.schoolId || tenant.schoolId || null,
        });
        req.governanceAuditRecorded = true;
      } catch {
        req.governanceAuditRecorded = false;
      }
    } else {
      req.governanceAuditRecorded = true;
    }

    return next();
  } catch {
    req.governanceEnabled = false;
    req.governanceDecision = null;
    req.governanceContext = null;
    req.governanceAuditRecorded = false;
    return next();
  }
}
