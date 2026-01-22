/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = Router();
const OPS_ADMIN_KEY = process.env.OPS_ADMIN_KEY || '';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
};

const requireOpsAdmin = (req, res, next) => {
  if (!OPS_ADMIN_KEY) {
    return res.status(500).json({ error: 'ops_admin_key_not_configured' });
  }
  const headerKey = req.get('x-ops-admin-key');
  if (!headerKey || headerKey !== OPS_ADMIN_KEY) {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
};

const fetchWithTimeout = async (url, opts, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, text: text.slice(0, 1200) };
  } finally {
    clearTimeout(timeout);
  }
};

router.use(requireOpsAdmin);

router.get('/families', async (req, res) => {
  try {
    const limit = clampLimit(req.query.limit, DEFAULT_LIMIT);
    const q = req.query.q ? String(req.query.q).trim() : '';
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      params.push(`%${q}%`);
      where = `WHERE id ILIKE $${params.length - 1} OR name ILIKE $${params.length}`;
    }
    params.push(limit);

    const result = await query(
      `
      SELECT id, name, status, created_at, updated_at
      FROM families
      ${where}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT $${params.length}
      `,
      params
    );

    res.json({ families: result.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/health', async (req, res) => {
  try {
    const { familyId } = req.params;
    const daily = await query(
      `
      SELECT *
      FROM orchestrator_daily_snapshots
      WHERE family_id = $1
      ORDER BY day DESC
      LIMIT 1
      `,
      [familyId]
    );

    const hourly = await query(
      `
      SELECT *
      FROM orchestrator_hourly_snapshots
      WHERE family_id = $1
        AND hour >= date_trunc('day', now())
        AND hour < date_trunc('day', now()) + interval '1 day'
      ORDER BY hour ASC
      `,
      [familyId]
    );

    res.json({ daily: daily.rows?.[0] || null, hourly: hourly.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/anomalies', async (req, res) => {
  try {
    const { familyId } = req.params;
    const status = req.query.status ? String(req.query.status) : null;
    const limit = clampLimit(req.query.limit, 50);
    const params = [familyId];
    let where = 'WHERE family_id = $1';
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }
    params.push(limit);

    const out = await query(
      `
      SELECT *
      FROM orchestrator_anomalies
      ${where}
      ORDER BY last_seen DESC
      LIMIT $${params.length}
      `,
      params
    );

    res.json({ anomalies: out.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/alerts', async (req, res) => {
  try {
    const { familyId } = req.params;
    const limit = clampLimit(req.query.limit, 50);

    const out = await query(
      `
      SELECT d.*, e.type as endpoint_type, e.target as endpoint_target
      FROM orchestrator_alert_deliveries d
      LEFT JOIN family_alert_endpoints e ON d.endpoint_id = e.id
      WHERE d.family_id = $1
      ORDER BY d.created_at DESC
      LIMIT $2
      `,
      [familyId, limit]
    );

    res.json({ deliveries: out.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/mitigation', async (req, res) => {
  try {
    const { familyId } = req.params;
    const out = await query(
      `
      SELECT *
      FROM orchestrator_mitigation_state
      WHERE family_id = $1
      LIMIT 1
      `,
      [familyId]
    );

    res.json({ mitigation: out.rows?.[0] || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/mitigation/clear', async (req, res) => {
  try {
    const { familyId } = req.params;
    const out = await query(
      `
      INSERT INTO orchestrator_mitigation_state (family_id, active, params, updated_at, cleared_at)
      VALUES ($1, false, '{}'::jsonb, now(), now())
      ON CONFLICT (family_id)
      DO UPDATE SET active = false,
                    updated_at = now(),
                    cleared_at = now()
      RETURNING *
      `,
      [familyId]
    );

    res.json({ mitigation: out.rows?.[0] || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/test-alert', async (req, res) => {
  try {
    const { familyId } = req.params;
    const severity = req.body?.severity === 'error' ? 'error' : 'warn';

    const endpoints = await query(
      `
      SELECT id, type, target, secret
      FROM family_alert_endpoints
      WHERE family_id = $1 AND enabled = true
      ORDER BY created_at ASC
      `,
      [familyId]
    );

    const payload = {
      kind: 'teachmo.ops.test_alert',
      familyId,
      severity,
      message: `Ops test alert (${severity})`,
      requestedAt: new Date().toISOString(),
    };

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const deliveries = [];

    for (const endpoint of endpoints.rows) {
      let status = 'sent';
      let responseCode = null;
      let responseBody = null;

      try {
        if (endpoint.type === 'slack') {
          const text = `🔧 Teachmo ops test (${severity}) for family ${familyId}`;
          const r = await fetchWithTimeout(endpoint.target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, context: payload }),
          });
          responseCode = r.status;
          responseBody = r.text;
          status = r.ok ? 'sent' : 'failed';
        } else if (endpoint.type === 'webhook') {
          const r = await fetchWithTimeout(endpoint.target, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          responseCode = r.status;
          responseBody = r.text;
          status = r.ok ? 'sent' : 'failed';
        } else if (endpoint.type === 'email') {
          status = 'skipped';
          responseBody = 'email_not_implemented';
        } else {
          status = 'skipped';
          responseBody = `unsupported_endpoint_type:${endpoint.type}`;
        }
      } catch (err) {
        status = 'failed';
        responseBody = err instanceof Error ? err.message : String(err);
      }

      if (status === 'sent') sent += 1;
      if (status === 'failed') failed += 1;
      if (status === 'skipped') skipped += 1;

      const dedupeKey = `ops:${familyId}:${endpoint.id}:${crypto.randomUUID()}`;
      const saved = await query(
        `
        INSERT INTO orchestrator_alert_deliveries
          (endpoint_id, family_id, anomaly_type, severity, dedupe_key, status, response_code, response_body, payload_json)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING *
        `,
        [
          endpoint.id,
          familyId,
          'ops_test_alert',
          severity,
          dedupeKey,
          status,
          responseCode,
          responseBody,
          JSON.stringify(payload),
        ]
      );

      deliveries.push(saved.rows?.[0]);
    }

    res.json({ summary: { sent, failed, skipped }, deliveries });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

export default router;
