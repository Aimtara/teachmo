import { describe, expect, it } from 'vitest';
import { buildEventPayload } from '../events';

describe('observability events', () => {
  it('builds canonical payloads with timestamps and redacted metadata', () => {
    const payload = buildEventPayload({
      name: 'message.sent',
      actor: { userId: 'user-1', role: 'teacher' },
      scope: { organizationId: 'org-1', schoolId: 'school-1' },
      entity: { type: 'message', id: 'message-1' },
      metadata: { body: 'hello child', email: 'parent@example.com', safe: 'ok' },
    });

    expect(payload.name).toBe('message.sent');
    expect(payload.timestamp).toEqual(expect.any(String));
    expect(payload.metadata).toMatchObject({
      body: '[REDACTED]',
      email: '[REDACTED]',
      safe: 'ok',
    });
  });
});
