import { isUuid, sanitizeEventName, sanitizeTelemetryMetadata } from '../telemetry';

describe('telemetry sanitizer', () => {
  it('validates event names with strict allowlist', () => {
    expect(sanitizeEventName('workflow.dispatched')).toBe('workflow.dispatched');
    expect(sanitizeEventName('user-login')).toBe('user-login');
    expect(sanitizeEventName('BadName')).toBe('');
    expect(sanitizeEventName('invalid space')).toBe('');
  });

  it('validates uuid values', () => {
    // Valid UUIDs in canonical format
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true); // v4
    expect(isUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true); // v1
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true); // nil UUID
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true); // uppercase
    expect(isUuid('550e8400-E29B-41d4-A716-446655440000')).toBe(true); // mixed case
    expect(isUuid('  550e8400-e29b-41d4-a716-446655440000  ')).toBe(true); // with whitespace (trimmed)
    
    // Invalid formats
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('550e8400-e29b-41d4-a716-44665544000')).toBe(false); // too short
    expect(isUuid('550e8400-e29b-41d4-a716-4466554400000')).toBe(false); // too long
    expect(isUuid('550e8400e29b41d4a716446655440000')).toBe(false); // no dashes
    expect(isUuid('550e8400-e29b-41d4-a716-44665544000g')).toBe(false); // invalid character
    expect(isUuid('')).toBe(false); // empty string
    expect(isUuid(null)).toBe(false); // null
    expect(isUuid(undefined)).toBe(false); // undefined
    expect(isUuid(123)).toBe(false); // number
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

  it('truncates arrays exceeding maxArray limit', () => {
    const largeArray = Array.from({ length: 50 }, (_, i) => i);
    
    const result = sanitizeTelemetryMetadata({ items: largeArray });
    expect(result.truncated).toBe(true);
    expect(Array.isArray(result.value.items)).toBe(true);
    expect(result.value.items.length).toBe(31); // 30 items + '[TRUNCATED_ARRAY]' marker
    expect(result.value.items[30]).toBe('[TRUNCATED_ARRAY]');
    expect(result.value.items[0]).toBe(0);
    expect(result.value.items[29]).toBe(29);
  });
});
