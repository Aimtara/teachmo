import { ROUTES } from './routes.js';

const SAFETY_KEYWORDS = {
  urgent: ['suicide', 'self-harm', 'kill myself', 'immediate danger', 'gun', 'weapon'],
  sensitive: ['abuse', 'bully', 'bullying', 'custody', 'assault', 'harm', 'harassment']
};

function detectSafety(text = '') {
  const normalized = text.toLowerCase();
  if (SAFETY_KEYWORDS.urgent.some((keyword) => normalized.includes(keyword))) {
    return { level: 'URGENT', reasons: ['self_harm_or_immediate_danger'] };
  }
  if (SAFETY_KEYWORDS.sensitive.some((keyword) => normalized.includes(keyword))) {
    return { level: 'SENSITIVE', reasons: ['sensitive_topic_detected'] };
  }
  return { level: 'NONE', reasons: [] };
}

function classifyIntent(text = '', channel) {
  const normalized = text.toLowerCase();

  if (normalized.includes('message') || normalized.includes('teacher') || normalized.includes('note')) {
    return { route: ROUTES.HUB_MESSAGE_SEND, confidence: 0.86 };
  }

  if (normalized.includes('summary') || normalized.includes('summarize')) {
    return { route: ROUTES.HUB_THREAD_SUMMARIZE, confidence: 0.74 };
  }

  if (normalized.includes('weekly brief') || normalized.includes('week at a glance')) {
    return { route: ROUTES.WEEKLY_BRIEF_GENERATE, confidence: 0.8 };
  }

  if (normalized.includes('office hours') || normalized.includes('meeting') || normalized.includes('conference')) {
    return { route: ROUTES.OFFICE_HOURS_BOOK, confidence: 0.78 };
  }

  if (normalized.includes('homework') || normalized.includes('assignment') || normalized.includes('help')) {
    return { route: ROUTES.HOMEWORK_HELP, confidence: 0.72 };
  }

  if (normalized.includes('explore') || normalized.includes('discover') || normalized.includes('find')) {
    return { route: ROUTES.EXPLORE_DEEP_LINK, confidence: 0.7 };
  }

  if (channel === 'SYSTEM_EVENT') {
    return { route: ROUTES.HUB_THREAD_SUMMARIZE, confidence: 0.55 };
  }

  return { route: ROUTES.UNKNOWN_CLARIFY, confidence: 0.4 };
}

function extractEntities(text = '') {
  const normalized = text.toLowerCase();
  const entities = {};

  if (normalized.includes('tomorrow')) {
    entities.dateHint = 'tomorrow';
  }

  if (normalized.includes('next week')) {
    entities.dateHint = 'next_week';
  }

  return entities;
}

export function classifyRequest({ text, channel }) {
  const safety = detectSafety(text || '');
  const { route, confidence } = classifyIntent(text || '', channel);
  const entities = extractEntities(text || '');

  return {
    route,
    confidence,
    entities,
    safety
  };
}
