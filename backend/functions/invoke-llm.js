/* eslint-env node */

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
  if (!apiKey) {
    throw new Error('missing OPENAI_API_KEY');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: buildMessages({ prompt, context }),
        user: user || undefined,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenAI HTTP ${response.status}: ${text.slice(0, 800)}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content ?? null;

    return {
      content,
      model: json?.model ?? model,
      usage: json?.usage ?? {},
    };
  } finally {
    clearTimeout(timeout);
  }
}
