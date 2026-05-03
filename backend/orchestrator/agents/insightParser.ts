// backend/orchestrator/agents/insightParser.ts
import { invokeLLMJson } from '../../ai/llmJson'; 

interface ParsedInsight {
  type: 'deadline' | 'event' | 'action_required';
  date: string | null;
  summary: string;
  confidenceScore: number;
}

async function checkDuplicateDedupeKey(_dedupeKey: string): Promise<boolean> {
  // Persistent dedupe is provided by the orchestrator store in deployed flows.
  // This local fallback keeps the parser fail-open for isolated tests/imports.
  return false;
}

export async function parseEmailToInsights(rawEmailBody: string, sourceId: string): Promise<ParsedInsight[]> {
  // 1. Deduplication Reflex (run before expensive LLM call)
  const isDuplicate = await checkDuplicateDedupeKey(`email_insight_${sourceId}`);
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
    const response = await invokeLLMJson(systemPrompt, rawEmailBody);
    
    // 3. Enforce Confidence Thresholds (Safety backstop)
    const validInsights = response.insights.filter(
      (insight: ParsedInsight) => insight.confidenceScore >= 0.85
    );

    return validInsights;
  } catch (error) {
    console.error('[Insight Parser] Failed to parse insights', error);
    return []; // Fail closed, do not hallucinate data
  }
}
