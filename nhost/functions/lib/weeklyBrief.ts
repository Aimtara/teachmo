/* eslint-env node */

import type { WeeklyBriefDraft, WeeklyBriefScenario, WeeklyBriefSummary } from '../_shared/weeklyBriefTypes';

// Weekly Family Brief utilities
// - summarizeWeeklyInputs: normalizes raw inputs into a stable schema
// - determineUxState: selects A/B/C/D
// - generateBriefWithLLM: creates structured content (JSON)
// - renderBriefHtml/Text: produces locked template outputs

const DEFAULT_HIGH_LOAD_THRESHOLD = 6;

const DEFAULT_SCENARIOS: WeeklyBriefScenario[] = [
  {
    id: 's1',
    title: 'Two Highs + One Low',
    description: 'At dinner or bedtime, share two good things and one tough thing from the day.',
    script: 'Want to do two highs and one low with me?',
    duration_minutes: 3
  },
  {
    id: 's2',
    title: 'Car-Ride Reset',
    description: 'On the way home, take one deep breath together, then pick a song.',
    script: "Let's do one deep breath together, then you pick a song.",
    duration_minutes: 2
  },
  {
    id: 's3',
    title: 'One-Word Check-In',
    description: 'Ask for one word that describes how they feel right now. No follow-up required.',
    script: "One word check-in — what's your word?",
    duration_minutes: 1
  },
  {
    id: 's4',
    title: 'Tiny Gratitude',
    description: 'Share one thing you noticed them doing well this week.',
    script: 'I noticed you… and I appreciate it.',
    duration_minutes: 2
  }
];

const BANNED_PHRASES = [
  "don't forget",
  'do not forget',
  'remember to',
  'make sure',
  'you should',
  'you must'
];

type WeeklyBriefPayload = {
  week_start?: string;
  week_end?: string;
  weekStart?: string;
  weekEnd?: string;
  child?: {
    id?: string;
    first_name?: string;
    firstName?: string;
    birthdate?: string;
    birth_date?: string;
    dob?: string;
    accommodations?: string | null;
  };
  child_id?: string;
  accommodations?: string | null;
  school_events?: Array<Record<string, any>>;
  schoolEvents?: Array<Record<string, any>>;
  announcements?: Array<Record<string, any>>;
  messages?: Array<Record<string, any>>;
  scenario_pool?: WeeklyBriefScenario[];
  scenarios?: WeeklyBriefScenario[];
  family_anchors?: WeeklyBriefSummary['family_anchors'];
  familyAnchors?: WeeklyBriefSummary['family_anchors'];
};

function safeString(value: unknown) {
  if (value == null) return '';
  return String(value);
}

