import { z } from 'zod';
import { nhostGraphqlRequest } from './_shared/nhostGraphql';

const BodySchema = z.object({
  action: z.string().min(1),
  entity_type: z.string().min(1).optional(),
  entity_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.any()).optional(),

  // Phase 1 Requirement: State snapshots for defensibility
  before: z.record(z.any()).optional(),
  after: z.record(z.any()).optional(),

  // Legacy fields for backward compatibility
  resource_type: z.string().min(1).optional(),
  resource_id: z.any().optional(),
  details: z.any().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
});

const MUTATION = `
  mutation InsertAuditLog($object: audit_log_insert_input!) {
    insert_audit_log_one(object: $object) {
      id
      created_at
    }
  }
`;

export default async (req, res) => {
  try {
    const body = BodySchema.parse(req.body ?? {});

    const entityType = body.entity_type || body.resource_type || 'unknown';
    const entityId = body.entity_id ?? null;

    const metadata = {
      ...(typeof body.details === 'object' && body.details ? body.details : {}),
      ...(body.metadata ?? {}),
      ...(body.resource_id !== undefined ? { resource_id: body.resource_id } : {}),
      ...(body.severity ? { severity: body.severity } : {}),
    };

    const data = await nhostGraphqlRequest({
      query: MUTATION,
      variables: {
        object: {
          action: body.action,
          entity_type: entityType,
          entity_id: entityId,
          metadata,
          // Capture snapshots
          before_snapshot: body.before ?? null,
          after_snapshot: body.after ?? null,
          actor_id: req.headers['x-hasura-user-id'] || null,
          organization_id: req.headers['x-hasura-organization-id'] || null,
        },
      },
      headers: {
        ...(req.headers?.authorization ? { Authorization: req.headers.authorization } : {}),
        ...(req.headers?.['x-hasura-role'] ? { 'x-hasura-role': req.headers['x-hasura-role'] } : {}),
      },
    });

    const row = data?.insert_audit_log_one;
    res.status(200).json({ recorded: Boolean(row?.id), id: row?.id, created_at: row?.created_at });
  } catch (error) {
    console.error('Audit Log Error:', error);
    const status = error?.name === 'ZodError' ? 400 : 500;
    res.status(status).json({ recorded: false, error: error?.message ?? 'unknown error' });
  }
};
