import { writeAuditLog } from '../auditLog';
import { graphql } from '@/lib/graphql';

vi.mock('@/lib/graphql', () => ({
  graphql: vi.fn(async (_query, variables) => ({
        insert_audit_log_one: {
          id: '00000000-0000-0000-0000-000000000000',
          created_at: '2025-01-01T00:00:00Z',
          __vars: variables,
        },
      })),
}));

const graphqlMock = vi.mocked(graphql);

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
    expect(graphqlMock).toHaveBeenCalledTimes(1);
  });
});
