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
});
