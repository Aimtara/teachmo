/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';

const router = Router();
const OPS_ADMIN_KEY = process.env.OPS_ADMIN_KEY || '';
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const MAX_HOURS = 168;

const clampLimit = (value, fallback = DEFAULT_LIMIT) => {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, parsed));
};

const clampHours = (value, fallback = 48) => {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(MAX_HOURS, parsed));
};

const resolveOpsActor = (req) => req.get('x-ops-actor') || null;

const tableExists = async (tableName) => {
  const res = await query('SELECT to_regclass($1) as name', [`public.${tableName}`]);
  return Boolean(res.rows?.[0]?.name);
};

const insertAnomalyAction = async ({ familyId, anomalyType, action, actor, note, meta }) => {
  try {
    await query(
      `
      INSERT INTO orchestrator_anomaly_actions
        (family_id, anomaly_type, action, actor, note, meta)
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [familyId, anomalyType, action, actor, note ?? null, JSON.stringify(meta ?? {})]
    );
  } catch (err) {
    return null;
  }
  return true;
};

const updateAnomalyStatus = async ({ familyId, anomalyType, status, note, actor }) => {
  let sql = '';
  const params = [familyId, anomalyType, actor, note ?? null];

  if (status === 'acknowledged') {
    sql = `
      UPDATE orchestrator_anomalies
      SET status = 'acknowledged',
          acknowledged_at = now(),
          acknowledged_by = $3,
          status_note = COALESCE($4, status_note),
          updated_at = now()
      WHERE family_id = $1 AND anomaly_type = $2
      RETURNING *
    `;
  } else if (status === 'closed') {
    sql = `
      UPDATE orchestrator_anomalies
      SET status = 'closed',
          closed_at = now(),
          closed_by = $3,
          status_note = COALESCE($4, status_note),
          updated_at = now()
      WHERE family_id = $1 AND anomaly_type = $2
      RETURNING *
    `;
  } else if (status === 'open') {
    sql = `
      UPDATE orchestrator_anomalies
      SET status = 'open',
          acknowledged_at = NULL,
          acknowledged_by = NULL,
          closed_at = NULL,
          closed_by = NULL,
          status_note = COALESCE($4, status_note),
          updated_at = now()
      WHERE family_id = $1 AND anomaly_type = $2
      RETURNING *
    `;
  }

  if (!sql) {
    throw new Error('invalid_status');
  }

  const result = await query(sql, params);
  if (!result.rows?.[0]) return null;

  await insertAnomalyAction({
    familyId,
    anomalyType,
    action: status === 'open' ? 'reopened' : status,
    actor,
    note,
    meta: { status },
  });

  return result.rows[0];
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

    const hasFamilies = await tableExists('families');
    if (hasFamilies) {
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
      return;
    }

    const hasMemberships = await tableExists('family_memberships');
    if (!hasMemberships) {
      res.json({ families: [] });
      return;
    }

    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE family_id ILIKE $${params.length}`;
    }
    params.push(limit);

    const result = await query(
      `
      SELECT family_id as id,
             NULL as name,
             'active' as status,
             MIN(created_at) as created_at,
             MAX(created_at) as updated_at
      FROM family_memberships
      ${where}
      GROUP BY family_id
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

router.post('/families/:familyId/anomalies/:type/ack', async (req, res) => {
  try {
    const { familyId, type } = req.params;
    const note = req.body?.note ? String(req.body.note) : null;
    const actor = resolveOpsActor(req);

    const anomaly = await updateAnomalyStatus({
      familyId,
      anomalyType: type,
      status: 'acknowledged',
      note,
      actor,
    });

    if (!anomaly) {
      res.status(404).json({ error: 'anomaly_not_found' });
      return;
    }

    res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:type/close', async (req, res) => {
  try {
    const { familyId, type } = req.params;
    const note = req.body?.note ? String(req.body.note) : null;
    const actor = resolveOpsActor(req);

    const anomaly = await updateAnomalyStatus({
      familyId,
      anomalyType: type,
      status: 'closed',
      note,
      actor,
    });

    if (!anomaly) {
      res.status(404).json({ error: 'anomaly_not_found' });
      return;
    }

    res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:type/reopen', async (req, res) => {
  try {
    const { familyId, type } = req.params;
    const note = req.body?.note ? String(req.body.note) : null;
    const actor = resolveOpsActor(req);

    const anomaly = await updateAnomalyStatus({
      familyId,
      anomalyType: type,
      status: 'open',
      note,
      actor,
    });

    if (!anomaly) {
      res.status(404).json({ error: 'anomaly_not_found' });
      return;
    }

    res.json({ anomaly });
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
      LEFT JOIN orchestrator_alert_endpoints e ON d.endpoint_id = e.id
      WHERE d.family_id = $1
      ORDER BY d.created_at DESC
      LIMIT $2
      `,
      [familyId, limit]
    );

    res.json({ alerts: out.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/mitigations', async (req, res) => {
  try {
    const { familyId } = req.params;
    const out = await query(
      `
      SELECT *
      FROM orchestrator_mitigations
      WHERE family_id = $1
      ORDER BY last_updated DESC NULLS LAST
      `,
      [familyId]
    );

    res.json({ mitigations: out.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/mitigations/:type/clear', async (req, res) => {
  try {
    const { familyId, type } = req.params;

    const upserted = await query(
      `
      INSERT INTO orchestrator_mitigations
        (family_id, mitigation_type, active, last_updated, expires_at)
      VALUES
        ($1, $2, false, now(), NULL)
      ON CONFLICT (family_id, mitigation_type)
      DO UPDATE SET active = false,
                    last_updated = now(),
                    expires_at = NULL
      RETURNING *
      `,
      [familyId, type]
    );

    const mitigation = upserted.rows?.[0] || null;

    if (mitigation?.previous_state_json) {
      const state = await orchestratorPgStore.getState(familyId);
      if (state) {
        const previous = mitigation.previous_state_json;
        const next = {
          ...state,
          cooldownUntil: previous?.cooldownUntil ?? null,
          maxNotificationsPerHour: previous?.maxNotificationsPerHour ?? state.maxNotificationsPerHour,
          mitigation: null,
          updatedAt: new Date().toISOString(),
        };
        await orchestratorPgStore.upsertState(next);
      }
    }

    res.json({ mitigation });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/timeline', async (req, res) => {
  try {
    const { familyId } = req.params;
    const hours = clampHours(req.query.hours, 48);

    const hourlyRows = await query(
      `
      SELECT *
      FROM orchestrator_hourly_snapshots
      WHERE family_id = $1
        AND hour >= now() - ($2::int * interval '1 hour')
      ORDER BY hour DESC
      `,
      [familyId, hours]
    );

    const anomalies = await query(
      `
      SELECT *
      FROM orchestrator_anomalies
      WHERE family_id = $1
        AND last_seen >= now() - ($2::int * interval '1 hour')
      ORDER BY last_seen DESC
      `,
      [familyId, hours]
    );

    const actions = await query(
      `
      SELECT *
      FROM orchestrator_anomaly_actions
      WHERE family_id = $1
        AND created_at >= now() - ($2::int * interval '1 hour')
      ORDER BY created_at DESC
      `,
      [familyId, hours]
    );

    const alerts = await query(
      `
      SELECT d.*, e.type as endpoint_type, e.target as endpoint_target
      FROM orchestrator_alert_deliveries d
      LEFT JOIN orchestrator_alert_endpoints e ON d.endpoint_id = e.id
      WHERE d.family_id = $1
        AND d.created_at >= now() - ($2::int * interval '1 hour')
      ORDER BY d.created_at DESC
      `,
      [familyId, hours]
    );

    const mitigations = await query(
      `
      SELECT *,
             COALESCE(last_updated, activated_at, now()) as updated_at_safe
      FROM orchestrator_mitigations
      WHERE family_id = $1
        AND COALESCE(last_updated, activated_at, now()) >= now() - ($2::int * interval '1 hour')
      ORDER BY last_updated DESC NULLS LAST
      `,
      [familyId, hours]
    );

    const events = [
      ...(anomalies.rows || []).map((row) => ({
        ...row,
        event_type: 'anomaly_state',
        timestamp: row.last_seen,
      })),
      ...(actions.rows || []).map((row) => ({
        ...row,
        event_type: 'anomaly_action',
        timestamp: row.created_at,
      })),
      ...(alerts.rows || []).map((row) => ({
        ...row,
        event_type: 'alert_delivery',
        timestamp: row.created_at,
      })),
      ...(mitigations.rows || []).map((row) => ({
        ...row,
        event_type: 'mitigation',
        status: row.active ? 'active' : 'cleared',
        timestamp: row.updated_at_safe,
      })),
    ].sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bt - at;
    });

    res.json({
      hours,
      hourlyRows: hourlyRows.rows || [],
      events,
    });
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
      FROM orchestrator_alert_endpoints
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
