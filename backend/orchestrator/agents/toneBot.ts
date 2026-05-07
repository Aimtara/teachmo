// backend/orchestrator/agents/toneBot.ts
import { invokeLLM } from '../../functions/invoke-llm.js';

export async function generateWordsToTry(parentDraft: string, contextScenario: string): Promise<string> {
  // Strict System Prompt acting as the "Warmth without deception" constraint
  const toneConstraintPrompt = `
    You are the Teachmo "Words to Try" assistant. Your goal is to help a parent communicate effectively with a teacher.
    The current scenario is: ${contextScenario}
    
    The parent has drafted this message: "${parentDraft}"

    Rewrite this message to be:
    1. Collaborative, not combative.
    2. Concise and respectful of the teacher's time.
    3. Clear about the parent's core concern.
    
    Do not add any pleasantries that sound robotic. Do not make up context.
    Return ONLY the suggested rewritten text.
  `;

  const suggestion = await invokeLLM({
    prompt: parentDraft,
    context: toneConstraintPrompt,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    user: undefined,
  });

  return String(suggestion.content ?? '').trim();
}
