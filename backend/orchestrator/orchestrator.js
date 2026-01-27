import crypto from 'crypto';
import { query } from '../db.js';
import { getRouteConfig } from './routeMap.js';
import { getSpecialist } from './specialists/index.js';

const SAFETY_KEYWORDS = {
  urgent: ['suicide', 'self-harm', 'kill myself', 'hurt myself', 'abuse', 'assault'],
  sensitive: ['bully', 'bullying', 'harass', 'threat', 'unsafe', 'custody']
};

const ROUTE_RULES = [
  { route: 'WEEKLY_BRIEF_GENERATE', keywords: ['weekly brief', 'weekly digest', 'what did i miss', 'missed'] },
  { route: 'HUB_THREAD_SUMMARIZE', keywords: ['summarize', 'summary', 'thread'] },
  { route: 'HUB_MESSAGE_SEND', keywords: ['message', 'text', 'email', 'tell', 'notify', 'teacher'] },
  { route: 'OFFICE_HOURS_BOOK', keywords: ['office hours', 'meeting', 'conference', 'book', 'schedule'] },
  { route: 'HOMEWORK_HELP', keywords: ['homework', 'assignment', 'worksheet', 'study'] },
  { route: 'EXPLORE_DEEP_LINK', keywords: ['event', 'activity', 'activities', 'resources', 'discover', 'explore'] }
];

function normalizeText(text) {
  return (text || '').toLowerCase().trim();
}

function detectSafety(text) {
  const normalized = normalizeText(text);
  const urgentMatches = SAFETY_KEYWORDS.urgent.filter((word) => normalized.includes(word));
  if (urgentMatches.length) {
    return { level: 'URGENT', reasons: urgentMatches };
  }
  const sensitiveMatches = SAFETY_KEYWORDS.sensitive.filter((word) => normalized.includes(word));
  if (sensitiveMatches.length) {
    return { level: 'SENSITIVE', reasons: sensitiveMatches };
  }
  return { level: 'NONE', reasons: [] };
}

function extractEntities(text) {
  const normalized = normalizeText(text);
  const entities = {};

  if (normalized.includes('math')) entities.topic = 'math';
  if (normalized.includes('reading')) entities.topic = 'reading';

  if (normalized.includes('event')) entities.category = 'events';
  if (normalized.includes('activity') || normalized.includes('activities')) entities.category = 'activities';
  if (normalized.includes('resource')) entities.category = 'resources';
  if (normalized.includes('near me')) entities.location = 'nearby';

  return entities;
}

function classifyIntent({ text }) {
  const normalized = normalizeText(text);
  for (const rule of ROUTE_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return { route: rule.route, confidence: 0.86 };
    }
  }
  return { route: 'UNKNOWN_CLARIFY', confidence: 0.35 };
}

function hashText(text) {
  if (!text) return null;
  return crypto.createHash('sha256').update(text).digest('hex');
}

function buildMissingPrompt(missing) {
  if (!missing.length) return null;
  if (missing.length === 1) {
    return {
      type: 'FOLLOWUP_QUESTION',
      title: `Which ${missing[0]} should I use?`,
      hint: 'Select from the available options.'
    };
  }
  return {
    type: 'FOLLOWUP_QUESTION',
    title: 'I need a little more info before I can proceed.',
    hint: `Missing: ${missing.join(', ')}`
  };
}

function resolveContext({ selected = {}, tenant = {}, auth = {} }) {
  return {
    childId: selected.childId || null,
    schoolId: selected.schoolId || tenant.schoolId || auth.schoolId || null,
    teacherId: selected.teacherId || null,
    threadId: selected.threadId || null,
    organizationId: tenant.organizationId || auth.organizationId || null
  };
}

function validateRequirements({ routeConfig, ctx, actorRole }) {
  const missing = (routeConfig.requiredContext || []).filter((key) => !ctx[key]);
  const allowed = (routeConfig.allowedRoles || []).includes(actorRole);
  return {
    missing,
    allowed
  };
}

async function logRun({
  requestId,
  auth,
  tenant,
  channel,
  route,
  confidence,
  inputText,
  missing,
  safety,
  latencyMs,
  success
}) {
  const { organizationId, schoolId } = tenant || {};
  const inputHash = hashText(inputText);
  await query(
    `insert into orchestrator_runs
      (request_id, organization_id, school_id, user_id, role, channel, route, confidence, input_text_hash, missing_context,
       safety_level, safety_reasons, success, latency_ms)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb,$13,$14)`,
    [
      requestId || null,
      organizationId || null,
      schoolId || null,
      auth?.userId || null,
      auth?.role || null,
      channel || null,
      route,
      confidence,
      inputHash,
      JSON.stringify({ missing }),
      safety.level,
      JSON.stringify(safety.reasons || []),
      success,
      latencyMs
    ]
  );
}

export async function runOrchestrator({ request, auth, tenant }) {
  const start = Date.now();
  const safety = detectSafety(request.text || '');
  const baseClassification = classifyIntent({ text: request.text || '' });
  const route = safety.level !== 'NONE' ? 'SAFETY_ESCALATE' : baseClassification.route;
  const confidence = safety.level !== 'NONE' ? 0.95 : baseClassification.confidence;
  const entities = extractEntities(request.text || '');
  const ctx = resolveContext({ selected: request.selected, tenant, auth });
  const routeConfig = getRouteConfig(route);
  const requirements = validateRequirements({ routeConfig, ctx, actorRole: auth?.role || request.actor?.role });
  const needsPrompt = buildMissingPrompt(requirements.missing);

  const needs = {
    missing: requirements.missing,
    promptUser: needsPrompt
  };

  let responsePayload = {
    route,
    confidence,
    safety,
    needs,
    ui: routeConfig.uiHandoff,
    response: {
      summary: '',
      nextStep: '',
      detail: null
    }
  };

  let success = false;

  if (!requirements.allowed) {
    responsePayload = {
      ...responsePayload,
      safety: { level: 'BLOCKED', reasons: ['ROLE_NOT_ALLOWED'] },
      response: {
        summary: 'This action isn’t available for your role.',
        nextStep: 'Contact your administrator if you need access.',
        detail: null
      },
      ui: {
        type: 'ERROR',
        title: 'Access restricted',
        deepLink: '/account'
      }
    };
  } else if (requirements.missing.length) {
    responsePayload = {
      ...responsePayload,
      response: {
        summary: 'I need a bit more context to continue.',
        nextStep: 'Choose the missing details.',
        detail: { missing: requirements.missing }
      }
    };
  } else {
    const specialist = getSpecialist(route);
    const result = await specialist.execute({
      ctx,
      input: { text: request.text || '', entities, safety },
      tools: {}
    });
    const formatted = specialist.formatResponse({ result, ctx, input: { text: request.text || '', entities, safety }, routeConfig });
    responsePayload = {
      route,
      confidence,
      safety,
      needs,
      ...formatted
    };
    success = true;
  }

  const latencyMs = Date.now() - start;
  try {
    await logRun({
      requestId: request.requestId,
      auth,
      tenant,
      channel: request.channel || null,
      route,
      confidence,
      inputText: request.text || '',
      missing: requirements.missing,
      safety,
      latencyMs,
      success
    });
  } catch (error) {
    responsePayload.logError = 'orchestrator_run_log_failed';
  }

  return responsePayload;
}
