/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';
import { auditEventBare } from '../security/audit.js';

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

const opsActor = (req) => {
  const explicit = req.get('x-ops-actor');
  if (explicit) return explicit.slice(0, 120);
  // Don't try to be clever; we just need a stable-ish operator label for the timeline.
  return 'ops_admin';
};

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

  await auditEventBare({
    eventType: 'ops_anomaly_status_change',
    severity: 'info',
    familyId,
    statusCode: 200,
    meta: { anomalyType, status, actor, note: note ?? null, at: new Date().toISOString() },
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
    const hasFamilies = await tableExists('families');

    if (hasFamilies) {
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

      return res.json({ families: result.rows || [] });
    }

    // Fallback: derive the “directory” from family_memberships.
    // This keeps ops usable even if the optional families table wasn't created.
    const hasMemberships = await tableExists('family_memberships');
    if (!hasMemberships) {
      return res.json({ families: [] });
    }

    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE family_id ILIKE $${params.length}`;
    }
    params.push(limit);

    const result = await query(
      `
      SELECT
        family_id AS id,
        NULL::text AS name,
        'active'::text AS status,
        MIN(created_at) AS created_at,
        MAX(created_at) AS updated_at
      FROM family_memberships
      ${where}
      GROUP BY family_id
      ORDER BY MAX(created_at) DESC
      LIMIT $${params.length}
      `,
      params
    );

    return res.json({ families: result.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
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

    return res.json({ daily: daily.rows?.[0] || null, hourly: hourly.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/anomalies', async (req, res) => {
  try {
    const { familyId } = req.params;
    const status = req.query.status ? String(req.query.status) : null;
    const limit = clampLimit(req.query.limit, 50);
    const params = [familyId];
    let where = 'WHERE family_id = $1';
    if (status && status !== 'all') {
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

    return res.json({ anomalies: out.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/ack', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : null;
    const actor = opsActor(req);
    const anomaly = await updateAnomalyStatus({
      familyId,
      anomalyType,
      status: 'acknowledged',
      note,
      actor,
    });

    if (!anomaly) {
      return res.status(404).json({ error: 'anomaly_not_found' });
    }

    return res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/close', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : null;
    const actor = opsActor(req);
    const anomaly = await updateAnomalyStatus({ familyId, anomalyType, status: 'closed', note, actor });
    if (!anomaly) return res.status(404).json({ error: 'anomaly_not_found' });
    return res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/anomalies/:anomalyType/reopen', async (req, res) => {
  try {
    const { familyId, anomalyType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : null;
    const actor = opsActor(req);
    const anomaly = await updateAnomalyStatus({ familyId, anomalyType, status: 'open', note, actor });
    if (!anomaly) return res.status(404).json({ error: 'anomaly_not_found' });
    return res.json({ anomaly });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/alerts', async (req, res) => {
  try {
    const { familyId } = req.params;
    const limit = clampLimit(req.query.limit, 50);

    // Raw deliveries (newest first) for timeline/debug.
    const deliveries = await query(
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

    // Aggregated view for the table.
    const alerts = await query(
      `
      SELECT
        e.id AS endpoint_id,
        e.type AS endpoint_type,
        e.target AS endpoint_target,
        MAX(d.created_at) AS last_delivered_at,
        COUNT(*)::int AS count,
        (ARRAY_AGG(d.status ORDER BY d.created_at DESC))[1] AS status,
        (ARRAY_AGG(d.severity ORDER BY d.created_at DESC))[1] AS severity
      FROM orchestrator_alert_deliveries d
      JOIN orchestrator_alert_endpoints e ON d.endpoint_id = e.id
      WHERE d.family_id = $1
      GROUP BY e.id, e.type, e.target
      ORDER BY MAX(d.created_at) DESC
      LIMIT $2
      `,
      [familyId, limit]
    );

    return res.json({ alerts: alerts.rows || [], deliveries: deliveries.rows || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/mitigations', async (req, res) => {
  try {
    const { familyId } = req.params;
    const out = await query(
      `
      SELECT family_id, mitigation_type, active, activated_at, expires_at, last_updated, count,
             previous_state_json, applied_patch_json, meta
      FROM orchestrator_mitigations
      WHERE family_id = $1
      ORDER BY last_updated DESC NULLS LAST, activated_at DESC NULLS LAST
      `,
      [familyId]
    );

    const mitigations = (out.rows || []).map((r) => {
      const activatedAt = r.activated_at ? new Date(r.activated_at).toISOString() : null;
      const expiresAt = r.expires_at ? new Date(r.expires_at).toISOString() : null;
      const updatedAt = r.last_updated ? new Date(r.last_updated).toISOString() : null;
      return {
        type: r.mitigation_type,
        active: r.active,
        updated_at: updatedAt,
        activated_at: activatedAt,
        expires_at: expiresAt,
        params: {
          ...(r.meta ?? {}),
          count: r.count ?? 0,
          activatedAt,
          expiresAt,
          patch: r.applied_patch_json ?? null,
        },
      };
    });

    return res.json({ mitigations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

const forceClearMitigation = async ({ familyId, mitigationType, note, actor }) => {
  const row = await query(
    `
    SELECT family_id, mitigation_type, active, previous_state_json, meta
    FROM orchestrator_mitigations
    WHERE family_id = $1 AND mitigation_type = $2
    LIMIT 1
    `,
    [familyId, mitigationType]
  );

  if (row.rowCount === 0) {
    return { cleared: false, mitigation: null };
  }

  const current = row.rows[0];
  const previous = current.previous_state_json;

  const state = await orchestratorPgStore.getState(familyId);
  if (state) {
    const next = {
      ...state,
      cooldownUntil: previous?.cooldownUntil ?? null,
      maxNotificationsPerHour: previous?.maxNotificationsPerHour ?? state.maxNotificationsPerHour,
      mitigation: null,
      updatedAt: new Date().toISOString(),
    };
    await orchestratorPgStore.upsertState(next);
  }

  await query(
    `
    UPDATE orchestrator_mitigations
    SET active = false,
        last_updated = now(),
        meta = CASE
          WHEN $3 IS NULL THEN
            jsonb_set(coalesce(meta, '{}'::jsonb), '{forcedCleared}', 'true'::jsonb, true)
          ELSE
            jsonb_set(
              jsonb_set(coalesce(meta, '{}'::jsonb), '{forcedCleared}', 'true'::jsonb, true),
              '{forcedClearedNote}',
              to_jsonb($3::text),
              true
            )
          END
    WHERE family_id = $1 AND mitigation_type = $2
    `,
    [familyId, mitigationType, note ?? null]
  );

  await auditEventBare({
    eventType: 'ops_mitigation_force_clear',
    severity: 'warn',
    familyId,
    statusCode: 200,
    meta: { mitigationType, actor, note: note ?? null },
  });

  const updated = await query(
    `
    SELECT family_id, mitigation_type, active, activated_at, expires_at, last_updated, count,
           previous_state_json, applied_patch_json, meta
    FROM orchestrator_mitigations
    WHERE family_id = $1 AND mitigation_type = $2
    LIMIT 1
    `,
    [familyId, mitigationType]
  );

  return { cleared: true, mitigation: updated.rows?.[0] ?? null };
};

router.post('/families/:familyId/mitigations/:mitigationType/clear', async (req, res) => {
  try {
    const { familyId, mitigationType } = req.params;
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : null;
    const actor = opsActor(req);
    const { cleared, mitigation } = await forceClearMitigation({ familyId, mitigationType, note, actor });

    // Return the same shape as list for UI convenience.
    if (!mitigation) return res.json({ cleared, mitigation: null, mitigations: [] });
    const activatedAt = mitigation.activated_at ? new Date(mitigation.activated_at).toISOString() : null;
    const expiresAt = mitigation.expires_at ? new Date(mitigation.expires_at).toISOString() : null;
    const updatedAt = mitigation.last_updated ? new Date(mitigation.last_updated).toISOString() : null;
    const shaped = {
      type: mitigation.mitigation_type,
      active: mitigation.active,
      updated_at: updatedAt,
      activated_at: activatedAt,
      expires_at: expiresAt,
      params: {
        ...(mitigation.meta ?? {}),
        count: mitigation.count ?? 0,
        activatedAt,
        expiresAt,
        patch: mitigation.applied_patch_json ?? null,
      },
    };

    return res.json({ cleared, mitigation: shaped, mitigations: [shaped] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

// Backwards-compatible aliases (older ops UI variants)
router.get('/families/:familyId/mitigation', async (req, res) => {
  try {
    const { familyId } = req.params;
    const mitigationType =
      typeof req.query.type === 'string'
        ? req.query.type
        : typeof req.params.type === 'string'
          ? req.params.type
          : null;

    if (!mitigationType) {
      return res.status(400).json({ error: 'mitigation_type_required' });
    }

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
      [familyId, mitigationType]
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

    return res.json({ mitigation });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.post('/families/:familyId/mitigation/clear', async (req, res) => {
  try {
    const { familyId } = req.params;
    // Default mitigation clear targets duplicate_storm for legacy callers.
    const mitigationType =
      typeof req.body?.mitigationType === 'string' ? req.body.mitigationType : 'duplicate_storm';
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 2000) : null;
    const actor = opsActor(req);
    const result = await forceClearMitigation({ familyId, mitigationType, note, actor });
    return res.json({ ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

router.get('/families/:familyId/timeline', async (req, res) => {
  try {
    const { familyId } = req.params;
    const hours = clampHours(req.query.hours, 48);
    const sinceTs = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const hourly = await query(
      `
      SELECT *
      FROM orchestrator_hourly_snapshots
      WHERE family_id = $1
        AND hour >= (now() - ($2::int * interval '1 hour'))
      ORDER BY hour ASC
      `,
      [familyId, hours]
    );

    const anomalies = await query(
      `
      SELECT *
      FROM orchestrator_anomalies
      WHERE family_id = $1
        AND (first_seen >= (now() - ($2::int * interval '1 hour'))
             OR last_seen >= (now() - ($2::int * interval '1 hour')))
      ORDER BY last_seen DESC
      `,
      [familyId, hours]
    );

    const anomalyActions = await query(
      `
      SELECT *
      FROM orchestrator_anomaly_actions
      WHERE family_id = $1
        AND created_at >= (now() - ($2::int * interval '1 hour'))
      ORDER BY created_at ASC
      `,
      [familyId, hours]
    );

    const deliveries = await query(
      `
      SELECT d.*, e.type AS endpoint_type, e.target AS endpoint_target
      FROM orchestrator_alert_deliveries d
      LEFT JOIN orchestrator_alert_endpoints e ON d.endpoint_id = e.id
      WHERE d.family_id = $1
        AND d.created_at >= (now() - ($2::int * interval '1 hour'))
      ORDER BY d.created_at ASC
      `,
      [familyId, hours]
    );

    const mitigations = await query(
      `
      SELECT family_id, mitigation_type, active, activated_at, expires_at, last_updated, count, meta, applied_patch_json
      FROM orchestrator_mitigations
      WHERE family_id = $1
        AND (
          (activated_at IS NOT NULL AND activated_at >= (now() - ($2::int * interval '1 hour')))
          OR (last_updated IS NOT NULL AND last_updated >= (now() - ($2::int * interval '1 hour')))
          OR (expires_at IS NOT NULL AND expires_at >= (now() - ($2::int * interval '1 hour')))
        )
      ORDER BY COALESCE(last_updated, activated_at) ASC
      `,
      [familyId, hours]
    );

    const events = [];

    for (const a of anomalies.rows || []) {
      const ts = a.first_seen;
      if (ts) {
        events.push({
          event_type: 'anomaly_observed',
          timestamp: ts,
          anomaly_type: a.anomaly_type,
          severity: a.severity,
          status: a.status ?? 'open',
          note: a.status_note ?? null,
        });
      }
    }

    for (const act of anomalyActions.rows || []) {
      events.push({
        event_type: `anomaly_${act.action}`,
        timestamp: act.created_at,
        anomaly_type: act.anomaly_type,
        action: act.action,
        note: act.note,
        actor: act.actor,
      });
    }

    for (const d of deliveries.rows || []) {
      events.push({
        event_type: 'alert_delivery',
        timestamp: d.created_at,
        anomaly_type: d.anomaly_type,
        severity: d.severity,
        status: d.status,
        endpoint_type: d.endpoint_type,
        endpoint_target: d.endpoint_target,
        response_code: d.response_code,
      });
    }

    for (const m of mitigations.rows || []) {
      const activatedAt = m.activated_at;
      const updatedAt = m.last_updated;
      const expiresAt = m.expires_at;
      const patch = m.applied_patch_json ?? null;
      if (activatedAt) {
        events.push({
          event_type: 'mitigation_applied',
          timestamp: activatedAt,
          mitigation_type: m.mitigation_type,
          status: m.active ? 'active' : 'inactive',
          expires_at: expiresAt,
          params: { ...(m.meta ?? {}), count: m.count ?? 0, patch },
        });
      }
      if (updatedAt && (!activatedAt || updatedAt > activatedAt)) {
        events.push({
          event_type: m.active ? 'mitigation_updated' : 'mitigation_cleared',
          timestamp: updatedAt,
          mitigation_type: m.mitigation_type,
          status: m.active ? 'active' : 'inactive',
          expires_at: expiresAt,
          params: { ...(m.meta ?? {}), count: m.count ?? 0, patch },
        });
      }
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return res.json({
      window: { hours, since: sinceTs },
      hourlyRows: hourly.rows || [],
      anomalies: anomalies.rows || [],
      deliveries: deliveries.rows || [],
      events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
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

    return res.json({ summary: { sent, failed, skipped }, deliveries });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
});

export default router;
