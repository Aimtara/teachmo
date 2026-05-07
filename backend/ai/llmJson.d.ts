import type { z } from 'zod';

export type JsonRetrySuccess<T> = {
  ok: true;
  data: T;
  raw: string;
  attempts: number;
  model: string;
};

export type JsonRetryFailure = {
  ok: false;
  error: string;
  raw: string;
  attempts: number;
  model: string;
};

export function safeJsonParse(text: string): { ok: true; value: unknown } | { ok: false; error: string };
export function generateJsonWithRetries<T>(params: {
  schema: z.ZodType<T>;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
  timeoutMs?: number;
  apiKey?: string;
}): Promise<JsonRetrySuccess<T> | JsonRetryFailure>;
