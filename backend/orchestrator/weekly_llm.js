/* eslint-env node */
import { WeeklyBriefSchema } from './types.js';
import { extractFeatures } from './features.js';
import { makeId, toIso, clamp01 } from './utils.js';
import { generateJsonWithRetries } from '../ai/llmJson.js';

/**
 * Generate a locked-structure weekly brief using an LLM.
 * Returns null on failure (caller should use deterministic fallback).
 */
export async function generateWeeklyBriefWithLLM({ state, recentSignals, now }) {
  const familyId = state.familyId;
  const createdAt = toIso(now);
  const weekEnd = toIso(now);
  const weekStartDate = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const weekStart = toIso(weekStartDate);
  const id = makeId('wbrief');

  const counts = {};
  for (const s of recentSignals) {
    counts[s.type] = (counts[s.type] ?? 0) + 1;
  }

  // Rank signals by a simple "salience" score and provide a small window to the model.
  const scored = recentSignals
    .slice(-120)
    .map((s) => {
      const f = extractFeatures(s, { now });
      const score = 0.45 * f.impact + 0.35 * f.urgency + 0.2 * f.emotionHeat;
      const title = typeof s.payload?.title === 'string' ? s.payload.title : s.type;
      const deadline = typeof s.payload?.deadline === 'string' ? s.payload.deadline : null;
      return {
        type: s.type,
        source: s.source,
        title,
        deadline,
        urgency: clamp01(f.urgency),
        impact: clamp01(f.impact),
        emotionHeat: clamp01(f.emotionHeat),
        score: clamp01(score),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const input = {
    requiredFields: { id, familyId, createdAt, weekStart, weekEnd },
    stateSnapshot: {
      zone: state.zone,
      tension: clamp01(state.tension),
      slack: clamp01(state.slack),
      cooldownActive: Boolean(state.cooldownUntil),
      parentBandwidth: clamp01(state.parentBandwidth),
      schoolPressure: clamp01(state.schoolPressure),
      backlogLoad: clamp01(state.backlogLoad),
      relationshipStrain: clamp01(state.relationshipStrain),
      childRisk: clamp01(state.childRisk),
      scheduleDensity: clamp01(state.scheduleDensity),
      maxNotificationsPerHour: state.maxNotificationsPerHour,
      dailyAttentionBudgetMin: state.dailyAttentionBudgetMin,
    },
    signalCounts: counts,
    topSignals: scored,
    constraints: {
      maxHighlights: 4,
      maxRisks: 4,
      maxNextSteps: 5,
      tone: 'Warm, practical, culturally affirming. Never judgy. Plain language. Focus on tiny wins and clarity.',
      balance: 'Bridge home + school needs neutrally; avoid blaming either side.',
    },
  };

  const system =
    'You are Teachmo. Create a WEEKLY BRIEF for a family that reduces cognitive and emotional load.\n' +
    'Stay neutral and balanced between home needs and school needs (yin-yang), while protecting the child.\n' +
    'Keep it short, calm, and practical.\n' +
    'Return a SINGLE JSON object that matches the required structure exactly.';

  const user =
    'Use the input JSON below to write the weekly brief.\n' +
    'Rules:\n' +
    '- Must include ALL fields in requiredFields exactly as provided (do not change them).\n' +
    '- zoneSummary should reflect stateSnapshot (currentZone, tension, slack, cooldownActive).\n' +
    '- highlights/risks/steps should be short (1 sentence each) and not exceed the specified max counts.\n' +
    '- setpointAdjustments: only include if you recommend small, conservative changes; otherwise omit.\n' +
    '- signalCounts must be copied from input signalCounts (you may keep as-is).\n' +
    '- Output ONLY JSON.\n\n' +
    JSON.stringify(input, null, 2);

  const model = process.env.OPENAI_MODEL_WEEKLY_BRIEF ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const result = await generateJsonWithRetries({
    schema: WeeklyBriefSchema,
    system,
    user,
    model,
    temperature: 0.2,
    maxRetries: 2,
  });

  if (!result.ok) return null;

  // Enforce required fields + cap list sizes, then re-validate.
  const b = { ...result.data };
  b.id = id;
  b.familyId = familyId;
  b.createdAt = createdAt;
  b.weekStart = weekStart;
  b.weekEnd = weekEnd;

  b.highlights = Array.isArray(b.highlights) ? b.highlights.slice(0, input.constraints.maxHighlights) : [];
  b.risks = Array.isArray(b.risks) ? b.risks.slice(0, input.constraints.maxRisks) : [];
  b.recommendedNextSteps = Array.isArray(b.recommendedNextSteps)
    ? b.recommendedNextSteps.slice(0, input.constraints.maxNextSteps)
    : [];

  const validated = WeeklyBriefSchema.safeParse(b);
  if (!validated.success) return null;

  return validated.data;
}
