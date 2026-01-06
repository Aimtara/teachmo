/* eslint-env node */
import { query } from '../db.js';

export function captureApiMetrics(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const tenant = req.tenant;
    if (!tenant?.organizationId) return;

    const latencyMs = Math.max(0, Date.now() - start);
    const statusCode = res.statusCode || 0;
    const path = String(req.originalUrl || req.url || '').split('?')[0];
    const method = req.method || 'GET';
    const error = statusCode >= 400;

    query(
      `insert into api_request_metrics
        (organization_id, school_id, method, path, status_code, latency_ms, error)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tenant.organizationId,
        tenant.schoolId || null,
        method,
        path,
        statusCode,
        latencyMs,
        error
      ]
    ).catch((err) => {
      console.warn('[metrics] failed to log api request', err?.message || err);
    });
  });

  next();
}
