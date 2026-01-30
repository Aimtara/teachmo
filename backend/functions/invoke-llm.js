/* eslint-env node */
import { openaiChat } from '../utils/openai.js';

const DEFAULT_TIMEOUT_MS = 25_000;

function buildMessages({ prompt, context }) {
  const messages = [];

  if (Array.isArray(context)) {
    context.forEach((entry) => {
      if (entry && typeof entry.role === 'string' && typeof entry.content === 'string') {
        messages.push({ role: entry.role, content: entry.content });
      }
    });
  } else if (typeof context === 'string' && context.trim()) {
    messages.push({ role: 'system', content: context });
  }

  messages.push({ role: 'user', content: prompt });
  return messages;
}

export async function invokeLLM({ prompt, model, context, user, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = process.env.OPENAI_API_KEY;

  return openaiChat({
    apiKey,
    model,
    messages: buildMessages({ prompt, context }),
    user,
    timeoutMs,
  });
}
