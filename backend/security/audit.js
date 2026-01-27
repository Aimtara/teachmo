/* eslint-env node */
import { query } from '../db.js';

function getIp(req) {
  // If behind proxy, you may want app.set('trust proxy', 1)
  const xf = req.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress ?? null;
}

export async function auditEvent(
  req,
  {
    eventType,
    severity = 'info',
    userId = null,
    familyId = null,
    statusCode = null,
    meta = {}
  } = {}
) {
  try {
    const ip = getIp(req);
    const userAgent = req.get('user-agent') ?? null;
    const method = req.method ?? null;
    const path = req.originalUrl ?? req.url ?? null;
    const requestId = req.get('x-request-id') ?? null;

    await query(
      `
      INSERT INTO security_audit_events
        (event_type, severity, user_id, family_id, ip, user_agent, method, path, status_code, request_id, meta)
      VALUES
        ($1, $2, $3, $4, $5::inet, $6, $7, $8, $9, $10, $11::jsonb)
      `,
      [
        eventType,
        severity,
        userId,
        familyId,
        ip,
        userAgent,
        method,
        path,
        statusCode,
        requestId,
        JSON.stringify(meta ?? {})
      ]
    );
  } catch {
    // Audit must never break the request path.
  }
}

export async function auditEventBare({
  eventType,
  severity = 'info',
  userId = null,
  familyId = null,
  statusCode = null,
  meta = {}
} = {}) {
  try {
    await query(
      `
      INSERT INTO security_audit_events
        (event_type, severity, user_id, family_id, status_code, meta)
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [eventType, severity, userId, familyId, statusCode, JSON.stringify(meta ?? {})]
    );
  } catch {
    // Audit must never break the request path.
  }
}
