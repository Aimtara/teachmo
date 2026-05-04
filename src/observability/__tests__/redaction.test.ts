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

  it('redacts nested arrays, auth material, AI prompts, addresses, and child/student data', () => {
    const result = redactRecord({
      authorization: 'Bearer abcdefghijklmnopqrstuvwxyz123456',
      aiPrompt: 'Summarize this student note',
      vendorPayload: {
        rawPrompt: 'Use private student context',
        responseBody: 'model output',
      },
      children: [
        {
          childName: 'Pat Student',
          studentName: 'Sam Learner',
          homeAddress: '123 Main St, Springfield',
          note: 'non-sensitive aggregate',
        },
      ],
      contact: {
        phone: '(555) 123-4567',
        emailAddress: 'guardian@example.com',
      },
    }) as Record<string, unknown>;

    expect(result.authorization).toBe('[REDACTED]');
    expect(result.aiPrompt).toBe('[REDACTED]');
    expect(result.vendorPayload).toBe('[REDACTED]');
    expect(result.children).toEqual([
      {
        childName: '[REDACTED]',
        studentName: '[REDACTED]',
        homeAddress: '[REDACTED]',
        note: 'non-sensitive aggregate',
      },
    ]);
    expect(result.contact).toMatchObject({
      phone: '[REDACTED]',
      emailAddress: '[REDACTED]',
    });
  });
});