function truncate(value: unknown, max = 280) {
  const s = safeString(value).trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(date: Date | null, start: Date | null, end: Date | null) {
  if (!date || !start || !end) return false;
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

function computeAgeYears(birthdate: string | null | undefined) {
  const dob = parseDate(birthdate);
  if (!dob) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  return Math.max(0, years);
}

function classifyDisruption(text: string) {
  const t = text.toLowerCase();
  if (/\b(early dismissal|half[- ]day)\b/.test(t)) return 'early_dismissal';
  if (/\b(late start|delayed start)\b/.test(t)) return 'late_start';
  if (/\b(no school|school closed|closure|closed)\b/.test(t)) return 'no_school';
  if (/\b(conference|conferences)\b/.test(t)) return 'conference';
  if (/\b(testing|exam|assessment)\b/.test(t)) return 'testing';
  return null;
}

const NEWSLETTER_HINTS = ['newsletter', 'weekly update', 'this week at', "principal's note", 'news and notes', 'flyer'];
const DISALLOWED_HINTS = ['grade', 'graded', 'score', 'homework', 'worksheet'];

function looksLikeNewsletter(text: string) {
  const t = text.toLowerCase();
  return NEWSLETTER_HINTS.some((hint) => t.includes(hint));
}

function containsDisallowed(text: string) {
  const t = text.toLowerCase();
  return DISALLOWED_HINTS.some((hint) => t.includes(hint));
}

function communicationImportance(text: string) {
  const t = text.toLowerCase();
  if (/\b(lockdown|safety|security|threat|emergency)\b/.test(t)) return 3;
  if (/\b(urgent|immediately|asap|required|permission slip|permission form)\b/.test(t)) return 2;
  if (classifyDisruption(t)) return 2;
  if (/\b(deadline|due|rsvp|signup|sign up|registration)\b/.test(t)) return 2;
  return 1;
}

export function summarizeWeeklyInputs(payload: WeeklyBriefPayload = {}): WeeklyBriefSummary {
  const weekStart = parseDate(payload.week_start || payload.weekStart);
  const weekEndInclusive = parseDate(payload.week_end || payload.weekEnd);
  const weekEnd = weekEndInclusive ? new Date(weekEndInclusive.getTime() + 24 * 60 * 60 * 1000) : null;

  const child = payload.child || {};
  const childContext = {
    child_id: child.id || payload.child_id || null,
    first_name: child.first_name || child.firstName || null,
    age_years: computeAgeYears(child.birthdate || child.birth_date || child.dob),
    accommodations: payload.accommodations || child.accommodations || null
  };

  // --- school schedule signals ---
  const schoolEvents = Array.isArray(payload.school_events)
    ? payload.school_events
    : Array.isArray(payload.schoolEvents)
      ? payload.schoolEvents
      : [];

  const signals = { disruptions: [], events_count: 0 };
  for (const ev of schoolEvents) {
    const startsAt = parseDate(ev.starts_at || ev.startsAt || ev.start);
    if (!inRange(startsAt, weekStart, weekEnd)) continue;
    signals.events_count += 1;

    const title = safeString(ev.title || ev.name || ev.summary);
    const desc = safeString(ev.description || ev.body || ev.details);
    const kind = classifyDisruption(`${title} ${desc}`);
    if (!kind) continue;

    const day = startsAt.toISOString().slice(0, 10);
    const impactHintByKind = {
      early_dismissal: 'Pickup timing may feel rushed, especially if afternoons are tight.',
      late_start: 'Morning rhythm may shift a bit.',
      no_school: 'Expect a different pace that day.',
      conference: 'This may add coordination or timing changes.',
      testing: 'Energy may feel different midweek.'
    };

    signals.disruptions.push({
      id: ev.id || null,
      kind,
      title: truncate(title, 120),
      date: day,
      impact_hint: impactHintByKind[kind] || 'This may affect routines.'
    });
  }

  // --- school communications (filtered) ---
  const announcements = Array.isArray(payload.announcements) ? payload.announcements : [];
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  const rawComms = [];
  for (const a of announcements) {
    const text = `${safeString(a.title)} ${safeString(a.body || a.content)}`.trim();
    rawComms.push({
      source: 'announcement',
      id: a.id || null,
      title: truncate(a.title || 'Announcement', 120),
      body: truncate(a.body || a.content || '', 500),
      created_at: a.created_at || a.createdAt || null,
      _text: text
    });
  }
  for (const m of messages) {
    const text = `${safeString(m.title || m.subject || m.thread_title || '')} ${safeString(m.body || m.content || m.text || '')}`.trim();
    rawComms.push({
      source: 'message',
      id: m.id || null,
      title: truncate(m.title || m.subject || m.thread_title || 'Message', 120),
      body: truncate(m.body || m.content || m.text || '', 500),
      created_at: m.created_at || m.createdAt || null,
      _text: text
    });
  }

  const important = [];
  let ignoredCount = 0;

  for (const c of rawComms) {
    const t = (c._text || '').toLowerCase();
    if (!t) continue;
    if (containsDisallowed(t)) {
      ignoredCount += 1;
      continue;
    }
    if (looksLikeNewsletter(t)) {
      ignoredCount += 1;
      continue;
    }

    const score = communicationImportance(t);
    if (score <= 1) {
      ignoredCount += 1;
      continue;
    }

    important.push({
      source: c.source,
      id: c.id,
      title: c.title,
      body: c.body,
      created_at: c.created_at,
      importance_score: score
    });
  }

  important.sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0));

  const communications = {
    important: important.slice(0, 10),
    ignored_count: ignoredCount
  };

  const scenarioPool = Array.isArray(payload.scenario_pool)
    ? payload.scenario_pool
    : Array.isArray(payload.scenarios)
      ? payload.scenarios
      : DEFAULT_SCENARIOS;

  const familyAnchors = payload.family_anchors || payload.familyAnchors || {
    note: 'No explicit routine data provided. Using safe defaults.',
    defaults: { weekday_rhythm: 'school-day structure', weekend_rhythm: 'a different pace' }
  };

  const disruptionCount = signals.disruptions.length;
  const importantCommsCount = communications.important.length;

  let loadScore = disruptionCount * 3 + importantCommsCount;
  if (signals.events_count >= 8) loadScore += 1;
  loadScore = Math.max(0, Math.min(10, loadScore));

  return {
    week_start: payload.week_start || payload.weekStart || null,
    week_end: payload.week_end || payload.weekEnd || null,
    child_context: childContext,
    school_signals: signals,
    communications,
    family_anchors: familyAnchors,
    scenario_pool: scenarioPool,
    load_score: loadScore,
    load_factors: {
      disruptions: disruptionCount,
      important_comms: importantCommsCount,
      events_in_week: signals.events_count
    }
  };
}

