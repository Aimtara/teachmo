/* eslint-env node */
// Shared logic for Weekly Family Brief generation.

const DEFAULT_SCENARIOS = [
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
    description: 'On the way home, do a 60-second quiet reset: one deep breath together, then music.',
    script: "Let's do one deep breath together, then we can pick a song.",
    duration_minutes: 2
  },
  {
    id: 's3',
    title: 'Micro-Repair',
    description: 'If things got snippy, try a 10-second repair: name it, soften it, move on.',
    script: "That came out sharper than I meant. I'm here with you.",
    duration_minutes: 1
  },
  {
    id: 's4',
    title: 'One-Word Check-In',
    description: 'Ask for one word that describes how they feel right now. No follow-up required.',
    script: "One word check-in — what's your word?",
    duration_minutes: 1
  },
  {
    id: 's5',
    title: 'Tiny Gratitude',
    description: 'Share one thing you noticed them doing well this week.',
    script: 'I noticed you… and I appreciate it.',
    duration_minutes: 2
  }
];

function safeString(value) {
  if (value == null) return '';
  return String(value);
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeAgeYears(birthdate) {
  const dob = parseDate(birthdate);
  if (!dob) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
  return Math.max(0, years);
}

function inRange(date, start, end) {
  if (!date || !start || !end) return false;
  return date.getTime() >= start.getTime() && date.getTime() < end.getTime();
}

function classifyDisruption(text) {
  const t = text.toLowerCase();
  if (/\b(early dismissal|half[- ]day)\b/.test(t)) return 'early_dismissal';
  if (/\b(late start|delayed start)\b/.test(t)) return 'late_start';
  if (/\b(no school|school closed|closure|closed)\b/.test(t)) return 'no_school';
  if (/\b(conference|conferences)\b/.test(t)) return 'conference';
  if (/\b(testing|exam|assessment)\b/.test(t)) return 'testing';
  return null;
}

const NEWSLETTER_HINTS = [
  'newsletter',
  'weekly update',
  'this week at',
  "principal's note",
  'news and notes',
  'flyer'
];

const DISALLOWED_HINTS = [
  'grade',
  'graded',
  'score',
  'homework',
  'worksheet'
];

function looksLikeNewsletter(text) {
  const t = text.toLowerCase();
  return NEWSLETTER_HINTS.some((hint) => t.includes(hint));
}

function containsDisallowed(text) {
  const t = text.toLowerCase();
  return DISALLOWED_HINTS.some((hint) => t.includes(hint));
}

function communicationImportance(text) {
  const t = text.toLowerCase();
  // High importance: schedule + safety + required action
  if (/\b(urgent|immediately|asap|required|permission slip|permission form)\b/.test(t)) return 2;
  if (/\b(lockdown|safety|security|threat|emergency)\b/.test(t)) return 3;
  if (classifyDisruption(t)) return 2;
  if (/\b(deadline|due|rsvp|signup|sign up|registration)\b/.test(t)) return 2;
  return 1;
}

function truncate(text, max = 280) {
  const s = safeString(text).trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function summarizeWeeklyInputs(payload = {}) {
  const weekStart = parseDate(payload.week_start || payload.weekStart);
  const weekEnd = parseDate(payload.week_end || payload.weekEnd);

  // Normalize child context.
  const child = payload.child || {};
  const childContext = {
    child_id: child.id || payload.child_id || null,
    first_name: child.first_name || child.firstName || null,
    age_years: computeAgeYears(child.birthdate || child.birth_date || child.dob),
    accommodations: payload.accommodations || child.accommodations || null
  };

  // Normalize school signals.
  const schoolEvents = Array.isArray(payload.school_events)
    ? payload.school_events
    : Array.isArray(payload.schoolEvents)
      ? payload.schoolEvents
      : [];

  const signals = {
    disruptions: [],
    events_count: 0
  };

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
      early_dismissal: 'Pickup timing may feel rushed.',
      late_start: 'Morning rhythm may shift.',
      no_school: 'Plan for a different pace that day.',
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

  // Normalize communications.
  const announcements = Array.isArray(payload.announcements)
    ? payload.announcements
    : [];
  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : [];

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
    const text = `${safeString(m.title || m.thread_title || '')} ${safeString(m.body || m.content || m.text || '')}`.trim();
    rawComms.push({
      source: 'message',
      id: m.id || null,
      title: truncate(m.title || m.thread_title || 'Message', 120),
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

  // Scenario pool: caller-provided or default.
  const scenarioPool = Array.isArray(payload.scenario_pool)
    ? payload.scenario_pool
    : Array.isArray(payload.scenarios)
      ? payload.scenarios
      : DEFAULT_SCENARIOS;

  // Family anchors: minimal safe defaults.
  const familyAnchors = payload.family_anchors || payload.familyAnchors || {
    note: 'No explicit routine data provided. Using safe defaults.',
    defaults: {
      weekday_rhythm: 'school-day structure',
      weekend_rhythm: 'different pace'
    }
  };

  // Load score: tuned for state selection.
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
