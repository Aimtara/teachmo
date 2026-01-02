/* eslint-env node */

export async function invokeAdvancedAI(prompt, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const temperature = typeof options.temperature === 'number' ? options.temperature : 0.4;
  const maxTokens = typeof options.maxTokens === 'number' ? options.maxTokens : 512;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`OpenAI error (${resp.status}): ${JSON.stringify(json)}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty content');
  }

  return { content };
}
