import { z } from 'zod';
import { nhostGraphqlRequest } from './_shared/nhostGraphql';

const BodySchema = z.object({
  action: z.string().min(1),
  entity_type: z.string().min(1).optional(),
  entity_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.any()).optional(),
  before: z.record(z.any()).optional(),
  after: z.record(z.any()).optional(),
  changes: z.record(z.any()).optional(),

  // Accept legacy/UI shapes
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

function buildChangeDetails(before?: Record<string, any>, after?: Record<string, any>) {
  if (!before || !after) return null;
  const changes: Record<string, any> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  keys.forEach((key) => {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (beforeValue !== afterValue) {
      changes[key] = { before: beforeValue ?? null, after: afterValue ?? null };
    }
  });
  return Object.keys(changes).length ? changes : null;
}

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
    const diff = body.changes ?? buildChangeDetails(body.before, body.after);
    if (diff) {
      metadata.change_details = diff;
    }

    const data = await nhostGraphqlRequest({
      query: MUTATION,
      variables: {
        object: {
          action: body.action,
          entity_type: entityType,
          entity_id: entityId,
          metadata,
          before_snapshot: body.before ?? null,
          after_snapshot: body.after ?? null,
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