export function determineUxState({
  hasHistory,
  missedLastWeek,
  loadScore
}: {
  hasHistory: boolean;
  missedLastWeek: boolean;
  loadScore: number;
}) {
  if (!hasHistory) return 'A';
  if (missedLastWeek) return 'D';

  const threshold = Number(process.env.WEEKLY_BRIEF_HIGH_LOAD_SCORE || DEFAULT_HIGH_LOAD_THRESHOLD);
  if (Number(loadScore) >= threshold) return 'C';
  return 'B';
}

function hasBannedPhrases(text: unknown) {
  const t = safeString(text).toLowerCase();
  return BANNED_PHRASES.some((p) => t.includes(p));
}

export function validateBriefDraft(draft: Partial<WeeklyBriefDraft> = {}) {
  const errors = [];

  const shape = safeString(draft.shape_of_the_week).trim();
  if (!shape) errors.push('shape_of_the_week is required');
  if (shape.length > 240) errors.push('shape_of_the_week too long');
  if (hasBannedPhrases(shape)) errors.push('shape_of_the_week contains directive language');

  const items = Array.isArray(draft.school_things_to_know) ? draft.school_things_to_know : [];
  if (items.length > 3) errors.push('school_things_to_know exceeds 3 items');
  for (const [idx, it] of items.entries()) {
    const label = safeString(it?.label).trim();
    const why = safeString(it?.why).trim();
    if (!label || !why) errors.push(`school_things_to_know[${idx}] missing label/why`);
    if (label.length > 140) errors.push(`school_things_to_know[${idx}].label too long`);
    if (why.length > 240) errors.push(`school_things_to_know[${idx}].why too long`);
    if (hasBannedPhrases(`${label} ${why}`)) errors.push(`school_things_to_know[${idx}] contains directive language`);
  }

  const moment = safeString(draft.moment_to_protect).trim();
  if (moment && moment.length > 320) errors.push('moment_to_protect too long');
  if (moment && hasBannedPhrases(moment)) errors.push('moment_to_protect contains directive language');

  const heads = safeString(draft.gentle_heads_up).trim();
  if (!heads) errors.push('gentle_heads_up is required');
  if (heads.length > 360) errors.push('gentle_heads_up too long');
  if (hasBannedPhrases(heads)) errors.push('gentle_heads_up contains directive language');

  const idea = draft.tiny_connection_idea || {};
  const ideaTitle = safeString(idea.title).trim();
  const ideaDesc = safeString(idea.description).trim();
  if (!ideaTitle || !ideaDesc) errors.push('tiny_connection_idea requires title + description');
  if (ideaTitle.length > 120) errors.push('tiny_connection_idea.title too long');
  if (ideaDesc.length > 240) errors.push('tiny_connection_idea.description too long');
  if (hasBannedPhrases(`${ideaTitle} ${ideaDesc}`)) errors.push('tiny_connection_idea contains directive language');

  return { ok: errors.length === 0, errors };
}

