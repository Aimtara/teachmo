/* eslint-env node */
// Minimal OpenAI JSON helper with retries + schema validation.
// Uses global fetch (Node 18+). No SDK dependency.

import { z } from 'zod';

const DEFAULT_TIMEOUT_MS = 25_000;

export function safeJsonParse(text) {
  if (typeof text !== 'string') return { ok: false, error: 'non_string' };
  const trimmed = text.trim();

  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    // continue
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    try {
      return { ok: true, value: JSON.parse(slice) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `json_parse_failed:${msg}` };
    }
  }

  return { ok: false, error: 'no_json_object' };
}

async function openaiChat({ apiKey, model, messages, temperature = 0.2, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`OpenAI HTTP ${resp.status}: ${text.slice(0, 800)}`);
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('OpenAI response missing choices[0].message.content');
    }
    return { content, model: json?.model ?? model };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate JSON with retries and Zod validation.
 * Returns { ok: true, data, raw, attempts, model } on success.
 * Returns { ok: false, error, raw, attempts, model } on failure.
 *
 * @param {{
 *   schema: z.ZodTypeAny,
 *   system: string,
 *   user: string,
 *   model?: string,
 *   temperature?: number,
 *   maxRetries?: number,
 *   timeoutMs?: number,
 *   apiKey?: string,
 * }} params
 */
export async function generateJsonWithRetries(params) {
  const {
    schema,
    system,
    user,
    model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    temperature = 0.2,
    maxRetries = 2,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    apiKey = process.env.OPENAI_API_KEY,
  } = params;

  if (!apiKey) {
    return { ok: false, error: 'missing_OPENAI_API_KEY', raw: '', attempts: 0, model };
  }

  const baseSystem = `${system}

OUTPUT RULES:
- Output ONLY raw JSON.
- No markdown, no code fences, no commentary.
- Do not add extra keys.
- Use plain language; avoid jargon; never shame.
`;

  let lastRaw = '';
  let lastError = 'unknown_error';
  let usedModel = model;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const messages =
      attempt === 0
        ? [
            { role: 'system', content: baseSystem },
            { role: 'user', content: user },
          ]
        : [
            { role: 'system', content: baseSystem },
            { role: 'user', content: user },
            { role: 'assistant', content: lastRaw || '{}' },
            {
              role: 'user',
              content:
                'Fix the previous answer. Return ONLY valid JSON conforming exactly to the required shape. No extra keys. No commentary.',
            },
          ];

    try {
      const { content, model: m } = await openaiChat({
        apiKey,
        model,
        messages,
        temperature: attempt === 0 ? temperature : 0,
        timeoutMs,
      });
      usedModel = m;
      lastRaw = content;

      const parsed = safeJsonParse(content);
      if (!parsed.ok) {
        lastError = parsed.error;
        continue;
      }

      const validated = schema.safeParse(parsed.value);
      if (!validated.success) {
        lastError = `schema_validation_failed:${validated.error.issues?.[0]?.message ?? 'unknown'}`;
        continue;
      }

      return {
        ok: true,
        data: validated.data,
        raw: content,
        attempts: attempt + 1,
        model: usedModel,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = msg;
      continue;
    }
  }

  return {
    ok: false,
    error: lastError,
    raw: lastRaw,
    attempts: maxRetries + 1,
    model: usedModel,
  };
}
