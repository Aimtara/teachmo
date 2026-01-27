import crypto from 'crypto';
import { hasuraRequest } from './lib/hasura.js';

const allowedRoles = new Set(['parent', 'teacher', 'school_admin', 'district_admin', 'admin', 'system_admin']);

function selectModel({ modelPreference, priority }) {
  if (modelPreference) return modelPreference;
  if (priority === 'high') return 'gpt-4o';
  if (priority === 'balanced') return 'gpt-4o-mini';
  return 'gpt-4o-mini';
}

function sha256(value) {
  return crypto.createHash('sha256').update(value ?? '').digest('hex');
}

export default async function invokeLLM(req, res) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const role = String(req.headers['x-hasura-role'] ?? '');
  const actorId = String(req.headers['x-hasura-user-id'] ?? '');
  const districtId = req.headers['x-hasura-district-id'] ? String(req.headers['x-hasura-district-id']) : null;
  const schoolId = req.headers['x-hasura-school-id'] ? String(req.headers['x-hasura-school-id']) : null;

  if (!actorId || !allowedRoles.has(role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const { prompt, messages, priority, modelPreference, requiresReview, reviewReason, metadata } = req.body ?? {};
  const promptMessages = Array.isArray(messages) && messages.length
    ? messages
    : [{ role: 'user', content: String(prompt ?? '') }];

  if (!promptMessages[0]?.content) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const model = selectModel({ modelPreference, priority });

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: promptMessages,
      temperature: 0.3,
    }),
  });

  if (!openaiResponse.ok) {
    const errorPayload = await openaiResponse.text();
    return res.status(500).json({ error: 'OpenAI request failed', details: errorPayload });
  }

  const completion = await openaiResponse.json();
  const responseText = completion?.choices?.[0]?.message?.content ?? '';

  const promptHash = sha256(JSON.stringify(promptMessages));
  const responseHash = sha256(responseText);
  const flagged = Boolean(requiresReview || completion?.usage?.total_tokens > 2000);

  const logMutation = `mutation LogUsage($object: ai_usage_logs_insert_input!) {
    insert_ai_usage_logs_one(object: $object) { id }
  }`;

  const logData = await hasuraRequest({
    query: logMutation,
    variables: {
      object: {
        district_id: districtId,
        school_id: schoolId,
        actor_id: actorId,
        model,
        prompt_hash: promptHash,
        response_hash: responseHash,
        status: 'logged',
        flagged,
        metadata: {
          ...metadata,
          priority: priority ?? null,
          review_reason: reviewReason ?? null,
        },
      },
    },
  });

  const usageId = logData?.insert_ai_usage_logs_one?.id;

  if (flagged && usageId) {
    const queueMutation = `mutation QueueReview($object: ai_review_queue_insert_input!) {
      insert_ai_review_queue_one(object: $object) { id }
    }`;

    await hasuraRequest({
      query: queueMutation,
      variables: {
        object: {
          usage_log_id: usageId,
          district_id: districtId,
          school_id: schoolId,
          status: 'pending',
          reason: reviewReason ?? 'Flagged by policy',
        },
      },
    });
  }

  return res.status(200).json({
    model,
    response: responseText,
    usageId,
    flagged,
  });
}
