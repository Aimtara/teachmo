import { writeAuditLog } from '../auditLog';

jest.mock('@/lib/graphql', () => {
  return {
    graphql: jest.fn(async (_query: string, variables: any) => {
      return {
        insert_audit_log_one: {
          id: '00000000-0000-0000-0000-000000000000',
          created_at: '2025-01-01T00:00:00Z',
          __vars: variables,
        },
      };
    }),
  };
});

describe('writeAuditLog', () => {
  it('does not send actor_id (server-side set)', async () => {
    const row: any = await writeAuditLog({
      actorId: 'ignored',
      action: 'ui.error',
      entityType: 'component',
      entityId: null,
      metadata: { foo: 'bar' },
    });

    const inserted = row.__vars.object;
    expect(inserted.actor_id).toBeUndefined();
    expect(inserted.action).toBe('ui.error');
    expect(inserted.entity_type).toBe('component');
    expect(inserted.metadata).toEqual({ foo: 'bar' });
  });

  describe('sanitization - sensitive key redaction', () => {
    it('redacts password fields', async () => {
      const row: any = await writeAuditLog({
        action: 'user.update',
        entityType: 'user',
        metadata: { password: 'secret123', username: 'john' },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.password).toBe('[REDACTED]');
      expect(inserted.metadata.username).toBe('john');
      expect(inserted.metadata.meta_redacted).toBe(true);
    });

    it('redacts token fields', async () => {
      const row: any = await writeAuditLog({
        action: 'auth.login',
        entityType: 'session',
        metadata: { access_token: 'xyz123', user_id: '456' },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.access_token).toBe('[REDACTED]');
      expect(inserted.metadata.user_id).toBe('456');
      expect(inserted.metadata.meta_redacted).toBe(true);
    });

    it('redacts stack and componentstack fields', async () => {
      const row: any = await writeAuditLog({
        action: 'error.caught',
        entityType: 'error',
        metadata: {
          message: 'Error occurred',
          stack: 'Error: something\n  at file.js:10',
          componentStack: 'in Component\n  in App',
        },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.message).toBe('Error occurred');
      expect(inserted.metadata.stack).toBe('[REDACTED]');
      expect(inserted.metadata.componentStack).toBe('[REDACTED]');
      expect(inserted.metadata.meta_redacted).toBe(true);
    });

    it('redacts multiple sensitive keys', async () => {
      const row: any = await writeAuditLog({
        action: 'security.check',
        entityType: 'auth',
        metadata: {
          jwt: 'token123',
          api_key: 'key456',
          cookie: 'session=abc',
          safe: 'visible',
        },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.jwt).toBe('[REDACTED]');
      expect(inserted.metadata.api_key).toBe('[REDACTED]');
      expect(inserted.metadata.cookie).toBe('[REDACTED]');
      expect(inserted.metadata.safe).toBe('visible');
      expect(inserted.metadata.meta_redacted).toBe(true);
    });
  });

  describe('sanitization - sensitive value redaction', () => {
    it('redacts email addresses', async () => {
      const row: any = await writeAuditLog({
        action: 'contact.add',
        entityType: 'contact',
        metadata: { email_value: 'user@example.com', name: 'John' },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.email_value).toBe('[REDACTED]');
      expect(inserted.metadata.name).toBe('John');
      expect(inserted.metadata.meta_redacted).toBe(true);
    });

    it('redacts phone numbers', async () => {
      const row: any = await writeAuditLog({
        action: 'contact.add',
        entityType: 'contact',
        metadata: { phone: '+1-555-123-4567', name: 'Jane' },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.phone).toBe('[REDACTED]');
      expect(inserted.metadata.name).toBe('Jane');
      expect(inserted.metadata.meta_redacted).toBe(true);
    });

    it('redacts long token-like strings', async () => {
      const row: any = await writeAuditLog({
        action: 'api.call',
        entityType: 'request',
        metadata: {
          bearer: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
          short: 'ok',
        },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.bearer).toBe('[REDACTED]');
      expect(inserted.metadata.short).toBe('ok');
      expect(inserted.metadata.meta_redacted).toBe(true);
    });
  });

  describe('sanitization - string truncation', () => {
    it('truncates strings longer than 400 characters', async () => {
      const longString = 'The quick brown fox jumps over the lazy dog. '.repeat(20); // ~900 chars
      const row: any = await writeAuditLog({
        action: 'data.process',
        entityType: 'data',
        metadata: { long: longString, short: 'ok' },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.long).toHaveLength(401); // 400 + '…'
      expect(inserted.metadata.long.endsWith('…')).toBe(true);
      expect(inserted.metadata.short).toBe('ok');
      expect(inserted.metadata.meta_truncated).toBe(true);
    });

    it('does not truncate strings at or under 400 characters', async () => {
      const baseString = 'The quick brown fox jumps over the lazy dog. ';
      const exactString = baseString.repeat(Math.ceil(400 / baseString.length)).slice(0, 400);
      const row: any = await writeAuditLog({
        action: 'data.process',
        entityType: 'data',
        metadata: { exact: exactString },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.exact).toBe(exactString);
      expect(inserted.metadata.exact).toHaveLength(400);
      expect(inserted.metadata.meta_truncated).toBeUndefined();
    });
  });

  describe('sanitization - deep object truncation', () => {
    it('truncates objects deeper than 4 levels', async () => {
      const row: any = await writeAuditLog({
        action: 'data.nested',
        entityType: 'data',
        metadata: {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: 'too deep',
                },
              },
            },
          },
        },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.level1.level2.level3.level4.level5).toBe('[TRUNCATED]');
      expect(inserted.metadata.meta_truncated).toBe(true);
    });

    it('allows objects up to 4 levels deep', async () => {
      const row: any = await writeAuditLog({
        action: 'data.nested',
        entityType: 'data',
        metadata: {
          level1: {
            level2: {
              level3: {
                level4: 'ok',
              },
            },
          },
        },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.level1.level2.level3.level4).toBe('ok');
      expect(inserted.metadata.meta_truncated).toBeUndefined();
    });
  });

  describe('sanitization - array truncation', () => {
    it('truncates arrays with more than 30 items', async () => {
      const largeArray = Array.from({ length: 50 }, (_, i) => i);
      const row: any = await writeAuditLog({
        action: 'data.array',
        entityType: 'data',
        metadata: { items: largeArray },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.items).toHaveLength(31); // 30 items + '[TRUNCATED_ARRAY]'
      expect(inserted.metadata.items[30]).toBe('[TRUNCATED_ARRAY]');
      expect(inserted.metadata.meta_truncated).toBe(true);
    });

    it('does not truncate arrays with 30 or fewer items', async () => {
      const smallArray = Array.from({ length: 30 }, (_, i) => i);
      const row: any = await writeAuditLog({
        action: 'data.array',
        entityType: 'data',
        metadata: { items: smallArray },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.items).toHaveLength(30);
      expect(inserted.metadata.items[29]).toBe(29);
      expect(inserted.metadata.meta_truncated).toBeUndefined();
    });
  });

  describe('sanitization - object key truncation', () => {
    it('truncates objects with more than 60 keys', async () => {
      const largeObject: Record<string, number> = {};
      for (let i = 0; i < 70; i++) {
        largeObject[`key${i}`] = i;
      }

      const row: any = await writeAuditLog({
        action: 'data.object',
        entityType: 'data',
        metadata: { data: largeObject },
      });

      const inserted = row.__vars.object;
      expect(Object.keys(inserted.metadata.data)).toHaveLength(61); // 60 + __dropped_keys
      expect(inserted.metadata.data.__dropped_keys).toBe(10);
      expect(inserted.metadata.meta_truncated).toBe(true);
    });
  });

  describe('sanitization - byte limit enforcement', () => {
    it('bounds metadata to 4096 bytes', async () => {
      // Create an object that will exceed 4096 bytes even after sanitization
      const largeObject: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        largeObject[`key${i}`] = 'This is a long string that will contribute to byte size. '.repeat(10);
      }

      const row: any = await writeAuditLog({
        action: 'data.large',
        entityType: 'data',
        metadata: largeObject,
      });

      const inserted = row.__vars.object;
      // After sanitization, if still over 4096 bytes, should be dropped
      expect(inserted.metadata.__dropped).toBe(true);
      expect(inserted.metadata.meta_truncated).toBe(true);
    });

    it('bounds before_snapshot to 4096 bytes', async () => {
      const largeObject: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        largeObject[`key${i}`] = 'This is a long string that will contribute to byte size. '.repeat(10);
      }

      const row: any = await writeAuditLog({
        action: 'data.update',
        entityType: 'data',
        before: largeObject,
      });

      const inserted = row.__vars.object;
      expect(inserted.before_snapshot.__dropped).toBe(true);
      expect(inserted.metadata.meta_truncated).toBe(true);
    });

    it('bounds after_snapshot to 4096 bytes', async () => {
      const largeObject: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        largeObject[`key${i}`] = 'This is a long string that will contribute to byte size. '.repeat(10);
      }

      const row: any = await writeAuditLog({
        action: 'data.update',
        entityType: 'data',
        after: largeObject,
      });

      const inserted = row.__vars.object;
      expect(inserted.after_snapshot.__dropped).toBe(true);
      expect(inserted.metadata.meta_truncated).toBe(true);
    });
  });

  describe('sanitization - flag aggregation', () => {
    it('sets meta_truncated when any field is truncated', async () => {
      const row: any = await writeAuditLog({
        action: 'test.flags',
        entityType: 'test',
        metadata: { long: 'The quick brown fox jumps over the lazy dog. '.repeat(20) },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.meta_truncated).toBe(true);
    });

    it('sets meta_redacted when any field is redacted', async () => {
      const row: any = await writeAuditLog({
        action: 'test.flags',
        entityType: 'test',
        metadata: { email: 'test@example.com' },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.meta_redacted).toBe(true);
    });

    it('sets both flags when both truncation and redaction occur', async () => {
      const row: any = await writeAuditLog({
        action: 'test.flags',
        entityType: 'test',
        metadata: {
          email: 'test@example.com',
          long: 'The quick brown fox jumps over the lazy dog. '.repeat(20),
        },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.meta_truncated).toBe(true);
      expect(inserted.metadata.meta_redacted).toBe(true);
    });

    it('does not set flags when no sanitization occurs', async () => {
      const row: any = await writeAuditLog({
        action: 'test.flags',
        entityType: 'test',
        metadata: { safe: 'data', count: 123 },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.meta_truncated).toBeUndefined();
      expect(inserted.metadata.meta_redacted).toBeUndefined();
    });
  });

  describe('sanitization - combined scenarios', () => {
    it('handles complex nested objects with multiple sanitization needs', async () => {
      const row: any = await writeAuditLog({
        action: 'complex.test',
        entityType: 'test',
        metadata: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'secret123',
          },
          logs: Array.from({ length: 40 }, (_, i) => ({ id: i, msg: `Message number ${i}` })),
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ',
        },
      });

      const inserted = row.__vars.object;
      expect(inserted.metadata.user.name).toBe('John Doe');
      expect(inserted.metadata.user.email).toBe('[REDACTED]');
      expect(inserted.metadata.user.password).toBe('[REDACTED]');
      expect(inserted.metadata.logs).toHaveLength(31); // 30 + TRUNCATED marker
      expect(inserted.metadata.token).toBe('[REDACTED]');
      expect(inserted.metadata.meta_truncated).toBe(true);
      expect(inserted.metadata.meta_redacted).toBe(true);
    });
  });
});
