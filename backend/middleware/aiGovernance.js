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
  // Reuse memoized decision when available to avoid duplicate DB work per request.
  if (typeof req._governanceFlagEnabled !== 'undefined') {
    return req._governanceFlagEnabled;
  }

  try {
    const organizationId = req.auth?.organizationId || req.tenant?.organizationId;
    const schoolId = req.auth?.schoolId || req.tenant?.schoolId;

    if (!organizationId) {
      req._governanceFlagEnabled = false;
      return false;
    }

    let override = null;

    // If upstream middleware has already computed feature flag overrides for this request,
    // prefer those instead of doing another feature_flags DB round-trip.
    if (req.featureFlagOverrides && typeof req.featureFlagOverrides === 'object') {
      const cachedOverride = req.featureFlagOverrides[GOVERNANCE_FLAG];
      if (cachedOverride) {
        override = normalizeFlagOverride(cachedOverride);
      }
    }

    // Fall back to querying the database only when we don't have a cached override.
    if (!override) {
      const { rows } = await query(
        `select key, enabled, school_id, rollout_percentage, canary_percentage, allowlist, denylist
         from public.feature_flags
         where key = $1 and organization_id = $2 and (school_id is null or school_id = $3)`,
        [GOVERNANCE_FLAG, organizationId, schoolId ?? null]
      );

      const overrides = mergeOverridesByKey(rows, schoolId);
      override = normalizeFlagOverride(overrides[GOVERNANCE_FLAG]);
    }

    const enabled = evaluateFlag({
      key: GOVERNANCE_FLAG,
      context: req.auth || {},
      override,
    });

    req._governanceFlagEnabled = enabled;
    return enabled;
  } catch (error) {
    // Shadow mode: never break requests, but emit a sanitized warning so failures are observable.
    console.warn('AI governance feature flag evaluation failed; falling back to disabled.', {
      organizationId: req.auth?.organizationId || req.tenant?.organizationId,
      schoolId: req.auth?.schoolId || req.tenant?.schoolId,
      errorMessage: error && typeof error.message === 'string' ? error.message : String(error),
    });
    req._governanceFlagEnabled = false;
    return false;
  }
}

// Only client-supplied intent values in this set are accepted; all others fall
// back to server-side prompt classification to prevent intent-spoofing.
const ALLOWED_CLIENT_INTENTS = new Set([
  'EXPLORE_DEEP_LINK',
  'submit_event',
  'submit_resource',
  'submit_offer',
  'school_request',
  'school_participation',
  'HOMEWORK_HELP',
  'weekly_brief_generate',
  'office_hours_book',
]);

export function classifyIntent(req) {
  const body = req.body || {};
  const rawIntent = body.intent || body.route || body.action || null;
  const explicitIntent = typeof rawIntent === 'string' ? rawIntent : null;

  // Only trust client-supplied intent when it matches a known safe value.
  if (explicitIntent && ALLOWED_CLIENT_INTENTS.has(explicitIntent)) {
    return explicitIntent;
  }

  // Server-side classification from prompt text.
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

export function detectChildData(req) {
  const body = req.body || {};
  return Boolean(body.childId || body.child_id || body.context?.childId);
}

export function extractConsentScope(req) {
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
  return [];
}

export async function preRequestHook(req, res, next) {
  try {
    const enabled = await isGovernanceEnabled(req);
    if (!enabled) {
      req.governanceEnabled = false;
      return next();
    }

    // Prefer the request ID already set by attachRequestContext to avoid
    // re-reading and echoing back an unvalidated client-supplied header.
    const requestId = req.requestId || crypto.randomUUID();

    // Cheap early-return: skip governance when the body has no evaluable content
    // to avoid unnecessary DB work and noisy audit events.
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

    const auth = req.auth || {};
    const tenant = req.tenant || {};

    // Determine whether consent/guardian signals are present in auth context.
    // attachAuthContext does not populate guardianVerified or consentScope, so if
    // none of these signals exist we avoid activating child-data checks to prevent
    // treating "missing" signals as an explicit lack of consent.
    const hasConsentSignals =
      typeof auth.guardianVerified === 'boolean' ||
      typeof auth.consentScope === 'string' ||
      (Array.isArray(auth.scopes) && auth.scopes.includes('child_data:consent'));

    const hasChildData = hasConsentSignals ? detectChildData(req) : false;
    const consentScope = hasConsentSignals ? extractConsentScope(req) : [];
    const guardianVerified = hasConsentSignals ? auth.guardianVerified === true : false;

    const ctx = {
      requestId,
      role: auth.role || 'UNKNOWN',
      intent: classifyIntent(req),
      hasChildData,
      consentScope,
      guardianVerified,
      safetyEscalate: Boolean(body?.safetyEscalate),
      action: body?.action || null,
      authContext: auth,
      tenantContext: tenant,
    };

    const decision = await evaluatePolicy(ctx);
    req.governanceEnabled = true;
    req.governanceDecision = decision;
    req.governanceContext = ctx;

    if (decision.requiresAuditEvent) {
      // Best-effort: underlying storage may swallow errors. Use `null` to indicate
      // persistence success is unknown rather than guaranteed.
      req.governanceAuditRecorded = null;
      await recordGovernanceDecision(req, {
        decision,
        actorId: auth.userId ?? null,
        organizationId: auth.organizationId || tenant.organizationId || null,
        schoolId: auth.schoolId || tenant.schoolId || null,
      });
    } else {
      req.governanceAuditRecorded = true;
    }

    return next();
  } catch (error) {
    // Shadow mode: never break requests, but log so governance failures are observable.
    console.warn('[aiGovernance] preRequestHook evaluation failed; skipping governance.', {
      errorMessage: error && typeof error.message === 'string' ? error.message : String(error),
    });
    req.governanceEnabled = false;
    req.governanceDecision = null;
    req.governanceContext = null;
    req.governanceAuditRecorded = false;
    return next();
  }
}
