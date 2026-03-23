/* eslint-env node */
import { randomUUID } from 'node:crypto';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('request-context');

const REQUEST_ID_RE = /^[A-Za-z0-9_\-]{1,128}$/;

function getRequestId(req) {
  const incoming = req.get('x-request-id');
  if (incoming && REQUEST_ID_RE.test(incoming)) {
    return incoming;
  }
  return randomUUID();
}

function safePathname(req) {
  const raw = req.originalUrl || req.url || '';
  try {
    return new URL(raw, 'http://localhost').pathname;
  } catch {
    return raw.split('?')[0];
  }
}

export function attachRequestContext(req, res, next) {
  const startedAt = Date.now();
  const requestId = getRequestId(req);

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: safePathname(req),
      statusCode: res.statusCode,
      durationMs,
      role: req.auth?.role || null,
      organizationId: req.tenant?.organizationId || req.auth?.organizationId || req.auth?.districtId || null,
      schoolId: req.tenant?.schoolId || req.auth?.schoolId || null,
      surface: req.baseUrl || 'api',
    });
  });

  next();
}

export function globalErrorHandler(err, req, res, _next) {
  const requestId = req.requestId || req.get('x-request-id') || randomUUID();
  const status = Number(err?.status || err?.statusCode || 500);
  const safeStatus = Number.isFinite(status) && status >= 400 && status < 600 ? status : 500;

  logger.error('Unhandled API error', {
    requestId,
    method: req.method,
    path: safePathname(req),
    role: req.auth?.role || null,
    organizationId: req.tenant?.organizationId || req.auth?.organizationId || req.auth?.districtId || null,
    schoolId: req.tenant?.schoolId || req.auth?.schoolId || null,
    surface: req.baseUrl || 'api',
    errorName: err instanceof Error ? err.name : undefined,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  if (!res.headersSent) {
    res.status(safeStatus).json({
      error: safeStatus === 500 ? 'internal_server_error' : 'request_failed',
      requestId,
    });
  }
}
