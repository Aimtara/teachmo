import { ROUTES, SAFETY_LEVELS } from './routes.js';

const includesAny = (text, needles) => needles.some((n) => text.includes(n));

/**
 * Phase 1 classifier: deterministic + cheap.
 *
 * You can later swap this for a low-temp LLM classifier that returns
 * the same shape: { route, confidence, extractedEntities, safety }.
 */
export function classify({ text = '', channel = 'CHAT' } = {}) {
  const t = String(text || '').toLowerCase().trim();

  // Safety gate (very light: flag + route; detailed handling belongs in the Safety specialist).
  const safetyHit = includesAny(t, [
    'suicide',
    'self harm',
    'self-harm',
    'kill myself',
    'abuse',
    'sexual',
    'rape',
    'weapon',
    'gun',
    'violent',
    'bully',
    'bullying',
    'threat'
  ]);
  if (safetyHit) {
    return {
      route: ROUTES.SAFETY_ESCALATE,
      confidence: 0.9,
      extractedEntities: {},
      safety: { level: SAFETY_LEVELS.SENSITIVE, reasons: ['safety_keyword_match'] }
    };
  }

  // Route heuristics
  if (includesAny(t, ['weekly brief', 'weekly digest', 'what did i miss', 'week at a glance'])) {
    return {
      route: ROUTES.WEEKLY_BRIEF_GENERATE,
      confidence: 0.75,
      extractedEntities: {},
      safety: { level: SAFETY_LEVELS.NONE, reasons: [] }
    };
  }

  if (includesAny(t, ['office hours', 'conference', 'book a meeting', 'schedule a meeting', 'meet the teacher'])) {
    return {
      route: ROUTES.OFFICE_HOURS_BOOK,
      confidence: 0.72,
      extractedEntities: {},
      safety: { level: SAFETY_LEVELS.NONE, reasons: [] }
    };
  }

  if (includesAny(t, ['homework', 'assignment', 'worksheet', 'project', 'study for'])) {
    return {
      route: ROUTES.HOMEWORK_HELP,
      confidence: 0.7,
      extractedEntities: {},
      safety: { level: SAFETY_LEVELS.NONE, reasons: [] }
    };
  }

  if (includesAny(t, ['summarize thread', 'summarize this', 'catch me up', 'tl;dr', 'tldr'])) {
    return {
      route: ROUTES.HUB_THREAD_SUMMARIZE,
      confidence: 0.7,
      extractedEntities: {},
      safety: { level: SAFETY_LEVELS.NONE, reasons: [] }
    };
  }

  // "message" / "email" the teacher, absence notes, translation of a draft, etc.
  if (includesAny(t, ['message', 'text', 'email', 'tell the teacher', 'absent', 'late', 'pickup', 'translate this'])) {
    return {
      route: ROUTES.HUB_MESSAGE_SEND,
      confidence: channel === 'EMAIL' ? 0.65 : 0.7,
      extractedEntities: {},
      safety: { level: SAFETY_LEVELS.NONE, reasons: [] }
    };
  }

  if (includesAny(t, ['find', 'near me', 'activities', 'events', 'resources', 'programs'])) {
    return {
      route: ROUTES.EXPLORE_DEEP_LINK,
      confidence: 0.68,
      extractedEntities: {},
      safety: { level: SAFETY_LEVELS.NONE, reasons: [] }
    };
  }

  return {
    route: ROUTES.UNKNOWN_CLARIFY,
    confidence: 0.35,
    extractedEntities: {},
    safety: { level: SAFETY_LEVELS.NONE, reasons: [] }
  };
}
