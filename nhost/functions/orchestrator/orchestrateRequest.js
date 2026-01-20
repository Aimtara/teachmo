import { classifyRequest } from './classify.js';
import { ROUTE_CONFIG, ROUTES } from './routes.js';
import { getHandler } from './registry.js';
import { persistArtifacts, persistOrchestratorRun } from './persist.js';

function buildMissingContextPrompt(missing) {
  if (missing.includes('childId')) {
    return {
      type: 'FOLLOWUP_QUESTION',
      title: 'Which child is this about?',
      placeholder: 'Select a child'
    };
  }
  if (missing.includes('threadId')) {
    return {
      type: 'FOLLOWUP_QUESTION',
      title: 'Which message thread should I summarize?',
      placeholder: 'Paste or select a thread'
    };
  }
  if (missing.includes('schoolId')) {
    return {
      type: 'FOLLOWUP_QUESTION',
      title: 'Which school should I use?',
      placeholder: 'Select a school'
    };
  }
  return {
    type: 'FOLLOWUP_QUESTION',
    title: 'What do you need next?',
    placeholder: 'Share a little more detail'
  };
}

function resolveContext(request, entities) {
  return {
    actor: request.actor,
    channel: request.channel,
    text: request.text || '',
    selected: request.selected || {},
    metadata: request.metadata || {},
    entities
  };
}

function findMissingContext({ request, route }) {
  const config = ROUTE_CONFIG[route];
  if (!config) return [];
  const missing = [];
  for (const key of config.requiredContext) {
    if (key === 'childId' && !request.selected?.childId) missing.push(key);
    if (key === 'schoolId' && !request.selected?.schoolId) missing.push(key);
    if (key === 'threadId' && !request.selected?.threadId) missing.push(key);
  }
  return missing;
}

function normalizeResponse({ response, route, confidence, safety }) {
  return {
    route,
    confidence,
    safety: safety || { level: 'NONE', reasons: [] },
    needs: response.needs,
    ui: response.ui,
    result: response.result,
    sideEffects: response.sideEffects,
    success: response.success
  };
}

export async function orchestrateRequest(request) {
  const start = Date.now();
  const classification = classifyRequest({
    text: request.text || '',
    channel: request.channel
  });

  let route = classification.route;
  let confidence = classification.confidence;
  const safety = classification.safety || { level: 'NONE', reasons: [] };

  if (safety.level !== 'NONE' && route !== ROUTES.SAFETY_ESCALATE) {
    route = ROUTES.SAFETY_ESCALATE;
    confidence = Math.max(confidence, 0.9);
  }

  const missing = findMissingContext({ request, route });
  if (missing.length > 0) {
    const response = {
      needs: {
        missing,
        promptUser: buildMissingContextPrompt(missing)
      },
      ui: {
        type: 'CARD',
        title: 'We need one more detail',
        body: `Missing: ${missing.join(', ')}`,
        primaryAction: { label: 'Provide details', action: 'OPEN_FOLLOWUP' }
      }
    };

    const normalized = normalizeResponse({ response, route, confidence, safety });
    const latencyMs = Date.now() - start;
    const runId = await persistOrchestratorRun({ request, response: normalized, latencyMs });
    if (response.artifacts?.length) {
      await persistArtifacts({ runId, artifacts: response.artifacts });
    }

    return normalized;
  }

  const handler = getHandler(route);
  const ctx = resolveContext(request, classification.entities);
  const response = await handler.execute(ctx, request);

  const normalized = normalizeResponse({ response, route, confidence, safety });
  const latencyMs = Date.now() - start;
  const runId = await persistOrchestratorRun({ request, response: normalized, latencyMs });
  if (response.artifacts?.length) {
    await persistArtifacts({ runId, artifacts: response.artifacts });
  }

  return normalized;
}
