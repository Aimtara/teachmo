import {
  buildMessageIdempotencyKey,
  classifyMessagingFailure,
  computeBackoffMs,
  shouldRetryMessagingSend,
  summarizeDeliveryAttempt,
} from '../messagingReliability';

describe('messaging reliability policy', () => {
  it('builds stable idempotency keys from hashes without message body content', () => {
    const keyA = buildMessageIdempotencyKey({
      threadId: 'thread-1',
      senderId: 'sender-1',
      bodyHash: 'hash-1',
      windowStartIso: '2026-05-05T10:10:30.000Z',
    });
    const keyB = buildMessageIdempotencyKey({
      threadId: 'thread-1',
      senderId: 'sender-1',
      bodyHash: 'hash-1',
      windowStartIso: '2026-05-05T10:10:59.000Z',
    });

    expect(keyA).toBe(keyB);
    expect(keyA).toBe('message:thread-1:sender-1:hash-1:2026-05-05T10:10');
  });

  it('classifies retryable and permanent failures', () => {
    expect(classifyMessagingFailure({ code: 'ETIMEDOUT' })).toMatchObject({ retryable: true });
    expect(classifyMessagingFailure(new Error('503 temporarily unavailable'))).toMatchObject({ retryable: true });
    expect(classifyMessagingFailure(new Error('forbidden'))).toMatchObject({ retryable: false });
  });

  it('uses bounded exponential backoff', () => {
    expect(computeBackoffMs(1, { baseMs: 1000 })).toBe(1000);
    expect(computeBackoffMs(4, { baseMs: 1000 })).toBe(8000);
    expect(computeBackoffMs(99, { baseMs: 1000, maxMs: 30_000 })).toBe(30_000);
  });

  it('stops retrying after the maximum attempt count', () => {
    expect(shouldRetryMessagingSend(new Error('network reset'), 2, { maxAttempts: 3 })).toBe(true);
    expect(shouldRetryMessagingSend(new Error('network reset'), 3, { maxAttempts: 3 })).toBe(false);
  });

  it('summarizes delivery attempts without raw message bodies', () => {
    const summary = summarizeDeliveryAttempt({
      status: 'failed',
      retryAfterMs: 2000,
      error: new Error('timeout'),
      attempt: {
        threadId: 'thread-1',
        senderId: 'sender-1',
        recipientId: 'recipient-1',
        bodyHash: 'hash-1',
        createdAt: '2026-05-05T10:00:00.000Z',
      },
    });

    expect(summary).toMatchObject({
      eventName: 'messaging.delivery_attempt',
      status: 'failed',
      retryable: true,
      metadata: { bodyHash: 'hash-1' },
    });
    expect(JSON.stringify(summary)).not.toContain('homework');
  });
});
