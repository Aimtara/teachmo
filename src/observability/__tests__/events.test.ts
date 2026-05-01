import { describe, expect, it } from 'vitest';
import { createObservabilityEvent } from '../events';

describe('observability events', () => {
  it('builds canonical payloads with timestamps and redacted metadata', () => {
    const payload = createObservabilityEvent({
      eventName: 'message.sent',
      actorId: 'user-1',
      role: 'teacher',
      organizationId: 'org-1',
      schoolId: 'school-1',
      entityType: 'message',
      entityId: 'message-1',
      metadata: { body: 'hello child', email: 'parent@example.com', safe: 'ok' },
    });

    expect(payload.eventName).toBe('message.sent');
    expect(payload.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(payload.metadata).toMatchObject({
      body: '[REDACTED]',
      email: '[REDACTED]',
      safe: 'ok',
    });
  });
});
