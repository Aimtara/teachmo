/* eslint-env node */

import crypto from 'crypto';
import { query } from '../db.js';
import { evaluateFlag, mergeOverridesByKey } from '../utils/featureFlags.js';
import { evaluatePolicy, recordGovernanceDecision } from '../ai/policyEngine.js';

const GOVERNANCE_FLAG = 'ENTERPRISE_AI_GOVERNANCE';

export function normalizeFlagOverride(rawOverride) {
  if (!rawOverride) return null;
  const normalizePercent = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.max(0, Math.min(100, numeric));
  };

  return {
    ...rawOverride,
    rolloutPercentage: normalizePercent(
      rawOverride.rolloutPercentage ?? rawOverride.rollout_percentage ?? null
    ),
    canaryPercentage: normalizePercent(
      rawOverride.canaryPercentage ?? rawOverride.canary_percentage ?? null
    ),
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
    return evaluateFlag({
      key: GOVERNANCE_FLAG,
      context: req.auth || {},
      override: overrides[GOVERNANCE_FLAG],
    });
  } catch (error) {
    // Shadow mode: never break requests, but log a sanitized warning so failures are observable.
    console.warn('AI governance feature flag evaluation failed; falling back to disabled.', {
      flagKey: GOVERNANCE_FLAG,
      organizationId: req.auth?.organizationId || req.tenant?.organizationId,
      schoolId: req.auth?.schoolId || req.tenant?.schoolId,
      errorMessage: error && typeof error.message === 'string' ? error.message : String(error),
    });
    return false;
  }
}

function classifyIntent(req) {
  const body = req.body || {};
  const explicitIntent = body.intent || body.route || body.action || null;
  if (explicitIntent) return explicitIntent;

  const text = String(body.prompt || body.text || '').toLowerCase();

  if (/\b(event|activity|activities|discover|explore|library)\b/.test(text)) {
    return 'EXPLORE_DEEP_LINK';
  }
  if (/\b(submit.*(event|resource|offer)|(event|resource|offer).*submit)\b/.test(text)) {
    return 'submit_event';
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
  if (Array.isArray(auth.consentScope)) {
    return auth.consentScope
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof auth.consentScope === 'string') {
    return auth.consentScope
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }
  if (Array.isArray(auth.consentScope)) return auth.consentScope;
  if (typeof auth.consentScope === 'string') return auth.consentScope.split(',').filter(Boolean);
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
    // Cheap early-return: if the request clearly can't be evaluated (e.g., missing prompt/messages),
    // skip governance entirely to avoid unnecessary DB work and noisy audit events.
    const body = req.body;
    const isPlainObject = body && typeof body === 'object' && !Array.isArray(body);
    const hasPrompt = isPlainObject && typeof body.prompt === 'string' && body.prompt.trim().length > 0;
    const hasMessages = isPlainObject && Array.isArray(body.messages) && body.messages.length > 0;

    if (!body || (isPlainObject && !hasPrompt && !hasMessages)) {
      req.governanceEnabled = false;
      req.governanceDecision = null;
      req.governanceContext = null;
      req.governanceAuditRecorded = false;
      return next();
    }
    const enabled = await isGovernanceEnabled(req);
    if (!enabled) {
      req.governanceEnabled = false;
      req.governanceDecision = null;
      req.governanceContext = null;
      req.governanceAuditRecorded = false;
      return next();
    }

    const requestId = req.get('x-request-id') || crypto.randomUUID();
    const auth = req.auth || {};
    const tenant = req.tenant || {};

    const ctx = {
      requestId,
      role: auth.role || 'UNKNOWN',
      intent: classifyIntent(req),
      hasChildData: detectChildData(req),
      consentScope: extractConsentScope(req),
      guardianVerified: Boolean(auth.guardianVerified),
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
      // Best-effort: we attempt to record the governance decision, but underlying
      // storage may swallow errors. Use `null` to indicate that persistence
      // success is unknown rather than guaranteed.
      req.governanceAuditRecorded = null;
      await recordGovernanceDecision({
        decision,
        actorId: auth.userId ?? null,
        organizationId: auth.organizationId || tenant.organizationId || null,
        schoolId: auth.schoolId || tenant.schoolId || null,
      });
    } else {
      // No audit event was required, so there was nothing to persist.
      try {
        await recordGovernanceDecision({
          decision,
          actorId: auth.userId ?? null,
          organizationId: auth.organizationId || tenant.organizationId || null,
          schoolId: auth.schoolId || tenant.schoolId || null,
        });
        req.governanceAuditRecorded = true;
      } catch (error) {
        req.governanceAuditRecorded = false;
        console.warn('[aiGovernance] Failed to record governance decision', {
          requestId: ctx.requestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      req.governanceAuditRecorded = true;
    }

    return next();
  } catch (error) {
    req.governanceEnabled = false;
    req.governanceDecision = null;
    req.governanceContext = null;
    req.governanceAuditRecorded = false;
    return next();
  }
}