function escapeHtml(s: unknown) {
  return safeString(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderBriefHtml({ weekRange, draft }: { weekRange: string; draft: WeeklyBriefDraft }) {
  const items = Array.isArray(draft.school_things_to_know) ? draft.school_things_to_know : [];

  const itemsHtml = items
    .map(
      (it) =>
        `<div style="margin:0 0 10px 0;">
          <div><strong>• ${escapeHtml(it.label)}</strong></div>
          <div>${escapeHtml(it.why)}</div>
        </div>`
    )
    .join('');

  const idea = draft.tiny_connection_idea || {};

  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.45;">
    <h2 style="margin:0 0 6px 0;">Your Week, Simplified</h2>
    <div style="color:#555; margin:0 0 16px 0;">Week of ${escapeHtml(weekRange)}</div>

    <h3 style="margin:16px 0 6px 0;">The shape of the week</h3>
    <div>${escapeHtml(draft.shape_of_the_week)}</div>

    <h3 style="margin:16px 0 6px 0;">School things worth knowing</h3>
    <div style="color:#555; margin:0 0 8px 0;">These are the school-related moments most likely to affect your week.</div>
    ${itemsHtml || '<div style="color:#555;">No major school schedule changes showed up for this week.</div>'}

    <h3 style="margin:16px 0 6px 0;">One moment to protect</h3>
    <div>${escapeHtml(draft.moment_to_protect || 'If you can, protect one small calm pocket — even a few minutes counts.')}</div>

    <h3 style="margin:16px 0 6px 0;">A gentle heads-up</h3>
    <div>${escapeHtml(draft.gentle_heads_up)}</div>

    <h3 style="margin:16px 0 6px 0;">One tiny connection idea</h3>
    <div><strong>${escapeHtml(idea.title || '')}</strong></div>
    <div>${escapeHtml(idea.description || '')}</div>
    ${idea.script ? `<div style="color:#555; margin-top:6px;"><em>“${escapeHtml(idea.script)}”</em></div>` : ''}
    <div style="color:#555; margin-top:6px;">Skip this if the moment passes — it’s here if you want it.</div>

    <div style="margin-top:18px; color:#666; font-size: 12px;">
      This brief refreshes weekly. Teachmo focuses on clarity, not perfection.
    </div>
  </div>
  `.trim();
}

export function renderBriefText({ weekRange, draft }: { weekRange: string; draft: WeeklyBriefDraft }) {
  const items = Array.isArray(draft.school_things_to_know) ? draft.school_things_to_know : [];
  const firstItem = items[0]?.label ? ` • ${items[0].label}` : '';

  const t = `Your week (${weekRange}): ${draft.shape_of_the_week}${firstItem}`;
  return truncate(t, 240);
}

function buildSystemPrompt() {
  return [
    'You are Teachmo, a calm, trustworthy parenting assistant.',
    'You reduce cognitive load, normalize imperfection, and help parents see their week clearly.',
    'You never shame, overwhelm, guilt, or assign tasks.',
    'You avoid directives like "remember to" or "make sure". Use gentle, optional language.',
    'You prioritize clarity over completeness, and reassurance over productivity.'
  ].join('\n');
}

function buildUserPrompt({
  weekRange,
  uxState,
  summary
}: {
  weekRange: string;
  uxState: string;
  summary: WeeklyBriefSummary;
}) {
  const constraints = [
    'Output must be valid JSON only (no markdown).',
    'Use this JSON schema exactly:',
    '{',
    '  "shape_of_the_week": string,',
    '  "school_things_to_know": [{"label": string, "why": string}], (0-3 items)',
    '  "moment_to_protect": string,',
    '  "gentle_heads_up": string,',
    '  "tiny_connection_idea": {"title": string, "description": string, "script": string}',
    '}',
    'Constraints:',
    '- shape_of_the_week: exactly 1 sentence, calm and neutral.',
    '- school_things_to_know: max 3 items. Do NOT include homework/grades.',
    '- moment_to_protect: low-effort, optional; do not sound mandatory.',
    '- gentle_heads_up: 1-2 sentences; always normalizing.',
    '- tiny_connection_idea: <= 5 minutes, skippable, no prep.',
    '- Avoid directives: "remember to", "you should", "make sure".',
    '',
    `UX state: ${uxState}`,
    `Week range: ${weekRange}`,
    'Summarized inputs (use only these):',
    JSON.stringify(summary)
  ].join('\n');

  // Slightly different tone per state.
  const stateHint = {
    A: 'This is the first brief. Keep it intentionally light and general.',
    B: 'Normal week. Be clear and steady.',
    C: 'Busy week. Subtract more. Be extra reassuring and minimal.',
    D: 'Re-entry week. Welcome back; do not mention missed weeks.'
  };

  return `${stateHint[uxState] || ''}\n\n${constraints}`;
}

async function invokeOpenAI({ systemPrompt, userPrompt }: { systemPrompt: string; userPrompt: string }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`OpenAI error (${resp.status}): ${JSON.stringify(json)}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned empty content');

  return content;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildFallbackDraft({ summary }: { weekRange: string; summary: WeeklyBriefSummary }): WeeklyBriefDraft {
  const disruptions = summary?.school_signals?.disruptions || [];
  const important = summary?.communications?.important || [];

  const shape = summary?.load_score >= 6
    ? 'This week looks full but manageable — focus on what matters, and let the rest be background noise.'
    : 'This week looks fairly typical — steady rhythm, with a few moments that may need a little extra patience.';

  const items = disruptions.slice(0, 2).map((d) => ({
    label: d.title || 'Schedule change',
    why: d.impact_hint || 'This may affect timing and routines.'
  }));

  if (items.length < 3 && important.length > 0) {
    const c = important[0];
    items.push({
      label: c.title || 'School update',
      why: 'This may add a small coordination step — keep it simple and ask for help if needed.'
    });
  }

  const idea = (summary?.scenario_pool || DEFAULT_SCENARIOS)[0];

  return {
    shape_of_the_week: shape,
    school_things_to_know: items.slice(0, 3),
    moment_to_protect: 'If you can, protect one small calm pocket (even 5 minutes) midweek — it tends to pay you back.',
    gentle_heads_up: 'Midweek may feel a little tighter than it looks on paper. That’s normal, and it doesn’t mean anything is going wrong.',
    tiny_connection_idea: {
      title: idea.title,
      description: idea.description,
      script: idea.script
    }
  };
}

export async function generateBriefWithLLM({
  weekRange,
  uxState,
  summary
}: {
  weekRange: string;
  uxState: string;
  summary: WeeklyBriefSummary;
}): Promise<{ draft: WeeklyBriefDraft; used_fallback: boolean; fallback_reason?: string | string[] }> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({ weekRange, uxState, summary });

  // First attempt
  try {
    const raw = await invokeOpenAI({ systemPrompt, userPrompt });
    const draft = safeJsonParse(raw);
    if (!draft) throw new Error('LLM did not return valid JSON');

    const validation = validateBriefDraft(draft);
    if (validation.ok) return { draft, used_fallback: false };

    // Retry once with explicit errors.
    const retryPrompt = `${userPrompt}\n\nYour last output failed these checks:\n- ${validation.errors.join('\n- ')}\n\nReturn corrected JSON only.`;
    const raw2 = await invokeOpenAI({ systemPrompt, userPrompt: retryPrompt });
    const draft2 = safeJsonParse(raw2);
    if (!draft2) throw new Error('LLM retry did not return valid JSON');

    const validation2 = validateBriefDraft(draft2);
    if (validation2.ok) return { draft: draft2, used_fallback: false };

    // Fall back after second failure.
    const fallback = buildFallbackDraft({ weekRange, summary });
    return { draft: fallback, used_fallback: true, fallback_reason: validation2.errors };
  } catch (err) {
    const fallback = buildFallbackDraft({ weekRange, summary });
    return { draft: fallback, used_fallback: true, fallback_reason: safeString(err?.message || err) };
  }
}
