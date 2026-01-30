import { isUuid, sanitizeEventName, sanitizeTelemetryMetadata } from '../telemetry';

describe('telemetry sanitizer', () => {
  it('validates event names with strict allowlist', () => {
    expect(sanitizeEventName('workflow.dispatched')).toBe('workflow.dispatched');
    expect(sanitizeEventName('user-login')).toBe('user-login');
    expect(sanitizeEventName('BadName')).toBe('');
    expect(sanitizeEventName('invalid space')).toBe('');
  });

  it('validates uuid values', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('redacts sensitive keys and values', () => {
    const result = sanitizeTelemetryMetadata({
      token: 'abc123',
      email: 'teacher@example.org',
      phone: '+1 (415) 555-1234',
      message: 'hello world',
      safe: 'ok'
    });

    expect(result.value).toEqual(
      expect.objectContaining({
        token: '[REDACTED]',
        email: '[REDACTED]',
        phone: '[REDACTED]',
        message: '[REDACTED]',
        safe: 'ok'
      })
    );
    expect(result.redacted).toBe(true);
  });

  it('bounds payload sizes', () => {
    const payload = {
      note: 'a'.repeat(1000),
      nested: { values: Array.from({ length: 100 }, (_, i) => `token-${i}`) }
    };

    const result = sanitizeTelemetryMetadata(payload, { maxBytes: 200 });
    expect(result.truncated).toBe(true);
    expect(result.value).toEqual(expect.anything());
  });
});
