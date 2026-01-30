/* eslint-env node */

const DEFAULT_TIMEOUT_MS = 25_000;

/**
 * Shared OpenAI chat completions helper.
 * Used by both AI completion routes and JSON generation with retries.
 * 
 * @param {{
 *   apiKey: string,
 *   model: string,
 *   messages: Array<{role: string, content: string}>,
 *   temperature?: number,
 *   max_tokens?: number,
 *   user?: string,
 *   timeoutMs?: number
 * }} params
 * @returns {Promise<{content: string, model: string, usage?: object}>}
 */
export async function openaiChat({
  apiKey,
  model,
  messages,
  temperature = 0.2,
  max_tokens,
  user,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) {
  if (!apiKey) {
    throw new Error('missing OPENAI_API_KEY');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = {
      model,
      messages,
      temperature,
    };

    if (max_tokens !== undefined) {
      body.max_tokens = max_tokens;
    }

    if (user !== undefined) {
      body.user = user;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenAI HTTP ${response.status}: ${text.slice(0, 800)}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    
    if (typeof content !== 'string') {
      throw new Error('OpenAI response missing choices[0].message.content');
    }

    return {
      content,
      model: json?.model ?? model,
      usage: json?.usage ?? {},
    };
  } finally {
    clearTimeout(timeout);
  }
}
