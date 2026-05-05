export type MessagingDeliveryStatus = 'queued' | 'sent' | 'failed' | 'duplicate';

export type MessagingSendAttempt = {
  messageId?: string | null;
  threadId: string;
  senderId: string;
  recipientId?: string | null;
  bodyHash: string;
  createdAt: string;
};

export type RetryClassification = {
  retryable: boolean;
  reason: string;
};

const RETRYABLE_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'rate_limited', 'timeout']);
const NON_RETRYABLE_CODES = new Set(['forbidden', 'unauthorized', 'message_too_long', 'thread_inactive', 'thread_moderated']);

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function buildMessagingIdempotencyKey(input: {
  threadId: string;
  senderId: string;
  clientMessageId?: string | null;
  body?: string | null;
  bodyHash?: string | null;
}) {
  const contentKey = String(input.clientMessageId || input.bodyHash || stableHash(String(input.body ?? ''))).trim();
  return ['msg', input.threadId, input.senderId, contentKey || 'empty'].join(':');
}

export function classifyMessagingSendError(error: unknown): RetryClassification {
  const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: unknown }).status) : null;
  if (status === 429) return { retryable: true, reason: 'rate_limited' };
  if (status && [500, 502, 503, 504].includes(status)) return { retryable: true, reason: 'server_error' };
  if (status === 401) return { retryable: false, reason: 'unauthorized' };
  if (status === 403) return { retryable: false, reason: 'forbidden' };
  if (status && status >= 400 && status < 500) return { retryable: false, reason: 'client_error' };
  return classifyMessagingFailure(error);
}

export function computeMessagingRetryDelayMs(
  attempt: number,
  options: { baseDelayMs?: number; maxDelayMs?: number; jitterMs?: number } = {},
) {
  const delay = computeBackoffMs(attempt, { baseMs: options.baseDelayMs ?? 1000, maxMs: options.maxDelayMs ?? 30_000 });
  const jitter = Math.max(0, Math.floor(options.jitterMs ?? 250));
  return Math.min(options.maxDelayMs ?? 30_000, delay + (jitter ? Math.floor(Math.random() * jitter) : 0));
}

export function shouldRetryMessagingSend(
  error: unknown,
  attempt: number,
  options: { maxAttempts?: number } = {},
) {
  const maxAttempts = options.maxAttempts ?? 3;
  return attempt < maxAttempts && classifyMessagingSendError(error).retryable;
}

export function buildMessageIdempotencyKey(input: {
  threadId: string;
  senderId: string;
  bodyHash: string;
  windowStartIso?: string | null;
}) {
  const windowPart = input.windowStartIso ? new Date(input.windowStartIso).toISOString().slice(0, 16) : 'immediate';
  return ['message', input.threadId, input.senderId, input.bodyHash, windowPart].join(':');
}

export function classifyMessagingFailure(error: unknown): RetryClassification {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = (code || message).toLowerCase();

  if (NON_RETRYABLE_CODES.has(normalized) || /forbidden|unauthorized|too_long|moderated|inactive/.test(normalized)) {
    return { retryable: false, reason: normalized || 'non_retryable' };
  }

  if (RETRYABLE_CODES.has(code) || /timeout|temporar|rate|reset|network|503|502|504/.test(normalized)) {
    return { retryable: true, reason: normalized || 'retryable' };
  }

  return { retryable: false, reason: normalized || 'unknown' };
}

export function computeBackoffMs(attempt: number, options: { baseMs?: number; maxMs?: number } = {}) {
  const baseMs = options.baseMs ?? 500;
  const maxMs = options.maxMs ?? 30_000;
  const safeAttempt = Math.max(1, Math.floor(Number(attempt) || 1));
  return Math.min(maxMs, baseMs * 2 ** (safeAttempt - 1));
}

export function summarizeDeliveryAttempt(input: {
  attempt: MessagingSendAttempt;
  status: MessagingDeliveryStatus;
  retryAfterMs?: number | null;
  error?: unknown;
}) {
  const failure = input.error ? classifyMessagingFailure(input.error) : null;
  return {
    eventName: 'messaging.delivery_attempt',
    status: input.status,
    retryable: failure?.retryable ?? false,
    retryAfterMs: input.retryAfterMs ?? null,
    metadata: {
      messageId: input.attempt.messageId ?? null,
      threadId: input.attempt.threadId,
      senderId: input.attempt.senderId,
      recipientId: input.attempt.recipientId ?? null,
      bodyHash: input.attempt.bodyHash,
      failureReason: failure?.reason ?? null,
    },
  };
}
