import { describe, expect, it } from 'vitest';
import { redactRecord } from '@/observability/redaction';

describe('redactRecord', () => {
  it('redacts sensitive keys and obvious PII values', () => {
    const result = redactRecord({
      token: 'secret-token',
      email: 'student@example.com',
      nested: {
        messageBody: 'hello',
        safe: 'ok',
        phoneValue: '555-123-4567',
      },
    }) as Record<string, unknown>;

    expect(result.token).toBe('[REDACTED]');
    expect(result.email).toBe('[REDACTED]');
    expect(result.nested).toMatchObject({
      messageBody: '[REDACTED]',
      safe: 'ok',
      phoneValue: '[REDACTED]',
    });
  });
});
