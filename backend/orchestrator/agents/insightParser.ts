// backend/orchestrator/agents/insightParser.ts
import { z } from 'zod';
import { generateJsonWithRetries } from '../../ai/llmJson.js';

interface ParsedInsight {
  type: 'deadline' | 'event' | 'action_required';
  date: string | null;
  summary: string;
  confidenceScore: number;
}

const ParsedInsightSchema = z.object({
  type: z.enum(['deadline', 'event', 'action_required']),
  date: z.string().nullable(),
  summary: z.string(),
  confidenceScore: z.number().min(0).max(1),
});

const InsightResponseSchema = z.object({
  insights: z.array(ParsedInsightSchema),
});

async function checkDuplicateDedupeKey(): Promise<boolean> {
  // Persistent dedupe is provided by the orchestrator store in deployed flows.
  // This local fallback keeps the parser fail-open for isolated tests/imports.
  return false;
}

export async function parseEmailToInsights(rawEmailBody: string, _sourceId: string): Promise<ParsedInsight[]> {
  // 1. Deduplication Reflex (run before expensive LLM call)
  const isDuplicate = await checkDuplicateDedupeKey();
  if (isDuplicate) return [];

  // 2. LLM Reasoning extraction
  const systemPrompt = `
    You are the Teachmo Insight Parser. Extract deadlines, events, and required actions from the following school communication.
    Rules:
    - Never invent facts or dates. If a date is ambiguous, return null.
    - Provide a confidenceScore between 0.0 and 1.0.
    - Keep summaries under 15 words.
  `;

  try {
    const response = await generateJsonWithRetries({
      schema: InsightResponseSchema,
      system: systemPrompt,
      user: rawEmailBody,
      model: process.env.OPENAI_MODEL_INSIGHT_PARSER ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.1,
      maxRetries: 2,
    });

    if (!response.ok) return [];
    
    // 3. Enforce Confidence Thresholds (Safety backstop)
    const validInsights = response.data.insights.filter(
      (insight: ParsedInsight) => insight.confidenceScore >= 0.85
    );

    return validInsights;
  } catch (error) {
    console.error('[Insight Parser] Failed to parse insights', error);
    return []; // Fail closed, do not hallucinate data
  }
}
