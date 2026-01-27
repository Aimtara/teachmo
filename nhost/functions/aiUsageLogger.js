import crypto from 'crypto';
import { hasuraRequest } from './lib/hasura.js';

const allowedRoles = new Set(['parent', 'teacher', 'school_admin', 'district_admin', 'admin', 'system_admin', 'partner']);

function sha256(value) {
  return crypto.createHash('sha256').update(value ?? '').digest('hex');
}

export default async function aiUsageLogger(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const organizationId = req.headers['x-hasura-organization-id']
    ? String(req.headers['x-hasura-organization-id'])
    : null;
  const schoolId = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;

  if (!actorId || !allowedRoles.has(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!organizationId) {
    return res.status(400).json({ error: 'Missing organization scope' });
  }

  const {
    prompt,
    response,
    tokenPrompt,
    tokenResponse,
    tokenTotal,
    safetyRiskScore,
    safetyFlags,
    model,
    metadata,
    childId,
    flagged
  } = req.body || {};

  if (!prompt || !response) {
    return res.status(400).json({ error: 'Missing prompt or response' });
  }

  const promptHash = sha256(prompt);
  const responseHash = sha256(response);
  const riskScore = Number.isFinite(safetyRiskScore) ? Number(safetyRiskScore) : null;
  const shouldFlag = Boolean(flagged) || (riskScore !== null && riskScore >= 0.7);
  const reason = Array.isArray(safetyFlags) && safetyFlags.length
    ? `Flags: ${safetyFlags.join(', ')}`
    : riskScore !== null
      ? `Risk score ${riskScore}`
      : null;

  const insertUsage = `mutation InsertAiUsage($object: ai_usage_logs_insert_input!) {
    insert_ai_usage_logs_one(object: $object) { id }
  }`;

  const usageData = await hasuraRequest({
    query: insertUsage,
    variables: {
      object: {
        organization_id: organizationId,
        school_id: schoolId,
        actor_id: actorId,
        model: model || 'unknown',
        prompt_hash: promptHash,
        response_hash: responseHash,
        status: shouldFlag ? 'flagged' : 'logged',
        flagged: shouldFlag,
        metadata: {
          ...(metadata || {}),
          tokenPrompt,
          tokenResponse,
          tokenTotal,
          safetyRiskScore: riskScore,
          safetyFlags,
          childId
        },
        payload: {
          prompt,
          response,
          tokenPrompt,
          tokenResponse,
          tokenTotal,
          safetyRiskScore: riskScore,
          safetyFlags,
          childId
        }
      }
    }
  });

  const usageLogId = usageData?.insert_ai_usage_logs_one?.id;

  if (usageLogId && shouldFlag) {
    const insertReview = `mutation InsertReviewQueue($object: ai_review_queue_insert_input!) {
      insert_ai_review_queue_one(object: $object) { id }
    }`;
    await hasuraRequest({
      query: insertReview,
      variables: {
        object: {
          usage_log_id: usageLogId,
          organization_id: organizationId,
          school_id: schoolId,
          status: 'pending',
          reason
        }
      }
    });
  }

  return res.status(200).json({ status: 'logged', id: usageLogId, flagged: shouldFlag });
}
